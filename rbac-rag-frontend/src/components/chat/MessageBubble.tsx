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
          {/* User message container - Grok light neutral style */}
          <div className="bg-zinc-100 text-zinc-900 border border-zinc-200/80 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-2xs text-sm leading-relaxed whitespace-pre-wrap">
            {message.text}
          </div>

          {/* User meta footer */}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-400 font-mono">
            <span>{formatTimestamp(message.timestamp)}</span>
            <span>•</span>
            <RoleBadge role={message.roleAtQuery} size="xs" variant="outline" className="text-[10px] py-0 px-2" />
          </div>
        </div>

        <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-zinc-700" />
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
      <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        {/* Card Bubble Container */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 space-y-4">
          {/* Query Telemetry Ribbon */}
          {meta && (
            <div className="pb-3 border-b border-zinc-100">
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
          <div className="text-sm text-zinc-900 leading-relaxed whitespace-pre-wrap font-sans">
            {message.text}
          </div>

          {/* Citation Cards List */}
          {hasCitations && (
            <div className="pt-3 border-t border-zinc-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-medium uppercase tracking-wider text-[11px] text-zinc-900">
                  Verified Citations ({citations.length} Grounded Chunks)
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
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
          <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400">
            <span className="font-mono">{formatTimestamp(message.timestamp)}</span>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Copy answer to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-zinc-900" />
                  <span className="text-zinc-900 font-medium">Copied!</span>
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

