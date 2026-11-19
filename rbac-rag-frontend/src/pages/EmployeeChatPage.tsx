import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowUp,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Terminal,
  Lock,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatQueryResponse, CitationItem } from '../types/chat';
import { sendChatQuery } from '../api/chatApi';
import RoleBadge from '../components/common/RoleBadge';
import MessageBubble from '../components/chat/MessageBubble';
import RolePromptSuggestions, { SUGGESTED_PROMPTS } from '../components/chat/RolePromptSuggestions';
import PdfCitationDrawer from '../components/chat/PdfCitationDrawer';
import { clsx } from 'clsx';

export const EmployeeChatPage: React.FC = () => {
  const { user, isDemoSession } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<number>(1);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);
  const [showAllPrompts, setShowAllPrompts] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlusClick = () => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }

    if (user?.role !== 'admin' || isDemoSession) {
      setUploadNotice('Only admin can upload');
      noticeTimerRef.current = setTimeout(() => {
        setUploadNotice(null);
      }, 3500);
      return;
    }

    navigate('/admin/ingest');
  };

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
    <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-h-0 animate-fade-in relative">
      {messages.length === 0 ? (
        /* Empty State / Grok-Style Hero Screen */
        <div className="flex-1 flex flex-col items-center justify-between text-center p-2 max-w-2xl mx-auto w-full min-h-0">
          <div className="w-full my-auto flex flex-col items-center pt-2">
            {/* Centered Heading */}
            <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-zinc-900 mb-2">
              What would you like to search today?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mb-6 max-w-md mx-auto">
              Answers are strictly grounded in documentation approved for your role (
              <strong className="text-zinc-800 font-medium">{user?.role.toUpperCase()}</strong>).
            </p>

          {/* Centered Floating Pill Input Bar */}
          <div className="w-full relative">
            {uploadNotice && (
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-zinc-950 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in z-30 font-medium whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span>{uploadNotice}</span>
                <button
                  type="button"
                  onClick={() => setUploadNotice(null)}
                  className="text-zinc-400 hover:text-white ml-1 text-sm leading-none p-0.5 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="w-full rounded-full bg-white border border-zinc-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-within:border-zinc-300 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-2 pl-4 flex items-center justify-between gap-3 transition-all outline-none"
            >
              <button
                type="button"
                onClick={handlePlusClick}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex-shrink-0 cursor-pointer outline-none focus:outline-none"
                title="Add attachment"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                placeholder={`Ask, search documents, or test role boundaries...`}
                className="flex-1 bg-transparent text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none focus:shadow-none"
              />

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80 flex items-center gap-1 select-none">
                  <span>{user?.role.toUpperCase()}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </span>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-all flex-shrink-0 cursor-pointer outline-none focus:outline-none"
                  title="Send query"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Grok-Style Stacked Minimalist Prompt Suggestions */}
          {!showAllPrompts ? (
            <div className="w-full space-y-1">
              {SUGGESTED_PROMPTS.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(item.text)}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-left text-xs sm:text-sm text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70 transition-colors group"
                >
                  {item.iconType === 'file' && <FileText className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" />}
                  {item.iconType === 'terminal' && <Terminal className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" />}
                  {item.iconType === 'lock' && <Lock className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" />}
                  {item.iconType === 'chart' && <BarChart3 className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" />}
                  {item.iconType === 'alert' && <AlertCircle className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" />}
                  <span className="truncate flex-1">{item.text}</span>
                </button>
              ))}

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllPrompts(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 font-medium px-3 py-1 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  View all 12 suggested test prompts by role ⌵
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full text-left space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-500">All 12 Test Prompts:</span>
                <button
                  type="button"
                  onClick={() => setShowAllPrompts(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 font-medium px-2 py-0.5 rounded-full hover:bg-zinc-100"
                >
                  Show less ⌃
                </button>
              </div>
              <RolePromptSuggestions
                disabled={isLoading}
                onSelectPrompt={(prompt) => handleSendMessage(prompt)}
                defaultExpanded={true}
              />
            </div>
          )}
          </div>

          {/* Minimalist Disclaimer Footer */}
          <p className="text-xs text-zinc-400 text-center pb-1 flex-shrink-0">
            Enterprise RAG with dynamic RBAC. Answers strictly grounded in authorized documents.
          </p>
        </div>
      ) : (
        /* Active Conversation Screen */
        <div className="flex-1 flex flex-col min-h-0 h-full">
          {/* Streamlined Workspace Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/80 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-zinc-900">Enterprise Knowledge Base</h1>
              {user && <RoleBadge role={user.role} size="xs" variant="subtle" />}
            </div>

            <button
              type="button"
              onClick={handleClearChat}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
              title="Start a new conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Main Conversation Stream */}
          <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSelectCitation={(cite) => setActiveCitation(cite)}
              />
            ))}

            {/* 7-Stage Pipeline Loading Skeleton */}
            {isLoading && (
              <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs max-w-xl space-y-3 animate-fade-in mr-auto">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-900 pb-2 border-b border-zinc-100">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                    <span>Processing query pipeline...</span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">Stage {loadingStage}/7</span>
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
                            ? 'bg-zinc-100 text-zinc-900 font-medium'
                            : isDone
                            ? 'text-zinc-700'
                            : 'text-zinc-400'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-800 flex-shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 text-zinc-900 animate-spin flex-shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] flex-shrink-0">
                              {st.id}
                            </span>
                          )}
                          <span>{st.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">{st.detail}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Floating Pill Input Bar */}
          <div className="pt-2 border-t border-zinc-200/80 space-y-2 bg-white flex-shrink-0 relative">
            {uploadNotice && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-950 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in z-30 font-medium whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span>{uploadNotice}</span>
                <button
                  type="button"
                  onClick={() => setUploadNotice(null)}
                  className="text-zinc-400 hover:text-white ml-1 text-sm leading-none p-0.5 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            <RolePromptSuggestions
              disabled={isLoading}
              onSelectPrompt={(prompt) => handleSendMessage(prompt)}
              defaultExpanded={false}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="w-full rounded-full bg-white border border-zinc-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-within:border-zinc-300 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-2 pl-4 flex items-center justify-between gap-3 transition-all outline-none"
            >
              <button
                type="button"
                onClick={handlePlusClick}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex-shrink-0 cursor-pointer outline-none focus:outline-none"
                title="Add attachment"
              >
                <Plus className="w-4 h-4" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={`Ask a question as ${user?.role.toUpperCase()}...`}
                className="flex-1 resize-none bg-transparent text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 outline-none border-none ring-0 focus:outline-none focus:ring-0 focus:border-none shadow-none focus:shadow-none leading-relaxed py-1"
              />

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80 flex items-center gap-1 select-none">
                  <span>{user?.role.toUpperCase()}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </span>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-all flex-shrink-0 cursor-pointer outline-none focus:outline-none"
                  title="Send query (Enter)"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-[11px] text-zinc-400 pb-1">
              Enterprise RAG with dynamic RBAC. Answers strictly grounded in authorized documents.
            </div>
          </div>
        </div>
      )}

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
