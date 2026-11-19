import { AllowedRole } from "./auth";

export type UploadMode =
  | "express_single_role"
  | "hitl_mixed_visual";

export type DocumentStatus =
  | "pending_review"
  | "preview_painted"
  | "published";

export interface LogicalBlockItem {
  block_id: string;
  doc_id: string;
  block_order: number;
  page_number: number;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1]
  section_heading: string;
  raw_text: string;
  suggested_roles: AllowedRole[];
  approved_roles: AllowedRole[];
  confidence_score: number;
  needs_human_review: boolean;
  pii_triggered: boolean;
}

export interface UploadResponse {
  doc_id: string;
  filename?: string;
  upload_mode?: UploadMode;
  status: DocumentStatus;
  chunks_created?: number;
  total_blocks?: number;
  blocks_needing_review?: number;
  annotated_pdf_url?: string | null;
  blocks?: LogicalBlockItem[];
}

export interface IngestedDocumentSummary {
  doc_id: string;
  filename: string;
  file_type: string;
  upload_mode: UploadMode;
  status: DocumentStatus;
  annotated_pdf_url?: string | null;
  created_at?: string | null;
}

export interface BlockRoleUpdateItem {
  block_id: string;
  approved_roles: AllowedRole[];
}

export interface BlockRoleUpdateRequest {
  updates: BlockRoleUpdateItem[];
}

