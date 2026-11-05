from typing import List, Dict
import pandas as pd
from backend.models.auth_schemas import AllowedRole
from backend.models.ingestion_schemas import ChunkRecord

"""
anchor_columns	        Columns used to identify/contextualize the row's information
public_columns	        Columns whose data goes into the public chunk, Which Excel columns contain information that should go into the general/public chunk?
public_roles	        Roles allowed to access the public chunk, Which roles are allowed to read the public chunk?
restricted_column_map	Defines which roles can access each restricted column, Which columns identify the particular record and provide context about whose information we are talking about?
"""


def split_excel_into_role_chunks(
    excel_path: str,
    doc_id: str,
    anchor_columns: List[str],
    public_columns: List[str],
    public_roles: List[AllowedRole],
    restricted_column_map: Dict[str, List[AllowedRole]],
) -> List[ChunkRecord]:
    """
    Splits each row of an Excel workbook into:
      1. A public directory chunk (anchor_columns + public_columns) tagged with public_roles.
      2. One or more restricted chunks (anchor_columns + grouped restricted columns) tagged with
         their respective restricted roles from restricted_column_map.
    """
    sheets: Dict[str, pd.DataFrame] = pd.read_excel(excel_path, sheet_name=None)
    chunks: List[ChunkRecord] = []
    chunk_index = 0

    for sheet_name, df in sheets.items():
        for row_idx, row in df.iterrows():
            excel_row_num = int(row_idx) + 2  # 1-based header + 1-based index

            # Build the anchor prefix (e.g., "Employee: Neha Sharma | Emp_ID: E101")
            anchor_parts: List[str] = []
            for col in anchor_columns:
                if col in row and pd.notna(row[col]) and str(row[col]).strip() != "":
                    anchor_parts.append(f"{col}: {str(row[col]).strip()}")

            if not anchor_parts:
                continue
            anchor_str = " | ".join(anchor_parts)

            # 1. Build Public / General Directory Chunk
            public_parts: List[str] = []
            for col in public_columns:
                if col in anchor_columns:
                    continue
                if col in row and pd.notna(row[col]) and str(row[col]).strip() != "":
                    public_parts.append(f"{col}: {str(row[col]).strip()}")

            if public_parts or anchor_parts:
                pub_heading = f"Sheet: {sheet_name} (Row {excel_row_num} - General)"
                pub_body = " | ".join([anchor_str] + public_parts) if public_parts else anchor_str
                pub_content = f"[Section: {pub_heading}] {pub_body}"
                chunks.append(
                    ChunkRecord(
                        doc_id=str(doc_id),
                        parent_block_id=None,
                        chunk_index=chunk_index,
                        content=pub_content,
                        allowed_roles=list(public_roles),
                        page_number=1,
                        bbox=None,
                        section_heading=pub_heading,
                    )
                )
                chunk_index += 1

            # 2. Group Restricted Columns by their canonical target role tuple
            role_groups: Dict[tuple, List[str]] = {}
            for r_col, target_roles in restricted_column_map.items():
                if r_col in row and pd.notna(row[r_col]) and str(row[r_col]).strip() != "":
                    role_key = tuple(sorted(set(target_roles)))
                    role_groups.setdefault(role_key, []).append(
                        f"{r_col}: {str(row[r_col]).strip()}"
                    )

            for role_key, col_kv_list in role_groups.items():
                conf_heading = f"Sheet: {sheet_name} (Row {excel_row_num} - Confidential)"
                conf_body = " | ".join([anchor_str] + col_kv_list)
                conf_content = f"[Section: {conf_heading}] {conf_body}"
                chunks.append(
                    ChunkRecord(
                        doc_id=str(doc_id),
                        parent_block_id=None,
                        chunk_index=chunk_index,
                        content=conf_content,
                        allowed_roles=list(role_key),  # type: ignore
                        page_number=1,
                        bbox=None,
                        section_heading=conf_heading,
                    )
                )
                chunk_index += 1

    return chunks

