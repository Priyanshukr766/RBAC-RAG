import React, { useEffect, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { IngestedDocumentSummary } from '../../types/ingestion';
import { fetchIngestedDocuments, getAnnotatedPdfFullUrl } from '../../api/ingestApi';
import { clsx } from 'clsx';

interface IngestedDocsListProps {
  onSelectDocForReview?: (doc: IngestedDocumentSummary) => void;
  refreshKey?: number;
}

export const IngestedDocsList: React.FC<IngestedDocsListProps> = ({
  onSelectDocForReview,
  refreshKey = 0,
}) => {
  const [docs, setDocs] = useState<IngestedDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchIngestedDocuments();
      setDocs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage('Failed to load document history from FastAPI backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshKey]);

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Published</span>
          </span>
        );
      case 'preview_painted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Preview Painted</span>
          </span>
        );
      case 'pending_review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  const renderModeBadge = (mode: string) => {
    switch (mode) {
      case 'express_single_role':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Express Lane (Path A)
          </span>
        );
      case 'hitl_mixed_visual':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Visual HITL (Path B)
          </span>
        );
      case 'excel_column_split':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Excel Split (Path C)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-container text-on-surface-variant">
            {mode}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 overflow-hidden space-y-0">
      {/* Table Header Strip */}
      <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
        <h3 className="text-base font-bold text-on-surface">
          Ingested Document Library & Audit Trail
        </h3>

        <button
          type="button"
          onClick={loadDocuments}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-container-highest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
          title="Refresh documents list"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5 text-primary', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Loading ingested document catalog...</span>
        </div>
      ) : errorMessage ? (
        <div className="p-8 text-center text-xs text-error">
          <span>{errorMessage}</span>
        </div>
      ) : docs.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mx-auto text-on-surface-variant">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-on-surface">No documents uploaded yet</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Drag and drop a PDF or Excel document above to begin the ingestion, PyMuPDF bounding-box review, or column splitting process.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-surface-container-high text-on-surface-variant font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Ingestion Strategy</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Uploaded At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {docs.map((doc) => {
                const isExcel = doc.filename.toLowerCase().endsWith('.xlsx');
                const isPdf = doc.filename.toLowerCase().endsWith('.pdf');

                return (
                  <tr
                    key={doc.doc_id}
                    className="hover:bg-surface-container-lowest transition-colors duration-150"
                  >
                    {/* Document Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0',
                            isExcel ? 'bg-emerald-600' : 'bg-primary'
                          )}
                        >
                          {isExcel ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-on-surface block truncate max-w-xs" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            ID: {doc.doc_id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-3.5 px-4">{renderModeBadge(doc.upload_mode)}</td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{renderStatusBadge(doc.status)}</td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-on-surface-variant font-mono text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Interactive Review / Inspect Blocks */}
                        {isPdf && onSelectDocForReview && (
                          <button
                            type="button"
                            onClick={() => onSelectDocForReview(doc)}
                            className="btn-secondary text-[11px] px-3 py-1 flex items-center gap-1 shadow-2xs"
                            title="Open interactive bounding-box review checklist & PDF inspector"
                          >
                            <Eye className="w-3 h-3 text-primary" />
                            <span>{doc.upload_mode === 'hitl_mixed_visual' ? 'Review Blocks' : 'Inspect Viewer'}</span>
                          </button>
                        )}

                        {/* View Full PDF / Audit Trail */}
                        {isPdf && (
                          <a
                            href={getAnnotatedPdfFullUrl(doc.doc_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
                            title="Inspect colored bounding-box audit trail PDF in new browser tab"
                          >
                            <ExternalLink className="w-3 h-3 text-primary" />
                            <span>View PDF</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IngestedDocsList;
