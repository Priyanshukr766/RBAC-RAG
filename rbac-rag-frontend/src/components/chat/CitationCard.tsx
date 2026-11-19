import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
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
  const bboxFormatted = citation.bbox
    ? `[${citation.bbox.map((n) => Math.round(n)).join(', ')}]`
    : null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all select-none text-left',
          'bg-white border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 text-zinc-900 shadow-2xs group',
          className
        )}
        title={`Inspect source citation: ${citation.filename}`}
      >
        <FileText className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
        <span className="truncate max-w-[140px] font-medium">{citation.filename}</span>
        {citation.page_number && (
          <span className="font-mono text-[10px] text-zinc-400">
            P. {citation.page_number}
          </span>
        )}
        <ExternalLink className="w-2.5 h-2.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:border-zinc-400 hover:bg-white transition-all cursor-pointer group text-left relative flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-xs',
        className
      )}
    >
      <div className="space-y-1">
        {/* Document Header */}
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-xs text-zinc-900 truncate group-hover:text-black transition-colors flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            <span className="truncate">{citation.filename}</span>
          </span>

          {citation.page_number && (
            <span className="font-mono text-[10px] text-zinc-500 px-2 py-0.5 rounded-full bg-white border border-zinc-200 flex-shrink-0 font-medium">
              Page {citation.page_number}
            </span>
          )}
        </div>

        {/* Section Heading */}
        {citation.section_heading && (
          <p className="text-xs font-medium text-zinc-600 truncate">
            {citation.section_heading}
          </p>
        )}

        {/* Snippet Text */}
        <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed italic font-sans pt-0.5">
          "{citation.snippet}"
        </p>
      </div>

      {/* Footer Info & Inspection Action */}
      <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        {bboxFormatted ? (
          <span>BBox: {bboxFormatted}</span>
        ) : (
          <span className="text-zinc-700 font-medium">Row-Level Chunk</span>
        )}

        <span className="inline-flex items-center gap-1 text-zinc-800 font-medium group-hover:text-black group-hover:underline">
          <span>View in PDF</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
};

export default CitationCard;

