import React from 'react';
import { FileText, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { CitationItem } from '../../types/chat';
import { clsx } from 'clsx';

interface CitationCardProps {
  citation: CitationItem;
  onClick: () => void;
  compact?: boolean;
  className?: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  onClick,
  compact = false,
  className,
}) => {
  const isExcel = citation.filename.toLowerCase().endsWith('.xlsx') || citation.page_number === null;
  const bboxFormatted = citation.bbox
    ? `[${citation.bbox.map((n) => Math.round(n)).join(', ')}]`
    : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-200 select-none text-left',
          'bg-white border-surface-container-high hover:border-primary hover:bg-primary/5 text-on-surface shadow-xs group',
          className
        )}
        title={`Inspect source citation: ${citation.filename}`}
      >
        {isExcel ? (
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        )}
        <span className="truncate max-w-[140px] font-semibold">{citation.filename}</span>
        <span className="font-mono text-[10px] text-on-surface-variant">
          {citation.page_number ? `P. ${citation.page_number}` : 'Excel'}
        </span>
        <ExternalLink className="w-2.5 h-2.5 text-on-surface-variant group-hover:text-primary transition-colors" />
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3.5 rounded-lg border border-surface-container-high bg-surface-container-lowest hover:border-primary/50 hover:bg-white transition-all duration-200 cursor-pointer group text-left relative flex flex-col justify-between space-y-2 shadow-xs hover:shadow-level-2',
        className
      )}
    >
      <div className="space-y-1">
        {/* Document Header */}
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
            {isExcel ? (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <span className="truncate">{citation.filename}</span>
          </span>

          <span className="font-mono text-[10px] text-on-surface-variant px-2 py-0.5 rounded-md bg-white border border-surface-container-high flex-shrink-0 font-medium">
            {citation.page_number ? `Page ${citation.page_number}` : 'Spreadsheet Row'}
          </span>
        </div>

        {/* Section Heading */}
        {citation.section_heading && (
          <p className="text-xs font-semibold text-on-surface-variant truncate">
            {citation.section_heading}
          </p>
        )}

        {/* Snippet Text */}
        <p className="text-[11px] text-on-surface-variant/90 line-clamp-2 leading-relaxed italic font-sans pt-0.5">
          "{citation.snippet}"
        </p>
      </div>

      {/* Footer Info & Inspection Action */}
      <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
        {bboxFormatted ? (
          <span>BBox: {bboxFormatted}</span>
        ) : (
          <span className="text-emerald-700 font-semibold">Row-Level Chunk</span>
        )}

        <span className="inline-flex items-center gap-1 text-primary font-semibold group-hover:underline">
          <span>View in PDF</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
};

export default CitationCard;

