import React from 'react';
import {
  FileText,
  ExternalLink,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LogicalBlockItem } from '../../types/ingestion';
import { getAnnotatedPdfFullUrl } from '../../api/ingestApi';
import RoleBadge from '../common/RoleBadge';
import SecurityColorLegend from './SecurityColorLegend';
import { clsx } from 'clsx';

interface AnnotatedPdfPreviewProps {
  docId: string;
  activePage: number;
  selectedBlock: LogicalBlockItem | null;
  cacheBustTimestamp: number;
  isRepainting?: boolean;
  onPageChange?: (page: number) => void;
  className?: string;
}

export const AnnotatedPdfPreview: React.FC<AnnotatedPdfPreviewProps> = ({
  docId,
  activePage,
  selectedBlock,
  cacheBustTimestamp,
  isRepainting = false,
  onPageChange,
  className,
}) => {
  const fullPdfUrl = getAnnotatedPdfFullUrl(docId, cacheBustTimestamp);
  const iframeSrc = `${fullPdfUrl}#page=${activePage}&view=FitH`;

  const bboxText = selectedBlock?.bbox
    ? `[${selectedBlock.bbox.map((n) => Math.round(n)).join(', ')}]`
    : 'No block selected';

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-surface-container-high shadow-level-2 flex flex-col h-[820px] overflow-hidden sticky top-16',
        className
      )}
    >
      {/* Header: Inspector Telemetry & Quick Legend */}
      <div className="p-4 border-b border-surface-container-high bg-surface-container-lowest space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span>PyMuPDF Annotated PDF Preview</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <p className="text-[11px] text-on-surface-variant font-mono truncate max-w-xs sm:max-w-sm">
                Doc ID: {docId.slice(0, 8)}... • Page {activePage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download / Open Audit Trail PDF in Full Tab */}
            <a
              href={fullPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-surface-container-low border border-surface-container-highest text-on-surface shadow-sm transition-colors"
              title="Open full annotated PDF in a new browser tab"
            >
              <ExternalLink className="w-3 h-3 text-primary" />
              <span>Open Tab</span>
            </a>
          </div>
        </div>

        {/* Selected Block Coordinate Strip */}
        <div className="p-2.5 rounded-lg bg-white border border-surface-container-high flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="font-semibold text-on-surface truncate">
              {selectedBlock
                ? `Block #${selectedBlock.block_order + 1}: ${selectedBlock.section_heading || 'Section'}`
                : 'Click any card on left to highlight'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low border border-surface-container-high text-on-surface-variant font-semibold">
              BBox: {bboxText}
            </span>

            {selectedBlock?.approved_roles?.map((r) => (
              <RoleBadge key={r} role={r} size="xs" variant="solid" />
            ))}
          </div>
        </div>

        {/* Color Legend Bar */}
        <SecurityColorLegend compact className="w-full justify-between" />
      </div>

      {/* Embedded PDF iframe / Canvas Area */}
      <div className="flex-1 relative bg-surface-container-low overflow-hidden">
        {isRepainting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 animate-fade-in">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs font-semibold text-on-surface font-mono">
              Repainting bounding box overlays with PyMuPDF...
            </span>
          </div>
        )}

        <iframe
          key={`${docId}-${cacheBustTimestamp}-${activePage}`}
          src={iframeSrc}
          title="Annotated PDF Inspection"
          className="w-full h-full border-0"
        />
      </div>

      {/* Bottom Page Navigation Controls */}
      <div className="p-3 border-t border-surface-container-high bg-white flex items-center justify-between text-xs">
        <span className="text-[11px] text-on-surface-variant font-mono">
          Page jump synchronized with block selection
        </span>

        {onPageChange && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => onPageChange(Math.max(1, activePage - 1))}
              className="p-1 rounded-md border border-surface-container-highest hover:bg-surface-container-low disabled:opacity-40"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-semibold px-2">Page {activePage}</span>
            <button
              type="button"
              onClick={() => onPageChange(activePage + 1)}
              className="p-1 rounded-md border border-surface-container-highest hover:bg-surface-container-low"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotatedPdfPreview;
