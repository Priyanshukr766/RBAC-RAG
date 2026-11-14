import React from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  MapPin,
  Table,
  Sparkles,
} from 'lucide-react';
import { CitationItem } from '../../types/chat';
import { getAnnotatedPdfFullUrl } from '../../api/ingestApi';
import SecurityColorLegend from '../ingest/SecurityColorLegend';
import { clsx } from 'clsx';

interface PdfCitationDrawerProps {
  citation: CitationItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfCitationDrawer: React.FC<PdfCitationDrawerProps> = ({
  citation,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !citation) return null;

  const isExcel = citation.filename.toLowerCase().endsWith('.xlsx') || citation.page_number === null;
  const fullPdfUrl = citation.doc_id ? getAnnotatedPdfFullUrl(citation.doc_id) : '';
  const pageNo = citation.page_number || 1;
  const iframeSrc = `${fullPdfUrl}#page=${pageNo}&view=FitH`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl lg:max-w-3xl bg-white border-l border-surface-container-high shadow-level-3 flex flex-col h-full overflow-hidden">
          {/* Drawer Header */}
          <div className="p-5 border-b border-surface-container-high bg-surface-container-lowest flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm',
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
                  <h3 className="text-sm font-bold text-on-surface truncate" title={citation.filename}>
                    {citation.filename}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white border border-surface-container-high uppercase flex-shrink-0">
                    {isExcel ? 'Spreadsheet Chunk' : `Page ${citation.page_number}`}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-mono truncate">
                  Chunk ID: {citation.chunk_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!isExcel && fullPdfUrl && (
                <a
                  href={fullPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  title="Open annotated audit PDF in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Open Full PDF</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section Heading & Bounding Box Coordinates Bar */}
          <div className="px-5 py-3 border-b border-surface-container-high bg-white flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-on-surface truncate">
                {citation.section_heading || 'Grounded Document Passage'}
              </span>
            </div>

            {citation.bbox && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-container-low border border-surface-container-high font-mono text-[11px] text-on-surface font-semibold">
                <MapPin className="w-3 h-3 text-primary" />
                <span>BBox: [{citation.bbox.map((n) => Math.round(n)).join(', ')}]</span>
              </span>
            )}
          </div>

          {/* Retrieved Passage Snippet Card */}
          <div className="p-4 bg-surface-container-lowest border-b border-surface-container-high space-y-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Exact Retrieved Vector Chunk Snippet:</span>
            </span>
            <div className="p-3 bg-white rounded-lg border border-surface-container-high text-xs text-on-surface leading-relaxed italic font-sans selection:bg-primary-container">
              "{citation.snippet}"
            </div>
          </div>

          {/* Viewer Area: PDF Iframe or Excel Data Table Card */}
          <div className="flex-1 overflow-hidden relative bg-surface-container-low flex flex-col">
            {isExcel ? (
              /* Excel Row View */
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="p-5 bg-white rounded-xl border border-surface-container-high shadow-level-2 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <span>Row-Level Sub-Document Record</span>
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    This citation was retrieved from an Excel spreadsheet partitioned by the sub-document column splitter.
                  </p>

                  <div className="p-4 rounded-lg bg-surface-container-lowest border border-surface-container-high font-mono text-xs leading-relaxed break-words">
                    {citation.snippet}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <span className="font-bold block">Role-Protected Record</span>
                  Secure row partitioning ensures unauthorized department columns are suppressed.
                </div>
              </div>
            ) : (
              /* Embedded PDF Page View */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-2.5 bg-white border-b border-surface-container-high flex-shrink-0">
                  <SecurityColorLegend compact className="w-full justify-between" />
                </div>

                <div className="flex-1 relative w-full h-full min-h-[500px]">
                  <iframe
                    key={`${citation.chunk_id}-${citation.doc_id}-${pageNo}`}
                    src={iframeSrc}
                    title="Annotated PDF Citation"
                    className="w-full h-full min-h-[500px] border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfCitationDrawer;
