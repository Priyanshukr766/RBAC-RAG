import React from 'react';
import {
  RefreshCw,
  Send,
  CheckCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface HitlSummaryBarProps {
  totalBlocks: number;
  autoApprovedCount: number;
  flaggedCount: number;
  showOnlyFlagged: boolean;
  onToggleFilter: (showOnlyFlagged: boolean) => void;
  hasUnsavedChanges: boolean;
  isRepainting: boolean;
  isPublishing: boolean;
  onRepaint: () => void;
  onPublishClick: () => void;
  onBulkApproveSuggested?: () => void;
}

export const HitlSummaryBar: React.FC<HitlSummaryBarProps> = ({
  totalBlocks,
  autoApprovedCount,
  flaggedCount,
  showOnlyFlagged,
  onToggleFilter,
  hasUnsavedChanges,
  isRepainting,
  isPublishing,
  onRepaint,
  onPublishClick,
  onBulkApproveSuggested,
}) => {
  return (
    <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20">
      {/* Left: Metrics & Status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Staged Review:
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-surface-container text-on-surface">
            {totalBlocks} Blocks
          </span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-surface-container-high">
          {/* Auto-Approved Pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{autoApprovedCount} Auto-Approved</span>
          </span>

          {/* Flagged Pill */}
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
              flaggedCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high'
            )}
          >
            <span
              className={clsx(
                'w-1.5 h-1.5 rounded-full',
                flaggedCount > 0 ? 'bg-amber-500' : 'bg-on-surface-variant/40'
              )}
            />
            <span>{flaggedCount} Flagged / Low Conf</span>
          </span>
        </div>

        {/* Filter Toggle Buttons */}
        <div className="inline-flex p-0.5 bg-surface-container-low rounded-lg border border-surface-container-high text-xs ml-1">
          <button
            type="button"
            onClick={() => onToggleFilter(false)}
            className={clsx(
              'px-3 py-1 rounded-md font-medium transition-all duration-200',
              !showOnlyFlagged
                ? 'bg-white text-on-surface font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            All Blocks ({totalBlocks})
          </button>
          <button
            type="button"
            onClick={() => onToggleFilter(true)}
            className={clsx(
              'px-3 py-1 rounded-md font-medium transition-all duration-200 flex items-center gap-1',
              showOnlyFlagged
                ? 'bg-white text-amber-800 font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            <span>Flagged ({flaggedCount})</span>
          </button>
        </div>
      </div>

      {/* Right: Actions (Repaint & Publish) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {onBulkApproveSuggested && flaggedCount > 0 && (
          <button
            type="button"
            onClick={onBulkApproveSuggested}
            disabled={isRepainting || isPublishing}
            className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 border border-surface-container-high"
            title="Accept all AI suggested role tags for flagged blocks"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Bulk Approve</span>
          </button>
        )}

        {/* Repaint Button */}
        <button
          type="button"
          onClick={onRepaint}
          disabled={isRepainting || isPublishing}
          className={clsx(
            'btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 relative',
            hasUnsavedChanges && 'border-primary ring-2 ring-primary/20 text-primary font-semibold'
          )}
          title="Updates approved roles and redraws PyMuPDF bounding box colors on the PDF preview"
        >
          <RefreshCw className={clsx('w-3.5 h-3.5 text-primary', isRepainting && 'animate-spin')} />
          <span>{isRepainting ? 'Repainting PDF...' : 'Repaint PDF'}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-primary absolute -top-1 -right-1 animate-ping" />
          )}
        </button>

        {/* Publish Button */}
        <button
          type="button"
          onClick={onPublishClick}
          disabled={isRepainting || isPublishing}
          className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm"
        >
          {isPublishing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Publishing Chunks...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Publish</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default HitlSummaryBar;
