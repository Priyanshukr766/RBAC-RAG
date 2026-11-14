import React from 'react';
import { LogicalBlockItem } from '../../types/ingestion';
import { AllowedRole } from '../../types/auth';
import ConfidenceMeter from '../common/ConfidenceMeter';
import RoleBadge from '../common/RoleBadge';
import { ALL_ASSIGNABLE_ROLES, getRoleMeta } from '../../utils/roleUtils';
import { clsx } from 'clsx';

interface LogicalBlockCardProps {
  block: LogicalBlockItem;
  isSelected: boolean;
  onToggleRole: (blockId: string, role: AllowedRole) => void;
  onSelectBlock: (block: LogicalBlockItem) => void;
}

export const LogicalBlockCard: React.FC<LogicalBlockCardProps> = ({
  block,
  isSelected,
  onToggleRole,
  onSelectBlock,
}) => {
  const isHighConfidence = block.confidence_score >= 0.9 && !block.pii_triggered;
  const bboxFormatted = block.bbox
    ? `[${block.bbox.map((n) => Math.round(n)).join(', ')}]`
    : '[N/A]';

  return (
    <div
      onClick={() => onSelectBlock(block)}
      className={clsx(
        'rounded-xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer relative',
        isSelected
          ? 'bg-white border-primary ring-2 ring-primary/30 shadow-level-3'
          : 'bg-white border-surface-container-high hover:border-surface-container-highest hover:shadow-level-2',
        block.needs_human_review && !isSelected && 'border-l-4 border-l-amber-500 bg-amber-50/15',
        block.pii_triggered && !isSelected && 'border-l-4 border-l-role-hr bg-red-50/15'
      )}
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-xs font-mono font-bold text-on-surface">
            #{block.block_order + 1}
          </span>
          <span className="text-xs font-bold text-on-surface truncate max-w-xs sm:max-w-md">
            {block.section_heading || 'Standard Paragraph'}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant">
          <span className="px-2 py-0.5 rounded-md bg-surface-container-low border border-surface-container-high">
            Page {block.page_number}
          </span>
          <span
            className="hidden sm:inline px-2 py-0.5 rounded-md bg-surface-container-low border border-surface-container-high"
            title="Bounding Box Coordinates [x0, y0, x1, y1] on PDF"
          >
            <span>{bboxFormatted}</span>
          </span>
        </div>
      </div>

      {/* Security Alert & Confidence Meter Ribbon */}
      <div className="py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {block.pii_triggered && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-role-hr border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>PII / Compensation Detected</span>
            </span>
          )}

          {block.needs_human_review && !block.pii_triggered && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Needs Review (&lt; 90% Conf)</span>
            </span>
          )}

          {isHighConfidence && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Auto-Approved</span>
            </span>
          )}

          {/* AI Suggestion Tag */}
          <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant pl-1">
            <span className="font-medium">AI Suggested:</span>
            <div className="flex items-center gap-1">
              {block.suggested_roles.map((r) => (
                <RoleBadge key={r} role={r} size="xs" variant="outline" />
              ))}
            </div>
          </div>
        </div>

        {/* Confidence Progress Meter */}
        <div className="w-full sm:w-auto">
          <ConfidenceMeter score={block.confidence_score} showLabel compact={false} />
        </div>
      </div>

      {/* Raw Text Snippet Preview */}
      <div className="my-2 p-3 bg-surface-container-lowest rounded-lg border border-surface-container-high max-h-36 overflow-y-auto text-xs text-on-surface leading-relaxed font-sans whitespace-pre-wrap select-text">
        {block.raw_text}
      </div>

      {/* Interactive Approved Roles Checkboxes */}
      <div className="pt-3 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-on-surface-variant">
          Approved Roles:
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {ALL_ASSIGNABLE_ROLES.map((role) => {
            const isApproved = block.approved_roles.includes(role);
            const meta = getRoleMeta(role);

            return (
              <label
                key={role}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRole(block.block_id, role);
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 select-none border',
                  isApproved
                    ? `${meta.solidBgClass} shadow-sm`
                    : 'bg-white border-surface-container-highest text-on-surface-variant hover:border-surface-container-highest hover:bg-surface-container-lowest opacity-65'
                )}
              >
                <input
                  type="checkbox"
                  checked={isApproved}
                  onChange={() => {}} // Handled by onClick
                  className="hidden"
                />
                <span>{meta.shortLabel}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LogicalBlockCard;

