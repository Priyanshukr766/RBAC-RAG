import React from 'react';
import { clsx } from 'clsx';

interface ConfidenceMeterProps {
  score: number; // Expects 0.0 - 1.0 or 0 - 100
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  score,
  showLabel = true,
  compact = false,
  className,
}) => {
  // Normalize score to percentage (0 - 100)
  const normalizedPercentage = Math.round(score <= 1.0 ? score * 100 : score);
  const isHighConfidence = normalizedPercentage >= 90;

  if (compact) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold select-none',
          isHighConfidence
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-300',
          className
        )}
        title={
          isHighConfidence
            ? `High AI Confidence (${normalizedPercentage}%): Auto-Approved`
            : `Low AI Confidence (${normalizedPercentage}%): Human Review Required`
        }
      >
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            isHighConfidence ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        />
        <span>{normalizedPercentage}%</span>
      </span>
    );
  }

  return (
    <div className={clsx('flex flex-col gap-1.5 min-w-[140px]', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-on-surface-variant">
          {isHighConfidence ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 font-semibold">Auto-Approved</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-amber-700 font-semibold">Needs Review</span>
            </>
          )}
        </span>
        {showLabel && (
          <span
            className={clsx(
              'font-semibold tabular-nums',
              isHighConfidence ? 'text-emerald-700' : 'text-amber-700'
            )}
          >
            {normalizedPercentage}%
          </span>
        )}
      </div>

      {/* Progress track */}
      <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            isHighConfidence ? 'bg-emerald-500' : 'bg-amber-500'
          )}
          style={{ width: `${Math.min(100, Math.max(0, normalizedPercentage))}%` }}
        />
      </div>
    </div>
  );
};

export default ConfidenceMeter;

