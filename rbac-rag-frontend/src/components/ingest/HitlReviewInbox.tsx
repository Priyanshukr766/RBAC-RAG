import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { LogicalBlockItem, BlockRoleUpdateItem } from '../../types/ingestion';
import { AllowedRole } from '../../types/auth';
import { fetchDocumentBlocks, updateDocumentBlocksAndRepaint } from '../../api/ingestApi';
import HitlSummaryBar from './HitlSummaryBar';
import LogicalBlockCard from './LogicalBlockCard';

interface HitlReviewInboxProps {
  docId: string;
  initialBlocks?: LogicalBlockItem[];
  selectedBlock: LogicalBlockItem | null;
  onSelectBlock: (block: LogicalBlockItem) => void;
  onRepaintComplete: (newTimestamp: number) => void;
  onPublishClick: () => void;
  isPublishing?: boolean;
}

export const HitlReviewInbox: React.FC<HitlReviewInboxProps> = ({
  docId,
  initialBlocks,
  selectedBlock,
  onSelectBlock,
  onRepaintComplete,
  onPublishClick,
  isPublishing = false,
}) => {
  const [blocks, setBlocks] = useState<LogicalBlockItem[]>(initialBlocks || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialBlocks || initialBlocks.length === 0);
  const [isRepainting, setIsRepainting] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load staged blocks if not provided initially
  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0) {
      setBlocks(initialBlocks);
      if (!selectedBlock) {
        onSelectBlock(initialBlocks[0]);
      }
      setIsLoading(false);
      return;
    }

    const loadBlocks = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchDocumentBlocks(docId);
        const fetchedBlocks = data.blocks || [];
        setBlocks(fetchedBlocks);
        if (fetchedBlocks.length > 0 && !selectedBlock) {
          onSelectBlock(fetchedBlocks[0]);
        }
      } catch (err: any) {
        setErrorMessage(
          err?.response?.data?.detail || err?.message || 'Failed to load staged logical blocks.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadBlocks();
  }, [docId]);

  // Toggle role approval with smart public/confidential exclusivity
  const handleToggleRole = (blockId: string, role: AllowedRole) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.block_id !== blockId) return b;

        let newRoles: AllowedRole[];
        if (role === 'all_employees') {
          // If toggling all_employees ON, clear restricted roles
          newRoles = b.approved_roles.includes('all_employees')
            ? []
            : ['all_employees'];
        } else {
          // Toggling a restricted role (hr, finance, engineering, etc.)
          const withoutPublic = b.approved_roles.filter((r) => r !== 'all_employees');
          if (withoutPublic.includes(role)) {
            newRoles = withoutPublic.filter((r) => r !== role);
          } else {
            newRoles = [...withoutPublic, role];
          }
        }

        // Default fallback to all_employees if user unchecks everything
        if (newRoles.length === 0) {
          newRoles = ['all_employees'];
        }

        return {
          ...b,
          approved_roles: newRoles,
          needs_human_review: false, // Mark reviewed when admin modifies
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  // Bulk Approve AI Suggestions
  const handleBulkApproveSuggested = () => {
    setBlocks((prev) =>
      prev.map((b) => ({
        ...b,
        approved_roles: [...b.suggested_roles],
        needs_human_review: false,
      }))
    );
    setHasUnsavedChanges(true);
  };

  // Repaint PDF via Backend PyMuPDF
  const handleRepaint = async () => {
    setIsRepainting(true);
    setErrorMessage(null);
    try {
      const updates: BlockRoleUpdateItem[] = blocks.map((b) => ({
        block_id: b.block_id,
        approved_roles: b.approved_roles,
      }));

      const res = await updateDocumentBlocksAndRepaint(docId, updates);
      if (res.blocks && res.blocks.length > 0) {
        setBlocks(res.blocks);
      }
      setHasUnsavedChanges(false);
      onRepaintComplete(Date.now());
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || err?.message || 'Failed to repaint annotated PDF bounding boxes.'
      );
    } finally {
      setIsRepainting(false);
    }
  };

  // Metrics
  const totalBlocks = blocks.length;
  const flaggedCount = blocks.filter((b) => b.needs_human_review || b.pii_triggered).length;
  const autoApprovedCount = totalBlocks - flaggedCount;

  // Filtered blocks
  const visibleBlocks = showOnlyFlagged
    ? blocks.filter((b) => b.needs_human_review || b.pii_triggered)
    : blocks;

  return (
    <div className="space-y-4">
      {/* Summary Metrics & Actions Bar */}
      <HitlSummaryBar
        totalBlocks={totalBlocks}
        autoApprovedCount={autoApprovedCount}
        flaggedCount={flaggedCount}
        showOnlyFlagged={showOnlyFlagged}
        onToggleFilter={setShowOnlyFlagged}
        hasUnsavedChanges={hasUnsavedChanges}
        isRepainting={isRepainting}
        isPublishing={isPublishing}
        onRepaint={handleRepaint}
        onPublishClick={onPublishClick}
        onBulkApproveSuggested={handleBulkApproveSuggested}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="p-16 text-center text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2 bg-white rounded-xl border border-surface-container-high">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Fetching staged logical blocks from database...</span>
        </div>
      ) : visibleBlocks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-container-high space-y-2">
          <FileText className="w-8 h-8 text-on-surface-variant/50 mx-auto" />
          <h4 className="text-sm font-semibold text-on-surface">No Flagged Blocks</h4>
          <p className="text-xs text-on-surface-variant">
            All extracted logical blocks are currently auto-approved or reviewed! Switch filter to "All Blocks" to inspect everything.
          </p>
        </div>
      ) : (
        /* Logical Block Review Cards List */
        <div className="space-y-3.5">
          {visibleBlocks.map((block) => (
            <LogicalBlockCard
              key={block.block_id}
              block={block}
              isSelected={selectedBlock?.block_id === block.block_id}
              onToggleRole={handleToggleRole}
              onSelectBlock={onSelectBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HitlReviewInbox;

