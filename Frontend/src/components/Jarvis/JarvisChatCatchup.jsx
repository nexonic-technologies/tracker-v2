import React, { useState } from 'react';
import { Sparkles, MessageSquare, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import jarvisService from '../../services/jarvisService.js';

export const JarvisChatCatchup = ({ conversationId }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleCatchup = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await jarvisService.summarizeMessages({ conversationId, limit: 30 });
      if (res.hasMessages && res.summary) {
        setSummary(res.summary);
        setExpanded(true);
      }
    } catch (err) {
      console.warn('[JarvisChatCatchup] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!conversationId) return null;

  return (
    <div className="px-3 py-1.5 border-b border-hairline bg-surface-1/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Jarvis Discussion Catch-Up</span>
        </div>

        <button
          type="button"
          onClick={summary ? () => setExpanded(!expanded) : handleCatchup}
          disabled={loading}
          className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
            </>
          ) : summary ? (
            expanded ? (
              <>
                Hide <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show Summary <ChevronDown className="w-3 h-3" />
              </>
            )
          ) : (
            <>
              ⚡ Catch Up <Sparkles className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {summary && expanded && (
        <div className="mt-2 p-2.5 rounded-lg bg-surface text-ink border border-cyan-500/30 shadow-sm text-xs space-y-1 animate-fade-in">
          <pre className="font-sans whitespace-pre-wrap leading-relaxed text-[11px] text-ink-muted">
            {summary}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JarvisChatCatchup;
