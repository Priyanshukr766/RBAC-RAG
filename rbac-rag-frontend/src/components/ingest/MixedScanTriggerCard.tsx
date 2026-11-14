import React, { useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { UploadResponse } from '../../types/ingestion';
import { uploadPdfDocument } from '../../api/ingestApi';
import { clsx } from 'clsx';

interface MixedScanTriggerCardProps {
  file: File;
  onBack: () => void;
  onScanComplete: (response: UploadResponse) => void;
}

export const MixedScanTriggerCard: React.FC<MixedScanTriggerCardProps> = ({
  file,
  onBack,
  onScanComplete,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stages = [
    {
      id: 1,
      title: 'Structural Layout Parsing',
      desc: 'Docling parses headings, tables, paragraphs, and exact [x0, y0, x1, y1] bounding boxes.',
    },
    {
      id: 2,
      title: 'AI Classification & Regex PII Detection',
      desc: 'Tags HR, Finance, Engineering, and Public sensitivity with confidence scores.',
    },
    {
      id: 3,
      title: 'PyMuPDF Bounding-Box Painting',
      desc: 'Generates colored visual security overlay: Red (HR), Purple (Fin), Blue (Eng), Green (Pub).',
    },
  ];

  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setActiveStage(1);

    const timer1 = setTimeout(() => setActiveStage(2), 1500);
    const timer2 = setTimeout(() => setActiveStage(3), 3200);

    try {
      const response = await uploadPdfDocument(file, 'hitl_mixed_visual');
      clearTimeout(timer1);
      clearTimeout(timer2);
      onScanComplete(response);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      const detail =
        err?.response?.data?.detail || err?.message || 'AI structural scan failed. Please check backend connection.';
      setErrorMessage(detail);
      setIsScanning(false);
      setActiveStage(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Strategy Fork</span>
        </button>

        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-role-hr/10 text-role-hr">
          <span>Path B: AI Scan + HITL Review</span>
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-6 sm:p-8 space-y-6">
        {/* Selected File Banner */}
        <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container-high flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-on-surface">{file.name}</div>
            <div className="text-xs text-on-surface-variant font-mono">
              {(file.size / 1024).toFixed(1)} KB • Target: Staging Store & PyMuPDF Review
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-surface-container-high text-on-surface-variant">
            Mixed-Sensitivity PDF
          </span>
        </div>

        {/* Informative Explanation */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-on-surface">
            Automated Inspection & Human-in-the-Loop Workflow
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Unlike standard RAG pipelines that blindly chunk documents, this engine identifies document sections, tags sensitivity with AI, draws color-coded audit boxes directly onto the PDF, and presents an interactive checklist for Administrator approval before vector embedding.
          </p>
        </div>

        {/* 3 Pipeline Stages */}
        <div className="space-y-3">
          {stages.map((st) => {
            const isCompleted = isScanning && activeStage > st.id;
            const isCurrent = isScanning && activeStage === st.id;

            return (
              <div
                key={st.id}
                className={clsx(
                  'p-4 rounded-lg border transition-all duration-200 flex items-start gap-3.5',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-surface-container-high bg-surface-container-lowest'
                )}
              >
                <div
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                    isCurrent
                      ? 'bg-primary text-white animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface-container-high text-on-surface-variant'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    st.id
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={clsx(
                        'text-xs font-bold',
                        isCurrent
                          ? 'text-primary'
                          : isCompleted
                          ? 'text-emerald-800'
                          : 'text-on-surface'
                      )}
                    >
                      {st.title}
                    </h4>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider animate-pulse">
                        In Progress...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CTA Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-container-high">
          <span className="text-xs text-on-surface-variant font-medium">
            AI Block Tagger + Regex PII Filter
          </span>

          <button
            type="button"
            disabled={isScanning}
            onClick={handleStartScan}
            className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Structural Scan...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Start AI & PII Security Scan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MixedScanTriggerCard;
