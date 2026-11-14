import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Download,
  MessageSquare,
  X,
  Database,
} from 'lucide-react';
import { publishApprovedDocument, getAnnotatedPdfFullUrl } from '../../api/ingestApi';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  docId: string;
  totalBlocks: number;
  onClose: () => void;
  onPublishSuccess?: (result: { doc_id: string; status: string; chunks_created: number }) => void;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  docId,
  totalBlocks,
  onClose,
  onPublishSuccess,
}) => {
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{
    doc_id: string;
    status: string;
    chunks_created: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    try {
      const result = await publishApprovedDocument(docId);
      setPublishResult(result);
      if (onPublishSuccess) {
        onPublishSuccess(result);
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'Publishing failed. Please check backend connection.';
      setErrorMessage(detail);
    } finally {
      setIsPublishing(false);
    }
  };

  const fullPdfUrl = getAnnotatedPdfFullUrl(docId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-xl border border-surface-container-high shadow-level-3 max-w-lg w-full p-6 sm:p-8 space-y-6 relative">
        {/* Close Icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!publishResult ? (
          /* Pre-Publish Confirmation Screen */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-on-surface">
                  Publish Document
                </h3>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                  Document ID: {docId.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
              <p>
                You are about to finalize Human-in-the-Loop review for{' '}
                <strong className="text-on-surface">{totalBlocks} logical blocks</strong>.
              </p>
              <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-surface-container-high space-y-2">
                <div className="flex items-center gap-2 text-on-surface font-semibold text-xs">
                  <Database className="w-4 h-4 text-primary" />
                  <span>Automated Stage-2 Pipeline Operations:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-on-surface-variant font-mono text-[11px]">
                  <li>Recursive 300-word chunking inheriting approved role tags.</li>
                  <li>Dense vector embedding generation.</li>
                  <li>Database vector insertion with role-based access control.</li>
                  <li>Permanent annotated audit-trail PDF archived in storage.</li>
                </ul>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button
                type="button"
                onClick={onClose}
                disabled={isPublishing}
                className="btn-secondary text-xs px-4 py-2"
              >
                Continue Reviewing
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={handleConfirmPublish}
                className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing Vectors...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Publish Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Post-Publish Celebratory Screen */
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                Published Successfully!
              </h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                The document is live in PostgreSQL with full Row-Level Security active.
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
              <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[10px] uppercase font-mono text-on-surface-variant block">Blocks Approved</span>
                <span className="text-sm font-bold text-on-surface tabular-nums">{totalBlocks}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-lowest border border-surface-container-high">
                <span className="text-[10px] uppercase font-mono text-on-surface-variant block">Chunks Created</span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">{publishResult.chunks_created}</span>
              </div>
            </div>

            {/* Audit Trail PDF Link */}
            <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container-high flex items-center justify-between text-xs text-left">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium text-on-surface">Permanent Audit Trail PDF</span>
              </div>
              <a
                href={fullPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-surface-container-high">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full sm:w-auto text-xs py-2.5"
              >
                Back to Documents
              </button>

              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="btn-primary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Test in Employee Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishConfirmationModal;
