import React from 'react';

interface WelcomeNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeNoteModal: React.FC<WelcomeNoteModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-400">
              Developer Note
            </span>
            <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-zinc-950">
              Hi, I am Priyanshu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 text-base font-medium px-2 py-1 rounded-full hover:bg-zinc-100 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Intro */}
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
          In this project demo, I tried to solve <b>4 major headaches</b>  that enterprise RAG systems face when multiple departments share the same knowledge base. Here is a breakdown of each problem and my approach to solving it:
        </p>

        {/* Structured Problem & Approach List */}
        <div className="space-y-5 pt-1">
          {/* Point 1 */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">
              1. Prompts alone cannot reliably protect sensitive data
            </h3>
            <div className="space-y-1.5 pl-3.5 border-l-2 border-zinc-200">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">Problem:</span> Telling an AI "only answer if the user is authorized" can be bypassed with prompt injection, and filtering search results in application code is prone to bugs.
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">My Approach:</span> I enforced access control directly inside PostgreSQL using Row-Level Security (RLS). The database engine filters chunk rows before any search or retrieval happens, so unauthorized data never reaches the AI prompt.
              </p>
            </div>
          </div>

          {/* Point 2 */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">
              2. Permission updates take too long to take effect
            </h3>
            <div className="space-y-1.5 pl-3.5 border-l-2 border-zinc-200">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">Problem:</span> When an employee changes departments or leaves, standard JWT tokens stay valid for up to an hour, leaving a dangerous window where old permissions remain active.
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">My Approach:</span> I added a live role check in Redis. Whenever an admin updates someone's role, the very next query uses the new role in under a second without waiting for tokens to expire.
              </p>
            </div>
          </div>

          {/* Point 3 */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">
              3. Real enterprise PDFs mix public and private info across pages
            </h3>
            <div className="space-y-1.5 pl-3.5 border-l-2 border-zinc-200">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">Problem:</span> A single company handbook might have public holidays on page 1, but executive salaries or private roadmap notes on page 4. Treating whole documents with a single permission level leaks private sections.
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">My Approach:</span> I built a human-in-the-loop review tool. The system auto-tags sections with colored bounding boxes on the PDF, allowing an admin to visually inspect and adjust permissions for each section before chunks are embedded.
              </p>
            </div>
          </div>

          {/* Point 4 */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-950">
              4. Shared query caches accidentally leak answers across roles
            </h3>
            <div className="space-y-1.5 pl-3.5 border-l-2 border-zinc-200">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">Problem:</span> If an HR manager asks about compensation and that response gets cached, an intern asking the same question shouldn't receive the cached HR answer.
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-950">My Approach:</span> I strictly scoped every cache key by user role, ensuring each department operates within its own isolated cache partition.
              </p>
            </div>
          </div>
        </div>

        {/* Footer tip & action */}
        <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] sm:text-xs text-zinc-500 text-center sm:text-left leading-relaxed">
            Tip: Switch between personas in the top bar (like Priya - HR vs Arjun - Engineering) to test how document access and answers adapt in real time.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors shadow-xs flex-shrink-0"
          >
            Got it, explore demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeNoteModal;
