import React, { useState } from 'react';
import { Sparkles, Wand2, Check, RefreshCw } from 'lucide-react';
import jarvisService from '../../services/jarvisService.js';

export const JarvisTicketAssist = ({ title, description, priority, client, category, onApply }) => {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const handleAssist = async () => {
    if (!title && !description) return;
    setLoading(true);
    try {
      const res = await jarvisService.getTicketAssist({
        rawTitle: title,
        rawDescription: description,
        priority,
        client,
        category,
      });
      if (res.success) {
        setSuggestion(res);
      }
    } catch (err) {
      console.warn('[JarvisTicketAssist] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (suggestion && onApply) {
      onApply({
        title: suggestion.refinedTitle || title,
        description: suggestion.formattedDescription || description,
        priority: suggestion.suggestedPriority || priority,
        type: suggestion.suggestedType,
      });
      setSuggestion(null);
    }
  };

  return (
    <div className="my-2">
      {!suggestion ? (
        <button
          type="button"
          onClick={handleAssist}
          disabled={loading || (!title && !description)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Structuring Issue...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Draft with Jarvis AI
            </>
          )}
        </button>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-slate-100 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Jarvis AI Ticket Proposal
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Apply Proposal
              </button>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:text-white text-xs font-medium"
              >
                Discard
              </button>
            </div>
          </div>

          <div className="text-xs space-y-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 font-medium">Refined Title:</span>
              <p className="font-semibold text-white mt-0.5">{suggestion.refinedTitle}</p>
            </div>
            {suggestion.suggestedPriority && (
              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                Suggested Priority: {suggestion.suggestedPriority}
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium">Formatted Description:</span>
              <pre className="text-[11px] font-mono text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {suggestion.formattedDescription}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JarvisTicketAssist;
