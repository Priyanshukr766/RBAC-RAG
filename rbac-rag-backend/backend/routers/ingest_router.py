import os
import uuid
import json

from typing import Literal, Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.config import get_settings

from backend.db.session import get_admin_cursor

from backend.auth.dependencies import require_admin, get_current_user
from backend.auth.jwt_handler import decode_jwt_token
from backend.auth.live_role_guard import get_live_user_state

from backend.models.auth_schemas import AuthenticatedUser, AllowedRole
from backend.models.ingestion_schemas import ChunkRecord

from backend.ingestion.pdf_express_parser import parse_pdf_express
from backend.ingestion.pdf_structural_parser import extract_logical_blocks_from_pdf
from backend.ingestion.auto_tagger import auto_tag_logical_blocks
from backend.ingestion.pdf_box_painter import paint_annotated_pdf

from backend.ingestion.stage2_chunker import (
    split_text_into_word_chunks,
    create_chunks_from_approved_blocks,
)

from backend.ingestion.chunk_writer import embed_and_store_chunks
from backend.ingestion.excel_row_splitter import split_excel_into_role_chunks


from backend.ingestion.staging_store import (
    get_logical_blocks_for_doc,
    save_logical_blocks,
    update_logical_block_roles,
)

router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion & HITL Review"])
oauth2_optional_scheme = HTTPBearer(auto_error=False)

VALID_ROLES = {"admin", "hr", "finance", "engineering", "intern", "all_employees"}


def _parse_express_roles(express_roles_str: Optional[str]) -> List[AllowedRole]:
    """Parses comma-separated role strings into a validated list of AllowedRole."""
    if not express_roles_str:
        return ["all_employees"]
    roles = [
        r.strip().lower()
        for r in express_roles_str.split(",")
        if r.strip().lower() in VALID_ROLES
    ]
    return roles if roles else ["all_employees"]  # type: ignore


@router.post("/upload")
async def upload_pdf_document(
    file: UploadFile = File(...),
    upload_mode: Literal["express_single_role", "hitl_mixed_visual"] = Form(...),
    express_roles: Optional[str] = Form(None),
    admin_user: AuthenticatedUser = Depends(require_admin),
):
    """
    Unified PDF upload endpoint supporting:
      - Path A ('express_single_role'): Fast single-department extraction & immediate publishing.
      - Path B ('hitl_mixed_visual'): Structural block extraction, AI/PII auto-tagging, staging, and colored PDF preview.
    """
    settings = get_settings()
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Only .pdf files are supported on /upload."
        )

    doc_uuid = str(uuid.uuid4())
    os.makedirs(settings.RAW_UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.ANNOTATED_PDF_DIR, exist_ok=True)

    safe_filename = os.path.basename(filename)
    raw_file_path = os.path.join(settings.RAW_UPLOAD_DIR, f"{doc_uuid}_{safe_filename}")

    file_bytes = await file.read()
    with open(raw_file_path, "wb") as f:
        f.write(file_bytes)

    # Insert parent document record (resolving uploaded_by safely against users table)
    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (doc_id, filename, file_type, upload_mode, status, raw_file_path, uploaded_by)
            VALUES (
                %s, %s, 'pdf', %s, 'pending_review', %s,
                (SELECT user_id FROM users WHERE user_id = %s)
            )
            RETURNING doc_id::text;
            """,
            (doc_uuid, safe_filename, upload_mode, raw_file_path, admin_user.user_id),
        )
        row = cur.fetchone()
        doc_id = row["doc_id"] if isinstance(row, dict) else row[0]

    # Path A: Express Single-Role Upload
    if upload_mode == "express_single_role":
        target_roles = _parse_express_roles(express_roles)
        pages = parse_pdf_express(raw_file_path)

        chunks: List[ChunkRecord] = []
        chunk_idx = 0
        for p in pages:
            page_no = int(p.get("page_number", 1))
            page_text = p.get("text", "")
            sub_texts = split_text_into_word_chunks(
                page_text, target_words=300, overlap_words=50
            )
            for st in sub_texts:
                heading = f"Page {page_no}"
                chunks.append(
                    ChunkRecord(
                        doc_id=doc_id,
                        parent_block_id=None,
                        chunk_index=chunk_idx,
                        content=f"[Section: {heading}] {st}",
                        allowed_roles=target_roles,
                        page_number=page_no,
                        bbox=None,
                        section_heading=heading,
                    )
                )
                chunk_idx += 1

        chunks_created = embed_and_store_chunks(doc_id, chunks)
        return {
            "doc_id": doc_id,
            "filename": safe_filename,
            "upload_mode": upload_mode,
            "status": "published",
            "chunks_created": chunks_created,
        }

    # Path B: Mixed-Sensitivity Visual HITL Upload
    draft_blocks = extract_logical_blocks_from_pdf(raw_file_path)
    tagged_blocks = auto_tag_logical_blocks(draft_blocks)
    saved_blocks = save_logical_blocks(doc_id, tagged_blocks)

    annotated_pdf_path = os.path.join(
        settings.ANNOTATED_PDF_DIR, f"{doc_id}_annotated.pdf"
    )
    paint_annotated_pdf(raw_file_path, annotated_pdf_path, saved_blocks)

    # Keep status as 'pending_review' while storing annotated_pdf_path for immediate UI preview
    with get_admin_cursor() as cur:
        cur.execute(
            """
            UPDATE documents
            SET status = 'pending_review',
                annotated_pdf_path = %s
            WHERE doc_id = %s;
            """,
            (annotated_pdf_path, doc_id),
        )

    blocks_needing_review = sum(1 for b in saved_blocks if b.get("needs_human_review"))
    return {
        "doc_id": doc_id,
        "filename": safe_filename,
        "upload_mode": upload_mode,
        "status": "pending_review",
        "total_blocks": len(saved_blocks),
        "blocks_needing_review": blocks_needing_review,
        "annotated_pdf_url": f"/api/v1/ingest/documents/{doc_id}/annotated-pdf",
        "blocks": saved_blocks,
    }


@router.get("/documents")
def list_documents(admin_user: AuthenticatedUser = Depends(require_admin)):
    """Lists all uploaded documents ordered by newest first for the Admin dashboard."""
    with get_admin_cursor() as cur:
        cur.execute("""
            SELECT doc_id::text, filename, file_type, upload_mode, status,
                   annotated_pdf_path, created_at, raw_file_path
            FROM documents
            ORDER BY created_at DESC;
            """)
        rows = cur.fetchall()
        docs = []
        for r in rows:
            if isinstance(r, dict):
                doc_id = str(r["doc_id"])
                has_pdf = bool(r["annotated_pdf_path"] or (r.get("raw_file_path") and str(r["filename"]).lower().endswith(".pdf")))
                docs.append(
                    {
                        "doc_id": doc_id,
                        "filename": r["filename"],
                        "file_type": r["file_type"],
                        "upload_mode": r["upload_mode"],
                        "status": r["status"],
                        "annotated_pdf_url": (
                            f"/api/v1/ingest/documents/{doc_id}/annotated-pdf"
                            if has_pdf
                            else None
                        ),
                        "created_at": (
                            r["created_at"].isoformat() if r["created_at"] else None
                        ),
                    }
                )
            else:
                doc_id = str(r[0])
                has_pdf = bool(r[5] or (len(r) > 7 and r[7] and str(r[1]).lower().endswith(".pdf")))
                docs.append(
                    {
                        "doc_id": doc_id,
                        "filename": r[1],
                        "file_type": r[2],
                        "upload_mode": r[3],
                        "status": r[4],
                        "annotated_pdf_url": (
                            f"/api/v1/ingest/documents/{doc_id}/annotated-pdf"
                            if has_pdf
                            else None
                        ),
                        "created_at": r[6].isoformat() if r[6] else None,
                    }
                )
        return {"documents": docs}


@router.get("/documents/{doc_id}/blocks")
def get_document_blocks(
    doc_id: str,
    admin_user: AuthenticatedUser = Depends(require_admin),
):
    """
    Returns document metadata and all staged logical_blocks ordered by block_order ASC
    for the React Admin Review Inbox.
    """
    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT doc_id::text, filename, file_type, upload_mode, status, annotated_pdf_path
            FROM documents
            WHERE doc_id = %s;
            """,
            (doc_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    if isinstance(row, dict):
        filename = row["filename"]
        file_type = row["file_type"]
        upload_mode = row["upload_mode"]
        status = row["status"]
        has_annotated = bool(row["annotated_pdf_path"])
    else:
        filename = row[1]
        file_type = row[2]
        upload_mode = row[3]
        status = row[4]
        has_annotated = bool(row[5])

    blocks = get_logical_blocks_for_doc(doc_id)
    blocks_needing_review = sum(1 for b in blocks if b.get("needs_human_review"))

    return {
        "doc_id": doc_id,
        "filename": filename,
        "file_type": file_type,
        "upload_mode": upload_mode,
        "status": status,
        "total_blocks": len(blocks),
        "blocks_needing_review": blocks_needing_review,
        "annotated_pdf_url": (
            f"/api/v1/ingest/documents/{doc_id}/annotated-pdf"
            if has_annotated
            else None
        ),
        "blocks": blocks,
    }


class BlockRoleUpdateItem(BaseModel):
    block_id: str
    approved_roles: List[AllowedRole]


class BlockRoleUpdateRequest(BaseModel):
    updates: List[BlockRoleUpdateItem]


@router.put("/documents/{doc_id}/blocks")
def update_document_blocks_and_repaint(
    doc_id: str,
    payload: BlockRoleUpdateRequest,
    admin_user: AuthenticatedUser = Depends(require_admin),
):
    """
    Updates approved_roles for the specified logical blocks and immediately re-paints
    the colored bounding boxes and role badges on the annotated PDF preview.
    """
    settings = get_settings()

    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT raw_file_path, annotated_pdf_path
            FROM documents
            WHERE doc_id = %s;
            """,
            (doc_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    if isinstance(row, dict):
        raw_file_path = row["raw_file_path"]
        annotated_pdf_path = row["annotated_pdf_path"]
    else:
        raw_file_path = row[0]
        annotated_pdf_path = row[1]

    if not annotated_pdf_path:
        os.makedirs(settings.ANNOTATED_PDF_DIR, exist_ok=True)
        annotated_pdf_path = os.path.join(settings.ANNOTATED_PDF_DIR, f"{doc_id}_annotated.pdf")

    updates_dicts = [
        {"block_id": item.block_id, "approved_roles": list(item.approved_roles)}
        for item in payload.updates
    ]
    
    updated_blocks = update_logical_block_roles(doc_id, updates_dicts)

    if os.path.exists(raw_file_path):
        paint_annotated_pdf(raw_file_path, annotated_pdf_path, updated_blocks)

    blocks_needing_review = sum(1 for b in updated_blocks if b.get("needs_human_review"))

    return {
        "doc_id": doc_id,
        "status": "preview_painted",
        "annotated_pdf_url": f"/api/v1/ingest/documents/{doc_id}/annotated-pdf",
        "blocks_needing_review": blocks_needing_review,
        "blocks": updated_blocks,
    }
    
    
@router.get("/documents/{doc_id}/annotated-pdf")
def stream_annotated_pdf(
    doc_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Streams the colored bounding-box annotated PDF file so the React Admin Review Inbox
    (or PDF citation viewer) can render it inside an <iframe> or PDF.js canvas.
    """

    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT filename, annotated_pdf_path, raw_file_path
            FROM documents
            WHERE doc_id = %s;
            """,
            (doc_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    if isinstance(row, dict):
        filename = row["filename"]
        annotated_pdf_path = row["annotated_pdf_path"]
        raw_file_path = row["raw_file_path"]
    else:
        filename = row[0]
        annotated_pdf_path = row[1]
        raw_file_path = row[2]

    # If annotated_pdf_path is missing on disk, regenerate it from staged blocks if possible
    if not annotated_pdf_path or not os.path.exists(annotated_pdf_path):
        settings = get_settings()
        os.makedirs(settings.ANNOTATED_PDF_DIR, exist_ok=True)
        annotated_pdf_path = os.path.join(settings.ANNOTATED_PDF_DIR, f"{doc_id}_annotated.pdf")
        blocks = get_logical_blocks_for_doc(doc_id)
        if raw_file_path and os.path.exists(raw_file_path) and blocks:
            paint_annotated_pdf(raw_file_path, annotated_pdf_path, blocks)
        elif raw_file_path and os.path.exists(raw_file_path):
            annotated_pdf_path = raw_file_path
        else:
            raise HTTPException(status_code=404, detail="Annotated PDF file not found on disk.")

    return FileResponse(
        path=annotated_pdf_path,
        media_type="application/pdf",
        filename=f"annotated_{filename}",
        content_disposition_type="inline",
        headers={
            "Content-Disposition": f'inline; filename="annotated_{filename}"',
        },
    )
    
    
@router.post("/documents/{doc_id}/publish")
def publish_reviewed_document(
    doc_id: str,
    admin_user: AuthenticatedUser = Depends(require_admin),
):
    """
    Finalizes Human-in-the-Loop review: slices approved logical_blocks into ~300-word
    Stage-2 chunks inheriting approved_roles and bbox coordinates, embeds them in batch,
    writes them to document_chunks, and sets document status = 'published'.
    """
    with get_admin_cursor() as cur:
        cur.execute(
            "SELECT doc_id::text, filename FROM documents WHERE doc_id = %s;",
            (doc_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    blocks = get_logical_blocks_for_doc(doc_id)
    if not blocks:
        raise HTTPException(
            status_code=400,
            detail=f"No staged logical blocks found for document {doc_id}.",
        )

    # Mark all blocks as reviewed upon publish
    with get_admin_cursor() as cur:
        cur.execute(
            "UPDATE logical_blocks SET needs_human_review = FALSE WHERE doc_id = %s;",
            (doc_id,),
        )

    chunks = create_chunks_from_approved_blocks(doc_id, blocks, target_words=300, overlap_words=50)
    chunks_created = embed_and_store_chunks(doc_id, chunks)

    return {
        "doc_id": doc_id,
        "status": "published",
        "chunks_created": chunks_created,
    }


@router.post("/upload-excel")
async def upload_excel_document(
    file: UploadFile = File(...),
    anchor_columns: str = Form(...),
    public_columns: str = Form(...),
    public_roles: str = Form('["all_employees"]'),
    restricted_column_map: str = Form(...),
    admin_user: AuthenticatedUser = Depends(require_admin),
):
    """
    Path C: Uploads an .xlsx spreadsheet, splits each row into public vs. restricted role
    chunks (preserving anchor columns on both), embeds them, and publishes to document_chunks.
    Form fields anchor_columns, public_columns, public_roles, and restricted_column_map
    accept JSON strings (or comma-separated strings for column/role lists).
    """
    settings = get_settings()
    filename = file.filename or "uploaded_sheet.xlsx"
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported on /upload-excel.")

    def _parse_str_list(raw: str) -> List[str]:
        raw = raw.strip()
        if raw.startswith("["):
            return [str(x).strip() for x in json.loads(raw)]
        return [x.strip() for x in raw.split(",") if x.strip()]

    try:
        anchor_cols = _parse_str_list(anchor_columns)
        pub_cols = _parse_str_list(public_columns)
        pub_roles: List[AllowedRole] = _parse_str_list(public_roles)  # type: ignore
        restricted_map = json.loads(restricted_column_map)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid column JSON configuration: {exc}")

    doc_uuid = str(uuid.uuid4())
    os.makedirs(settings.RAW_UPLOAD_DIR, exist_ok=True)
    safe_filename = os.path.basename(filename)
    raw_file_path = os.path.join(settings.RAW_UPLOAD_DIR, f"{doc_uuid}_{safe_filename}")

    file_bytes = await file.read()
    with open(raw_file_path, "wb") as f:
        f.write(file_bytes)

    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (doc_id, filename, file_type, upload_mode, status, raw_file_path, uploaded_by)
            VALUES (
                %s, %s, 'xlsx', 'excel_column_split', 'pending_review', %s,
                (SELECT user_id FROM users WHERE user_id = %s)
            )
            RETURNING doc_id::text;
            """,
            (doc_uuid, safe_filename, raw_file_path, admin_user.user_id),
        )
        row = cur.fetchone()
        doc_id = row["doc_id"] if isinstance(row, dict) else row[0]

    chunks = split_excel_into_role_chunks(
        excel_path=raw_file_path,
        doc_id=doc_id,
        anchor_columns=anchor_cols,
        public_columns=pub_cols,
        public_roles=pub_roles,
        restricted_column_map=restricted_map,
    )
    chunks_created = embed_and_store_chunks(doc_id, chunks)

    return {
        "doc_id": doc_id,
        "filename": safe_filename,
        "upload_mode": "excel_column_split",
        "status": "published",
        "chunks_created": chunks_created,
    }