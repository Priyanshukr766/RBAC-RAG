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
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-medium tracking-wider uppercase mb-2">
          <span>Stage 1: Document Ingestion Triage</span>
        </div>
        <h2 className="text-2xl font-normal tracking-tight text-zinc-950">
          Select Document & Security Processing Mode
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
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
            'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
            isDragging
              ? 'border-zinc-900 bg-zinc-50'
              : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/60 bg-zinc-50/30'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-6 h-6 text-zinc-700" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-900">
              Drop enterprise document here or click to browse
            </p>
            <p className="text-xs text-zinc-500">
              Supported formats: <strong className="text-zinc-800 font-medium">PDF (.pdf)</strong> for visual bounding-box review or <strong className="text-zinc-800 font-medium">Excel (.xlsx)</strong> for column splitting
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-white border border-zinc-200 text-zinc-600">
              <span>Multi-Page PDFs</span>
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-white border border-zinc-200 text-zinc-600">
              <span>Excel Workbooks</span>
            </span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-zinc-900 text-white shadow-xs">
              {isExcel ? (
                <FileSpreadsheet className="w-5 h-5 text-white" />
              ) : (
                <FileText className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-950 truncate">
                  {file.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 border border-zinc-200 text-zinc-700 uppercase">
                  {isExcel ? 'Excel Spreadsheet' : 'PDF Document'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
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
              'rounded-2xl border p-5 transition-all relative flex flex-col justify-between',
              file && isExcel ? 'opacity-40 pointer-events-none bg-zinc-50' : 'cursor-pointer',
              mode === 'express_single_role' && (!file || isPdf)
                ? 'bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-xs'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Express Single-Role
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 uppercase tracking-wider">
                  Path A • Fast
                </span>
              </div>

              <h4 className="text-sm font-semibold text-zinc-950 mb-1">
                Direct Vector Indexing
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Applies a uniform role tag to the entire document. Bypasses block-level AI classification for instant 3-second vector indexing.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400 font-mono">
                Speed: ~3 sec
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'express_single_role' && (!file || isPdf)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white'
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
              'rounded-2xl border p-5 transition-all relative flex flex-col justify-between',
              file && isExcel ? 'opacity-40 pointer-events-none bg-zinc-50' : 'cursor-pointer',
              mode === 'hitl_mixed_visual' && (!file || isPdf)
                ? 'bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-xs'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Visual HITL Review
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 uppercase tracking-wider">
                  Path B • Recommended
                </span>
              </div>

              <h4 className="text-sm font-semibold text-zinc-950 mb-1">
                AI Layout & BBox Inspector
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Docling structural block scan + AI sensitivity tagging + Regex PII detection. Review checkboxes with live colored PyMuPDF bounding boxes.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400 font-mono">
                Audit Trail PDF
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'hitl_mixed_visual' && (!file || isPdf)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white'
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
              'rounded-2xl border p-5 transition-all relative flex flex-col justify-between',
              file && isPdf ? 'opacity-40 pointer-events-none bg-zinc-50' : 'cursor-pointer',
              mode === 'excel_column_split' && (!file || isExcel)
                ? 'bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-xs'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Excel Column Splitter
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 uppercase tracking-wider">
                  Path C • Excel
                </span>
              </div>

              <h4 className="text-sm font-semibold text-zinc-950 mb-1">
                Sub-Document Splitting
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Splits public columns (Name, Title, Dept) from confidential columns (Salary, Bonus) at the row level while preserving anchor keys.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400 font-mono">
                Row-Level RBAC
              </span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                  mode === 'excel_column_split' && (!file || isExcel)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white'
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

