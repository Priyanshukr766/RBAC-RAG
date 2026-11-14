import { AllowedRole } from "./auth";

export type GuardrailStatus =
  | "passed"
  | "blocked_injection"
  | "blocked_out_of_scope";

export interface CitationItem {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page_number: number | null;
  bbox: [number, number, number, number] | null;
  section_heading: string | null;
  snippet: string;
  annotated_pdf_url: string;
}

export interface ChatQueryResponse {
  answer: string;
  role_used?: AllowedRole;
  effective_role?: AllowedRole;
  guardrail_status: GuardrailStatus;
  guardrail_reason?: string | null;
  cache_hit: boolean;
  latency_ms: number;
  citations: CitationItem[];
  retrieved_chunk_ids?: string[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  roleAtQuery: AllowedRole;
  responseMeta?: Omit<ChatQueryResponse, "answer">;
}

export interface AuditLogEntry {
  log_id: number;
  user_id: number | null;
  user_email?: string | null;
  user_full_name?: string | null;
  email?: string;
  user_role_at_query: AllowedRole;
  query_text: string;
  guardrail_status: GuardrailStatus | string;
  cache_hit: boolean;
  retrieved_chunk_ids: string[];
  latency_ms: number;
  created_at: string;
}

export interface AuditLogResponse {
  total: number;
  logs: AuditLogEntry[];
}

