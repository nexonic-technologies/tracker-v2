'use client';

import { useState, useEffect } from 'react';
import FileViewerModal from '../Common/FileViewerModal';
import CommentThread from './CommentThread';

export default function TicketView({ ticket, onEdit, onBack }: any) {
  const [liveHours, setLiveHours] = useState(ticket.liveHours || 0);
  const [viewerFile, setViewerFile] = useState<any>(null);
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});

  const [activities, setActivities] = useState<any[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const token = localStorage.getItem('agentToken') || '';
        const res = await fetch('/api/populate/read/ticket_activity_logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filter: { ticketId: ticket._id || ticket.id },
            populateFields: { performedBy: 'basicInfo.firstName,basicInfo.lastName,name,firstName,lastName' },
            sort: { createdAt: -1 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setActivities(data.data);
          }
        }
      } catch (err) {
        console.error('Error fetching ticket activities:', err);
      }
    };

    fetchActivities();
  }, [ticket]);

  useEffect(() => {
    if (ticket.status !== 'Completed') {
      const startTime = new Date(ticket.startDate || ticket.createdAt);
      const currentTime = new Date();
      setLiveHours(Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)));

      const interval = setInterval(() => {
        const now = new Date();
        setLiveHours(Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)));
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [ticket]);

  useEffect(() => {
    const fetchstatus_configss = async () => {
      try {
        const token = localStorage.getItem('agentToken') || '';
        const res = await fetch('/api/status_configss', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ filter: { modelName: 'tickets' } })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const config = data.data[0];
            const colorsMap: Record<string, string> = {};
            if (config.metaStatuses) {
              config.metaStatuses.forEach((s: any) => colorsMap[s.label] = s.color);
            }
            if (config.workflowStatuses) {
              config.workflowStatuses.forEach((s: any) => colorsMap[s.label] = s.color);
            }
            setStatusColors(colorsMap);
          }
        }
      } catch (err) {
        console.error('Error fetching status configs:', err);
      }
    };

    fetchstatus_configss();
  }, []);

  const getStatusStyle = (status: string) => {
    const hexColor = statusColors[status];
    if (hexColor) {
      return {
        style: { backgroundColor: `${hexColor}20`, color: hexColor, borderColor: `${hexColor}40`, borderWidth: '1px' },
        className: 'lmx-chip'
      };
    }
    const map: Record<string, string> = {
      'Task Viewed': 'lmx-chip-inprogress',
      'Reviewed': 'lmx-chip-pending',
      'Moved to Development': 'lmx-chip-inprogress',
      'Waiting For approval': 'lmx-chip-pending',
      'Updated In staging': 'lmx-chip-inprogress',
      'Completed': 'lmx-chip-active',
    };
    return { style: {}, className: `lmx-chip ${map[status] || 'lmx-chip-closed'}` };
  };

  const getPriorityChipClass = (priority: string) => {
    const map: Record<string, string> = {
      'Critical': 'lmx-chip-critical',
      'High': 'lmx-chip-high',
      'Medium': 'lmx-chip-medium',
      'Low': 'lmx-chip-low',
    };
    return map[priority] || 'lmx-chip-medium';
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype?.startsWith('image/')) return '🖼️';
    if (mimetype?.startsWith('video/')) return '🎥';
    if (mimetype?.startsWith('audio/')) return '🎵';
    if (mimetype?.includes('pdf')) return '📄';
    if (mimetype?.includes('word') || mimetype?.includes('document')) return '📝';
    return '📎';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4">
      {/* Header card (Full width) */}
      <div className="lmx-section-card shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="lmx-eyebrow mb-1">TICKET DETAILS</p>
            <h2 className="text-[22px] font-semibold text-ink leading-tight">{ticket.title}</h2>
            <p className="text-[13px] text-ink-subtle mt-1">ID: {ticket.ticketId}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="lmx-btn-accent text-[13px] px-4 py-2">
              Edit
            </button>
            <button onClick={onBack} className="lmx-btn-secondary text-[13px] px-4 py-2">
              Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-2">

        {/* Left Column (Description, Attachments, Comments) */}
        <div className="lg:col-span-2 h-full overflow-y-auto pr-2 space-y-6">

          {/* Description */}
          <div className="lmx-section-card">
            <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Description (User Story)</h3>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'var(--lmx-surface-1)' }}>
              <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
                {ticket.description || '—'}
              </p>
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="lmx-section-card">
              <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-ink">Attachments</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ticket.attachments.map((attachment: any, index: number) => (
                  <div key={index} className="rounded-lg p-3 flex items-center gap-3" style={{ border: '1px solid var(--lmx-border)', background: 'var(--lmx-surface-0)' }}>
                    <span className="text-[22px]">{getFileIcon(attachment.mimetype)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">
                        {attachment.originalName || attachment.filename}
                      </p>
                      <p className="text-[11px] text-ink-subtle">
                        {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : ''}
                        {attachment.uploadedAt ? ` · ${new Date(attachment.uploadedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    {attachment.path && (
                      <button
                        onClick={() => setViewerFile(attachment)}
                        className="lmx-btn-ghost text-[11px] px-2 py-1 shrink-0"
                        style={{ color: 'var(--lmx-accent)' }}
                      >
                        View
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Thread */}
          <CommentThread ticketId={ticket._id || ticket.id || ticket.ticketId} />

        </div>

        {/* Right Column (Other Meta Data Sidebar) */}
        <div className="lg:col-span-1 h-full overflow-y-auto pr-2 space-y-6">

          {/* Ticket Details */}
          <div className="lmx-section-card">
            <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Ticket Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <span className="lmx-label">Product</span>
                <p className="text-[14px] text-ink font-medium">{ticket.product || '—'}</p>
              </div>
              <div>
                <span className="lmx-label">Type</span>
                <p className="text-[14px] text-ink font-medium">{ticket.type?.name || ticket.type || '—'}</p>
              </div>
              <div>
                <span className="lmx-label block mb-1">Priority</span>
                <span className={`lmx-chip ${getPriorityChipClass(ticket.priority)}`}>
                  <span className="lmx-chip-dot" style={{ background: 'currentColor' }} />
                  {ticket.priority}
                </span>
              </div>
              <div>
                <span className="lmx-label block mb-1">Status</span>
                {(() => {
                  const styleInfo = getStatusStyle(ticket.status);
                  return (
                    <span className={styleInfo.className} style={styleInfo.style}>
                      {ticket.status}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Timeline & Assignment */}
          <div className="lmx-section-card">
            <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-[18px] font-semibold text-ink">Timeline & Assignment</h3>
            </div>
            <div className="space-y-4">
              <div>
                <span className="lmx-label">Ticket Handler</span>
                <p className="text-[14px] text-ink font-medium">
                  {Array.isArray(ticket.assignedTo) && ticket.assignedTo[0]
                    ? `${ticket.assignedTo[0].basicInfo?.firstName || ''} ${ticket.assignedTo[0].basicInfo?.lastName || ''}`.trim() || ticket.assignedTo[0].name
                    : ticket.assignedTo?.name || '—'}
                </p>
              </div>
              <div>
                <span className="lmx-label">Start Date</span>
                <p className="text-[14px] text-ink font-medium">
                  {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span className="lmx-label">Due Date</span>
                <p className="text-[14px] text-ink font-medium">
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span className="lmx-label">Live Hours</span>
                <p className="text-[14px] font-semibold text-ink">{liveHours} hours</p>
              </div>
            </div>
          </div>

          {/* Creation Metadata */}
          <div className="lmx-section-card space-y-4">
            <div>
              <span className="lmx-label">Created By</span>
              <p className="text-[14px] text-ink font-medium">
                {ticket.createdBy
                  ? `${ticket.createdBy.basicInfo?.firstName || ''} ${ticket.createdBy.basicInfo?.lastName || ''}`.trim() || ticket.createdBy.name
                  : '—'}
              </p>
            </div>
            <div>
              <span className="lmx-label">Created At</span>
              <p className="text-[14px] text-ink font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="lmx-section-card">
            <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--lmx-border-soft)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--lmx-accent-light)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="text-[18px] font-semibold text-ink">Ticket Activity</h3>
              </div>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="lmx-btn-ghost text-[11px] px-2 py-1 flex items-center gap-1.5 cursor-pointer"
                title={sortAsc ? "Sort Descending (Latest first)" : "Sort Ascending (Oldest first)"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {sortAsc ? (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </>
                  ) : (
                    <>
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </>
                  )}
                </svg>
                {sortAsc ? 'Oldest First' : 'Latest First'}
              </button>
            </div>

            {activities.length === 0 ? (
              <p className="text-[13px] text-ink-muted py-2">No activities recorded for this ticket yet.</p>
            ) : (() => {
              const sorted = [...activities].sort((a, b) => {
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();
                return sortAsc ? timeA - timeB : timeB - timeA;
              });
              const displayed = showAllActivities ? sorted : sorted.slice(0, 3);
              return (
                <div className="space-y-4">
                  <div className="relative pl-6 border-l border-hairline space-y-6">
                    {displayed.map((activity, index) => {
                      const performerName = activity.performedBy?.name ||
                        (activity.performedBy?.basicInfo
                          ? `${activity.performedBy.basicInfo.firstName} ${activity.performedBy.basicInfo.lastName || ''}`.trim()
                          : 'System');

                      return (
                        <div key={activity._id || index} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-accent ring-4 ring-canvas" />

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="text-[13px] font-semibold text-ink">
                              {performerName} <span className="font-normal text-ink-muted">{activity.action}</span>
                            </span>
                            <span className="text-[11px] text-ink-subtle">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {activity.details && (
                            <div className="mt-1.5 text-[12px] text-ink-muted">
                              {activity.details.oldStatus && activity.details.newStatus && (
                                <p>Status changed from <span className="font-semibold">{activity.details.oldStatus}</span> to <span className="font-semibold text-accent">{activity.details.newStatus}</span></p>
                              )}
                              {activity.details.commentSnippet && (
                                <p className="italic">"{activity.details.commentSnippet}"</p>
                              )}
                              {activity.details.note && (
                                <p>{activity.details.note}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {activities.length > 3 && (
                    <button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className="text-[12px] text-accent font-semibold hover:underline block pt-2 cursor-pointer text-left w-full"
                    >
                      {showAllActivities ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

        </div>

      </div>

      {viewerFile && (
        <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </div>
  );
}