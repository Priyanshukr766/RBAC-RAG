import { apiClient, getStoredToken } from './axiosClient';
import { AllowedRole } from '../types/auth';
import {
  BlockRoleUpdateItem,
  ExcelSplitConfig,
  IngestedDocumentSummary,
  LogicalBlockItem,
  UploadResponse,
} from '../types/ingestion';

export async function uploadPdfDocument(
  file: File,
  uploadMode: 'express_single_role' | 'hitl_mixed_visual',
  expressRoles?: AllowedRole[]
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_mode', uploadMode);
  if (expressRoles && expressRoles.length > 0) {
    formData.append('express_roles', expressRoles.join(','));
  }

  const response = await apiClient.post<UploadResponse>(
    '/api/v1/ingest/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function fetchDocumentBlocks(docId: string): Promise<{
  doc_id: string;
  filename: string;
  file_type?: string;
  upload_mode?: string;
  status: string;
  total_blocks: number;
  blocks_needing_review: number;
  annotated_pdf_url?: string | null;
  blocks: LogicalBlockItem[];
}> {
  const response = await apiClient.get(`/api/v1/ingest/documents/${docId}/blocks`);
  return response.data;
}

export async function updateDocumentBlocksAndRepaint(
  docId: string,
  updates: BlockRoleUpdateItem[]
): Promise<{
  doc_id: string;
  status: string;
  annotated_pdf_url: string;
  blocks_needing_review: number;
  blocks: LogicalBlockItem[];
}> {
  const response = await apiClient.put(
    `/api/v1/ingest/documents/${docId}/blocks`,
    {
      updates,
    }
  );
  return response.data;
}

export async function publishApprovedDocument(
  docId: string
): Promise<{ doc_id: string; status: string; chunks_created: number }> {
  const response = await apiClient.post(
    `/api/v1/ingest/documents/${docId}/publish`
  );
  return response.data;
}

export async function uploadExcelWithSplitConfig(
  file: File,
  config: ExcelSplitConfig
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('anchor_columns', JSON.stringify(config.anchor_columns));
  formData.append('public_columns', JSON.stringify(config.public_columns));
  formData.append('public_roles', JSON.stringify(config.public_roles));
  formData.append('restricted_column_map', JSON.stringify(config.restricted_column_map));

  const response = await apiClient.post<UploadResponse>(
    '/api/v1/ingest/upload-excel',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function fetchIngestedDocuments(): Promise<IngestedDocumentSummary[]> {
  const response = await apiClient.get<any>(
    '/api/v1/ingest/documents'
  );
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.documents)) {
    return response.data.documents;
  }
  return [];
}

export function getAnnotatedPdfFullUrl(docId: string, cacheBustTimestamp?: number): string {
  const ts = cacheBustTimestamp || Date.now();
  const token = getStoredToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  // Use relative path for same-origin proxy to ensure Chrome PDF viewer renders inside iframe
  return `/api/v1/ingest/documents/${docId}/annotated-pdf?t=${ts}${tokenParam}`;
}

export async function fetchAnnotatedPdfBlob(docId: string): Promise<string> {
  const response = await apiClient.get<Blob>(
    `/api/v1/ingest/documents/${docId}/annotated-pdf`,
    { responseType: 'blob' }
  );
  const blob = new Blob([response.data], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

