import React, { useState } from 'react';
import {
  User,
  Bot,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessage, CitationItem } from '../../types/chat';
import QueryTelemetryRibbon from './QueryTelemetryRibbon';
import CitationCard from './CitationCard';
import RoleBadge from '../common/RoleBadge';

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectCitation?: (citation: CitationItem) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSelectCitation,
}) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 max-w-3xl ml-auto animate-fade-in group">
        <div className="flex flex-col items-end max-w-xl">
          {/* User message container */}
          <div className="bg-primary text-white rounded-xl rounded-tr-xs px-5 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap selection:bg-white/30">
            {message.text}
          </div>

          {/* User meta footer */}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-on-surface-variant font-mono">
            <span>{formatTimestamp(message.timestamp)}</span>
            <span>•</span>
            <RoleBadge role={message.roleAtQuery} size="xs" variant="outline" className="text-[10px] py-0 px-2" />
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Assistant Message
  const meta = message.responseMeta;
  const citations = meta?.citations || [];
  const hasCitations = citations.length > 0;

  return (
    <div className="flex justify-start gap-3 max-w-4xl mr-auto animate-fade-in group">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        {/* Card Bubble Container */}
        <div className="bg-white rounded-xl border border-surface-container-high shadow-level-2 p-5 space-y-4">
          {/* Query Telemetry Ribbon */}
          {meta && (
            <div className="pb-3 border-b border-surface-container-high">
              <QueryTelemetryRibbon
                effectiveRole={meta.effective_role || message.roleAtQuery}
                guardrailStatus={meta.guardrail_status}
                guardrailReason={meta.guardrail_reason}
                cacheHit={meta.cache_hit}
                latencyMs={meta.latency_ms}
                retrievedChunkCount={meta.retrieved_chunk_ids?.length || 0}
              />
            </div>
          )}

          {/* Main Answer Text */}
          <div className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-sans selection:bg-primary-container selection:text-on-primary-container">
            {message.text}
          </div>

          {/* Citation Cards List */}
          {hasCitations && (
            <div className="pt-3 border-t border-surface-container-high space-y-2.5">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-bold uppercase tracking-wider text-[11px] text-on-surface">
                  Verified Citations ({citations.length} Grounded Chunks)
                </span>
                <span className="text-[11px] font-mono text-emerald-700">
                  Verified Sources
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {citations.map((cite) => (
                  <CitationCard
                    key={cite.chunk_id}
                    citation={cite}
                    onClick={() => onSelectCitation && onSelectCitation(cite)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assistant Action Strip */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-on-surface-variant">
            <span className="font-mono">{formatTimestamp(message.timestamp)}</span>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
              title="Copy answer to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

