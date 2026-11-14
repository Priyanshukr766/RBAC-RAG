import { apiClient } from './axiosClient';
import { AuditLogEntry, AuditLogResponse, ChatQueryResponse } from '../types/chat';

export async function sendChatQuery(
  query: string,
  overrideToken?: string,
  mode: string = 'hybrid_rerank',
  topK: number = 5
): Promise<ChatQueryResponse> {
  const headers: Record<string, string> = {};
  if (overrideToken) {
    headers.Authorization = `Bearer ${overrideToken}`;
  }

  const response = await apiClient.post<ChatQueryResponse>(
    '/api/v1/chat/query',
    {
      query,
      mode,
      top_k: topK,
    },
    { headers }
  );

  // Normalize effective_role from backend's role_used if needed
  const data = response.data;
  if (!data.effective_role && data.role_used) {
    data.effective_role = data.role_used;
  }
  return data;
}

export async function fetchAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const response = await apiClient.get<AuditLogResponse>(
    '/api/v1/chat/admin/audit-logs',
    {
      params: { limit },
    }
  );
  return response.data?.logs || [];
}

