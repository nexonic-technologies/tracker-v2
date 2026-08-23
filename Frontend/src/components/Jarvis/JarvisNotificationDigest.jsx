import React, { useState } from 'react';
import { Sparkles, Check, ChevronDown, ChevronUp, AlertCircle, MessageSquare, Ticket, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jarvisService from '../../services/jarvisService.js';

export const JarvisNotificationDigest = ({ onActionExecuted }) => {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const navigate = useNavigate();

  const handleGenerateDigest = async () => {
    setLoading(true);
    try {
      const res = await jarvisService.getNotificationDigest();
      if (res.data) {
        setDigest(res.data);
        setExpanded(true);
      }
    } catch (err) {
      console.warn('[JarvisDigest] Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteQuickAction = async (item) => {
    setActionInProgress(item.notificationId);
    try {
      if (item.actionType === 'approve_regularization') {
        await jarvisService.executeAction({
          tool: 'notifications.batchApprove',
          params: { type: 'regularization', entityId: item.notificationId, receptionId: item.receptionId },
        });
      } else if (item.actionType === 'approve_leave') {
        await jarvisService.executeAction({
          tool: 'notifications.batchApprove',
          params: { type: 'leave', entityId: item.notificationId, receptionId: item.receptionId },
        });
      }

      // Remove from list or refresh
      if (onActionExecuted) onActionExecuted();
      handleGenerateDigest();
    } catch (err) {
      console.error('[JarvisDigest] Action error:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="mx-2 mb-2 p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] dark:border-[var(--brand-from)]/30 text-[var(--tracker-ink)] shadow-md transition-all">
      {/* Smart Trigger Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--brand-from)]/15 border border-[var(--brand-from)]/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-from)] dark:text-[var(--brand-teal)]" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--tracker-ink)]">Jarvis Action Digest</span>
            <p className="text-[10px] text-[var(--tracker-ink-muted)]">AI workflow cluster & 1-click approvals</p>
          </div>
        </div>

        <button
          onClick={digest ? () => setExpanded(!expanded) : handleGenerateDigest}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-teal)] text-[var(--tracker-on-brand)] hover:opacity-90 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
        >
          {loading ? (
            'Analyzing...'
          ) : digest ? (
            expanded ? (
              <>
                Collapse <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                View Digest <ChevronDown className="w-3 h-3" />
              </>
            )
          ) : (
            <>
              ⚡ Generate <Sparkles className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Digest Content */}
      {digest && expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--tracker-border-soft)] flex flex-col gap-2.5 animate-fade-in">
          {/* Single Unified AI Executive Briefing */}
          <div className="p-2.5 rounded-lg bg-[var(--tracker-surface-2)]/70 dark:bg-[var(--brand-from)]/10 border border-[var(--tracker-border)] dark:border-[var(--brand-from)]/30 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-from)] dark:text-[var(--brand-teal)] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[var(--tracker-ink)] leading-relaxed font-medium">
              {digest.summaryHeadline}
            </p>
          </div>

          {/* Actionable Approvals (Only rendered when real 1-click actions exist) */}
          {digest.clusters?.approvals?.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-500 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Requires Your Approval ({digest.clusters.approvals.length})
              </span>
              {digest.clusters.approvals.map((item) => (
                <div
                  key={item.notificationId}
                  className="p-2 rounded-lg bg-[var(--tracker-surface)] border border-amber-500/30 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-[var(--tracker-ink)] truncate">{item.title}</p>
                    <p className="text-[10px] text-[var(--tracker-ink-muted)] truncate">{item.message}</p>
                  </div>
                  <button
                    onClick={() => handleExecuteQuickAction(item)}
                    disabled={actionInProgress === item.notificationId}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors flex-shrink-0 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    {actionInProgress === item.notificationId ? 'Approving...' : item.actionLabel || 'Approve'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JarvisNotificationDigest;
