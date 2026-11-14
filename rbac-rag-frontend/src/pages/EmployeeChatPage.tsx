import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatQueryResponse, CitationItem } from '../types/chat';
import { sendChatQuery } from '../api/chatApi';
import RoleBadge from '../components/common/RoleBadge';
import MessageBubble from '../components/chat/MessageBubble';
import RolePromptSuggestions from '../components/chat/RolePromptSuggestions';
import PdfCitationDrawer from '../components/chat/PdfCitationDrawer';
import { clsx } from 'clsx';

export const EmployeeChatPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(1);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const pipelineStages = [
    { id: 1, title: 'Identity & Access Verification', detail: `Role: ${user?.role.toUpperCase()}` },
    { id: 2, title: 'Input Policy Check', detail: 'Validating safety and query scope' },
    { id: 3, title: 'Cache Lookup', detail: 'Checking cached responses' },
    { id: 4, title: 'Document Retrieval', detail: 'Retrieving role-authorized context chunks' },
    { id: 5, title: 'Relevance Scoring & Rerank', detail: 'Cross-encoder precision ranking' },
    { id: 6, title: 'Response Synthesis', detail: 'Generating answer strictly from verified sources' },
    { id: 7, title: 'Audit Trail Recording', detail: 'Logging query event' },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading || !user) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString(),
      roleAtQuery: user.role,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setLoadingStage(1);

    // Staged progress timers for telemetry demonstration
    const t1 = setTimeout(() => setLoadingStage(2), 250);
    const t2 = setTimeout(() => setLoadingStage(3), 600);
    const t3 = setTimeout(() => setLoadingStage(4), 1000);
    const t4 = setTimeout(() => setLoadingStage(5), 1500);
    const t5 = setTimeout(() => setLoadingStage(6), 2100);

    try {
      const response: ChatQueryResponse = await sendChatQuery(query);

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      setLoadingStage(7);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toISOString(),
        roleAtQuery: response.effective_role || response.role_used || user.role,
        responseMeta: {
          guardrail_status: response.guardrail_status,
          guardrail_reason: response.guardrail_reason,
          cache_hit: response.cache_hit,
          latency_ms: response.latency_ms,
          effective_role: response.effective_role || response.role_used || user.role,
          citations: response.citations || [],
          retrieved_chunk_ids: response.retrieved_chunk_ids || [],
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);

      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          err?.response?.data?.detail ||
          'Failed to execute query against RAG pipeline. Ensure backend is running.',
        timestamp: new Date().toISOString(),
        roleAtQuery: user.role,
        responseMeta: {
          guardrail_status: 'blocked_injection',
          guardrail_reason: 'Pipeline communication error',
          cache_hit: false,
          latency_ms: 0,
          effective_role: user.role,
          citations: [],
          retrieved_chunk_ids: [],
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setActiveCitation(null);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] animate-fade-in relative">
      {/* Workspace Header Strip */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-surface-container-high flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-on-surface leading-tight flex items-center gap-2">
            <span>Secure Employee Search & Chat</span>
            {user && <RoleBadge role={user.role} size="xs" variant="solid" />}
          </h1>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Search across company policies, technical documentation, and role-authorized data
          </p>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-container-highest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
              title="Clear current chat messages"
            >
              <RotateCcw className="w-3.5 h-3.5 text-on-surface-variant" />
              <span>Reset Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-5">
        {messages.length === 0 ? (
          /* Empty State / Welcome Screen */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                Enterprise Knowledge Base
              </h2>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                Ask any question. Answers are strictly grounded in documentation approved for your role (
                <strong className="text-on-surface">{user?.role.toUpperCase()}</strong>).
              </p>
            </div>

            {/* Suggested Prompt Chips */}
            <div className="w-full text-left pt-2">
              <RolePromptSuggestions onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
            </div>
          </div>
        ) : (
          /* Active Messages */
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSelectCitation={(cite) => setActiveCitation(cite)}
              />
            ))}

            {/* 7-Stage Pipeline Loading Skeleton */}
            {isLoading && (
              <div className="bg-white rounded-xl border border-primary/30 p-5 shadow-level-2 max-w-xl space-y-3 animate-fade-in mr-auto">
                <div className="flex items-center justify-between text-xs font-bold text-primary pb-2 border-b border-surface-container-high">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Processing query pipeline...</span>
                  </span>
                  <span className="font-mono text-[11px]">Stage {loadingStage}/7</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {pipelineStages.map((st) => {
                    const isDone = loadingStage > st.id;
                    const isCurrent = loadingStage === st.id;

                    return (
                      <div
                        key={st.id}
                        className={clsx(
                          'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all',
                          isCurrent
                            ? 'bg-primary/10 text-primary font-semibold'
                            : isDone
                            ? 'text-emerald-700 font-medium'
                            : 'text-on-surface-variant/50'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] flex-shrink-0">
                              {st.id}
                            </span>
                          )}
                          <span>{st.title}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-80">{st.detail}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Box & Suggested Chips Footer */}
      <div className="pt-3 border-t border-surface-container-high space-y-2.5 bg-surface-container-lowest flex-shrink-0">
        {messages.length > 0 && (
          <RolePromptSuggestions
            disabled={isLoading}
            onSelectPrompt={(prompt) => handleSendMessage(prompt)}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2 bg-white rounded-xl border border-surface-container-high p-2 shadow-level-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition-all duration-200"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={`Ask a question as ${user?.full_name || user?.role.toUpperCase()} (e.g. policies, salaries, AWS spend, pods)...`}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none leading-relaxed"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="btn-primary w-10 h-10 rounded-lg flex items-center justify-center p-0 flex-shrink-0 disabled:opacity-40"
            title="Send query (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-on-surface-variant px-2">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-[10px]">Enter</kbd> to query, <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-[10px]">Shift+Enter</kbd> for newline</span>
          <span className="font-mono text-emerald-700">Audit Enabled</span>
        </div>
      </div>

      {/* Slide-Over PDF Citation Inspection Drawer */}
      <PdfCitationDrawer
        citation={activeCitation}
        isOpen={Boolean(activeCitation)}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};

export default EmployeeChatPage;
