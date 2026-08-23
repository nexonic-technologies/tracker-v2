import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Bot, Clock, CheckCircle2, MessageSquare, RefreshCw, Layers } from "lucide-react";
import api from "../../api/axiosInstance";

export default function JarvisFeedSummarizer({ posts = [] }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateSummary = async () => {
    if (!posts || posts.length === 0) {
      setError("No recent feed posts available to summarize.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build condensed feed context
      const condensedPosts = posts.slice(0, 15).map((p) => ({
        author: p.author?.basicInfo?.firstName ? `${p.author.basicInfo.firstName} ${p.author.basicInfo.lastName || ''}`.trim() : (p.author?.name || 'Team Member'),
        subject: p.subject || 'Update',
        type: p.postType || 'General',
        content: (p.content || '').replace(/<[^>]*>?/gm, '').slice(0, 200),
        date: p.createdAt,
      }));

      const prompt = `Summarize the following recent company feed updates into:
1. Top 3 High-Priority Bullet Points (Announcements, Blockers, Project Milestones)
2. Key Team Action Items & Mentions
3. Overall Mood/Theme

Feed Updates:
${JSON.stringify(condensedPosts, null, 2)}`;

      const res = await api.post("/jarvis/chat", {
        utterance: prompt,
      });

      if (res.data?.success && res.data.response) {
        setSummary(res.data.response);
        setExpanded(true);
      } else {
        throw new Error(res.data?.error || "Failed to generate feed summary");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to summarize feed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-xl border border-[#6c3de8]/20 bg-gradient-to-r from-[#6c3de8]/5 via-[var(--tracker-surface)] to-[#0ea5e9]/5 p-3.5 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6c3de8] to-[#0ea5e9] text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[var(--tracker-ink)]">
                J.A.R.V.I.S. Feed Catch-Up
              </h3>
              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-[#6c3de8]/10 text-[#6c3de8]">
                AI Digest
              </span>
            </div>
            <p className="text-[11px] text-[var(--tracker-ink-muted)]">
              {posts.length} recent posts available &bull; Get instant bullet points of company news &amp; announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!summary ? (
            <button
              onClick={handleGenerateSummary}
              disabled={loading || posts.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#6c3de8] to-[#8b5cf6] hover:opacity-95 text-white shadow-xs transition-all disabled:opacity-40"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Summarizing Feed...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Catch Up on Feed
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGenerateSummary}
                disabled={loading}
                className="p-1.5 rounded-md border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors text-xs"
                title="Refresh Summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#6c3de8]" : ""}`} />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-md border border-[var(--tracker-border)] bg-[var(--tracker-surface)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-colors text-xs"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Summary Content Body */}
      {summary && expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--tracker-border-soft)] space-y-2 animate-fade-in">
          <div className="p-3 rounded-lg bg-[var(--tracker-surface)] border border-[var(--tracker-border-soft)] text-xs text-[var(--tracker-ink)] leading-relaxed whitespace-pre-wrap select-text">
            {summary}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--tracker-ink-muted)] pt-1 px-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Synthesized from {Math.min(posts.length, 15)} posts
            </span>
            <button
              onClick={() => setSummary(null)}
              className="text-[var(--tracker-ink-subtle)] hover:text-red-500 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
