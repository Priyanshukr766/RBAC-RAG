import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  X,
  ArrowRight,
} from 'lucide-react';
import { UploadMode } from '../../types/ingestion';
import { clsx } from 'clsx';

interface UploadTriageForkProps {
  onProceed: (file: File, mode: UploadMode) => void;
  initialFile?: File | null;
  initialMode?: UploadMode;
}

export const UploadTriageFork: React.FC<UploadTriageForkProps> = ({
  onProceed,
  initialFile = null,
  initialMode = 'hitl_mixed_visual',
}) => {
  const [file, setFile] = useState<File | null>(initialFile);
  const [mode, setMode] = useState<UploadMode>(initialMode);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFile: File) => {
    setFile(newFile);
    const isExcel = newFile.name.toLowerCase().endsWith('.xlsx');
    if (isExcel) {
      setMode('excel_column_split');
    } else if (mode === 'excel_column_split') {
      setMode('hitl_mixed_visual');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (name.endsWith('.pdf') || name.endsWith('.xlsx')) {
        handleFileChange(droppedFile);
      } else {
        alert('Unsupported format. Please upload a .pdf or .xlsx document.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isExcel = file ? file.name.toLowerCase().endsWith('.xlsx') : false;
  const isPdf = file ? file.name.toLowerCase().endsWith('.pdf') : false;

  const handleSubmit = () => {
    if (file) {
      onProceed(file, mode);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Step Header */}
      <div>
        <div className="inline-flex items-center px-3 py-1 rounded-md bg-primary-container text-on-primary-container text-xs font-semibold tracking-wider uppercase mb-2">
          <span>Stage 1: Document Ingestion Triage</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">
          Select Document & Security Processing Mode
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Choose between rapid single-role ingestion, human-in-the-loop visual bounding box review, or column-level spreadsheet splitting.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
              : 'border-surface-container-highest hover:border-primary/50 hover:bg-white bg-surface-container-lowest'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
            <UploadCloud className="w-7 h-7 text-primary" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-on-surface">
              Drop enterprise document here or click to browse
            </p>
            <p className="text-xs text-on-surface-variant">
              Supported formats: <strong className="text-on-surface">PDF (.pdf)</strong> for visual bounding-box review or <strong className="text-on-surface">Excel (.xlsx)</strong> for column splitting
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-surface-container-high text-on-surface-variant">
              <span>Multi-Page PDFs</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-surface-container-high text-on-surface-variant">
              <span>Excel Workbooks</span>
            </span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white rounded-xl border border-surface-container-high p-4 sm:p-5 flex items-center justify-between shadow-level-2">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm',
                isExcel ? 'bg-emerald-600' : 'bg-primary'
              )}
            >
              {isExcel ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface truncate">
                  {file.name}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container text-on-surface-variant uppercase">
                  {isExcel ? 'Excel Spreadsheet' : 'PDF Document'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Size: {formatFileSize(file.size)} • Type: {file.type || 'application/octet-stream'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs px-4 py-2"
            >
              Change File
            </button>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* 3-Way Triage Fork Options */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
          Choose Processing Strategy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option A: Express Single-Role Ingestion */}
          <div
            onClick={() => {
              if (!file || isPdf) setMode('express_single_role');
            }}
            className={clsx(
              'rounded-xl border p-5 transition-all duration-200 relative flex flex-col justify-between',
              file && isExcel ? 'opacity-40 pointer-events-none bg-surface-container-low' : 'cursor-pointer',
              mode === 'express_single_role' && (!file || isPdf)
                ? 'bg-white border-primary ring-2 ring-primary/20 shadow-level-3'
                : 'bg-white border-surface-container-high hover:border-surface-container-highest hover:shadow-level-2'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Express Single-Role
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant uppercase tracking-wider">
                  Path A • Fast
                </span>
              </div>

              <h4 className="text-sm font-bold text-on-surface mb-1">
                Direct Vector Indexing
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Applies a uniform role tag to the entire document. Bypasses block-level AI classification for instant 3-second vector indexing.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-high flex items-center justify-between text-xs">
              <span className="text-[11px] text-on-surface-variant font-mono">
                Speed: ~3 sec
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'express_single_role' && (!file || isPdf)
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-container-highest bg-white'
                )}
              >
                {mode === 'express_single_role' && (!file || isPdf) && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </div>

          {/* Option B: AI Structural Scan + Visual HITL Review */}
          <div
            onClick={() => {
              if (!file || isPdf) setMode('hitl_mixed_visual');
            }}
            className={clsx(
              'rounded-xl border p-5 transition-all duration-200 relative flex flex-col justify-between',
              file && isExcel ? 'opacity-40 pointer-events-none bg-surface-container-low' : 'cursor-pointer',
              mode === 'hitl_mixed_visual' && (!file || isPdf)
                ? 'bg-white border-primary ring-2 ring-primary/20 shadow-level-3'
                : 'bg-white border-surface-container-high hover:border-surface-container-highest hover:shadow-level-2'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-role-hr uppercase tracking-wider">
                  Visual HITL Review
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 uppercase tracking-wider">
                  Path B • Recommended
                </span>
              </div>

              <h4 className="text-sm font-bold text-on-surface mb-1">
                AI Layout & BBox Inspector
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Docling structural block scan + AI sensitivity tagging + Regex PII detection. Review checkboxes with live colored PyMuPDF bounding boxes.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-high flex items-center justify-between text-xs">
              <span className="text-[11px] text-on-surface-variant font-mono">
                Audit Trail PDF
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'hitl_mixed_visual' && (!file || isPdf)
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-container-highest bg-white'
                )}
              >
                {mode === 'hitl_mixed_visual' && (!file || isPdf) && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </div>

          {/* Option C: Excel Sub-Document Column Splitter */}
          <div
            onClick={() => {
              if (!file || isExcel) setMode('excel_column_split');
            }}
            className={clsx(
              'rounded-xl border p-5 transition-all duration-200 relative flex flex-col justify-between',
              file && isPdf ? 'opacity-40 pointer-events-none bg-surface-container-low' : 'cursor-pointer',
              mode === 'excel_column_split' && (!file || isExcel)
                ? 'bg-white border-primary ring-2 ring-primary/20 shadow-level-3'
                : 'bg-white border-surface-container-high hover:border-surface-container-highest hover:shadow-level-2'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Excel Column Splitter
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant uppercase tracking-wider">
                  Path C • Excel
                </span>
              </div>

              <h4 className="text-sm font-bold text-on-surface mb-1">
                Sub-Document Splitting
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Splits public columns (Name, Title, Dept) from confidential columns (Salary, Bonus) at the row level while preserving anchor keys.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container-high flex items-center justify-between text-xs">
              <span className="text-[11px] text-on-surface-variant font-mono">
                Row-Level RBAC
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'excel_column_split' && (!file || isExcel)
                    ? 'border-primary bg-primary text-white'
                    : 'border-surface-container-highest bg-white'
                )}
              >
                {mode === 'excel_column_split' && (!file || isExcel) && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proceed CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-container-high">
        <p className="text-xs text-on-surface-variant">
          {!file
            ? 'Select a document above to unlock the processing pipeline.'
            : `Ready to process "${file.name}" with selected strategy.`}
        </p>

        <button
          type="button"
          disabled={!file}
          onClick={handleSubmit}
          className="btn-primary flex items-center gap-2 px-8 py-3 text-sm disabled:opacity-40"
        >
          <span>
            {mode === 'express_single_role'
              ? 'Configure Single-Role Express Ingest'
              : mode === 'excel_column_split'
              ? 'Configure Excel Column Splitter'
              : 'Launch AI Scan & Visual Review'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UploadTriageFork;

