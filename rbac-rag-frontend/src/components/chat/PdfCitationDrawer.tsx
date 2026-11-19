import React from 'react';
import {
  X,
  FileText,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CitationItem } from '../../types/chat';
import { getAnnotatedPdfFullUrl } from '../../api/ingestApi';
import SecurityColorLegend from '../ingest/SecurityColorLegend';

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
        <div className="w-screen max-w-2xl lg:max-w-3xl bg-white border-l border-zinc-200 shadow-2xl flex flex-col h-full overflow-hidden">
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs bg-zinc-900">
                <FileText className="w-5 h-5 text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-950 truncate" title={citation.filename}>
                    {citation.filename}
                  </h3>
                  {citation.page_number && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white border border-zinc-200 uppercase flex-shrink-0">
                      Page {citation.page_number}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono truncate">
                  Chunk ID: {citation.chunk_id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {fullPdfUrl && (
                <a
                  href={fullPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  title="Open annotated audit PDF in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-700" />
                  <span className="hidden sm:inline">Open Full PDF</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Section Heading & Bounding Box Coordinates Bar */}
          <div className="px-5 py-3 border-b border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-zinc-950 truncate">
                {citation.section_heading || 'Grounded Document Passage'}
              </span>
            </div>

            {citation.bbox && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 font-mono text-[11px] text-zinc-700 font-medium">
                <MapPin className="w-3 h-3 text-zinc-700" />
                <span>BBox: [{citation.bbox.map((n) => Math.round(n)).join(', ')}]</span>
              </span>
            )}
          </div>

          {/* Retrieved Passage Snippet Card */}
          <div className="p-4 bg-zinc-50/50 border-b border-zinc-200 space-y-1.5 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-zinc-700" />
              <span>Exact Retrieved Vector Chunk Snippet:</span>
            </span>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-xs text-zinc-900 leading-relaxed italic font-sans">
              "{citation.snippet}"
            </div>
          </div>

          {/* Viewer Area: Embedded PDF Page View */}
          <div className="flex-1 overflow-hidden relative bg-zinc-50 flex flex-col">
            <div className="p-2.5 bg-white border-b border-zinc-200 flex-shrink-0">
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
        </div>
      </div>
    </div>
  );
};

export default PdfCitationDrawer;
