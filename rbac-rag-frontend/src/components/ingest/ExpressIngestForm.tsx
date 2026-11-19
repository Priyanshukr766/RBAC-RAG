import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { AllowedRole } from '../../types/auth';
import { UploadResponse } from '../../types/ingestion';
import { uploadPdfDocument } from '../../api/ingestApi';
import RoleBadge from '../common/RoleBadge';
import { ALL_ASSIGNABLE_ROLES, getRoleMeta } from '../../utils/roleUtils';
import { clsx } from 'clsx';

interface ExpressIngestFormProps {
  file: File;
  onBack: () => void;
  onSuccess?: (result: UploadResponse) => void;
}

export const ExpressIngestForm: React.FC<ExpressIngestFormProps> = ({
  file,
  onBack,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [selectedRoles, setSelectedRoles] = useState<AllowedRole[]>(['engineering']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentStageText, setCurrentStageText] = useState<string>('');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleRole = (role: AllowedRole) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length === 1) return; // Keep at least one
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      setErrorMessage('Please assign at least one security role.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setCurrentStageText('1/3: Parsing layout and text with Docling parser...');

    try {
      // Staged progress indicators for demo visibility
      const stageTimer1 = setTimeout(() => {
        setCurrentStageText('2/3: Slicing text into 300-word overlapping chunks...');
      }, 1200);

      const stageTimer2 = setTimeout(() => {
        setCurrentStageText('3/3: Embedding vectors & indexing documents...');
      }, 2400);

      const uploadResult = await uploadPdfDocument(
        file,
        'express_single_role',
        selectedRoles
      );

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      setResult(uploadResult);
      if (onSuccess) {
        onSuccess(uploadResult);
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || 'Ingestion failed. Please check backend connection.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Strategy Fork</span>
        </button>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-zinc-100 border border-zinc-200 text-zinc-700">
          <span>Path A: Express Single-Role</span>
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Selected File Banner */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-950">{file.name}</div>
            <div className="text-xs text-zinc-500 font-mono">
              {(file.size / 1024).toFixed(1)} KB • Target: Vector Index
            </div>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-zinc-700">
            PDF Document
          </span>
        </div>

        {/* Success View */}
        {result ? (
          <div className="space-y-6 py-4 animate-fade-in text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-normal tracking-tight text-zinc-950">
                Document Ingested & Published!
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                The document has been chunked, embedded, and indexed with role-based access.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[11px] font-mono uppercase text-zinc-500 block">Status</span>
                <span className="text-sm font-semibold text-zinc-900 capitalize">{result.status}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[11px] font-mono uppercase text-zinc-500 block">Chunks Created</span>
                <span className="text-sm font-semibold text-zinc-900 tabular-nums">{result.chunks_created ?? 'N/A'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[11px] font-mono uppercase text-zinc-500 block">Mode</span>
                <span className="text-sm font-semibold text-zinc-900">Express</span>
              </div>
            </div>

            {/* Roles Assigned Summary */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-on-surface-variant block mb-2">
                Authorized Access Roles:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {selectedRoles.map((r) => (
                  <RoleBadge key={r} role={r} size="sm" variant="solid" />
                ))}
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-surface-container-high">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  onBack();
                }}
                className="btn-secondary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ingest Another Document</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="btn-primary w-full sm:w-auto text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Test Query in Employee Chat</span>
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Assign Allowed Roles for Entire Document
                </label>
                <span className="text-xs text-on-surface-variant">
                  Select one or more roles
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">
                Access policies ensure only users holding these roles can retrieve chunks from this file.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_ASSIGNABLE_ROLES.map((role) => {
                  const isChecked = selectedRoles.includes(role);
                  const meta = getRoleMeta(role);

                  return (
                    <div
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={clsx(
                        'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none',
                        isChecked
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-surface-container-high hover:border-surface-container-highest bg-white'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="mt-0.5 rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-on-surface">
                            {meta.label}
                          </span>
                          <RoleBadge role={role} size="xs" variant={isChecked ? 'solid' : 'subtle'} />
                        </div>
                        <p className="text-[11px] text-on-surface-variant line-clamp-2">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Ingestion Trigger Button / Progress */}
            {isSubmitting ? (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Processing Ingestion Pipeline...</span>
                  </span>
                  <span className="font-mono">FastAPI</span>
                </div>
                <div className="text-xs text-on-surface-variant font-mono animate-pulse">
                  {currentStageText}
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full animate-[shimmer_1.5s_infinite] w-2/3" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Immediate Stage-2 Chunking & Vector Publishing</span>
                </span>

                <button
                  type="submit"
                  disabled={selectedRoles.length === 0}
                  className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
                >
                  <span>Ingest Document Now</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ExpressIngestForm;

