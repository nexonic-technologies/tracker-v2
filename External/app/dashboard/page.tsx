'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { requestFirebaseToken } from '../firebase';
import TicketForm from '../../components/tickets/TicketForm';
import TicketView from '../../components/tickets/TicketView';
import NotificationDrawer from '../../components/Common/NotificationDrawer';
import { useGenericAPI } from '../useGenericAPI';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const { request, read } = useGenericAPI();

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTickets();
    setupPushNotifications();
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      const data = await read('notifications', { filter: { receiver: agentId } });
      if (data.success) {
        const list = data.data || [];
        const count = list.filter((n: any) => !(n.isRead || n.read)).length;
        setUnreadNotifCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const setupPushNotifications = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) return;

      const fcmToken = await requestFirebaseToken();
      if (!fcmToken) return;

      await request('auth/store-push-token', 'POST', { sessionId, fcmToken });
      console.log('FCM Token registered successfully');
    } catch (err) {
      console.error('Failed to setup push notifications:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      const agentId = localStorage.getItem('agentId');
      const data = await read('tickets', { filter: { createdBy: agentId } });
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await request('agent/logout', 'POST');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('agentToken');
      localStorage.removeItem('agentId');
      localStorage.removeItem('clientId');
      localStorage.removeItem('sessionId');
      router.push('/login');
    }
  };

  const getStatusChipClass = (status: string) => {
    const map: Record<string, string> = {
      'Open': 'lmx-chip-active',
      'In Progress': 'lmx-chip-inprogress',
      'Pending': 'lmx-chip-pending',
      'Closed': 'lmx-chip-closed',
      'Completed': 'lmx-chip-active',
      'Resolved': 'lmx-chip-active',
    };
    return map[status] || 'lmx-chip-closed';
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

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <nav className="lmx-topbar">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg lmx-gradient-hero flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-ink font-semibold text-[15px]">WorkHub</span>
            <span className="text-ink-subtle text-[13px] ml-2">Agent Portal</span>
          </div>
        </div>

        {/* Center menu links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[14px] font-bold text-accent border-b-2 border-accent pb-1 transition-colors"
          >
            Tickets
          </button>
          <button
            onClick={() => router.push('/feeds')}
            className="text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
          >
            Feeds
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeView === 'list' && (
            <button
              onClick={() => { setSelectedTicket(null); setActiveView('create'); }}
              className="lmx-btn-accent text-[13px] px-4 py-2"
            >
              + New Ticket
            </button>
          )}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="lmx-btn-ghost text-[13px] p-2 relative shrink-0"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white animate-pulse" />
            )}
          </button>
          <button onClick={handleLogout} className="lmx-btn-ghost text-[13px] px-3 py-2">
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Status Summary Counters */}
        {activeView === 'list' && !fetching && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-5 border border-hairline bg-surface rounded-tracker-lg transition-all hover:border-accent">
              <span className="text-[12px] font-bold text-ink-subtle uppercase tracking-wider block">Total Tickets</span>
              <p className="text-[28px] font-semibold text-ink mt-2 leading-none">{tickets.length}</p>
            </div>
            <div className="p-5 border border-hairline bg-surface rounded-tracker-lg transition-all hover:border-accent">
              <span className="text-[12px] font-bold text-ink-subtle uppercase tracking-wider block">Open</span>
              <p className="text-[28px] font-semibold text-emerald-500 mt-2 leading-none">
                {tickets.filter(t => t.status === 'Open').length}
              </p>
            </div>
            <div className="p-5 border border-hairline bg-surface rounded-tracker-lg transition-all hover:border-accent">
              <span className="text-[12px] font-bold text-ink-subtle uppercase tracking-wider block">In Progress</span>
              <p className="text-[28px] font-semibold text-blue-500 mt-2 leading-none">
                {tickets.filter(t => t.status === 'In Progress').length}
              </p>
            </div>
            <div className="p-5 border border-hairline bg-surface rounded-tracker-lg transition-all hover:border-accent">
              <span className="text-[12px] font-bold text-ink-subtle uppercase tracking-wider block">Resolved / Closed</span>
              <p className="text-[28px] font-semibold text-ink-muted mt-2 leading-none">
                {tickets.filter(t => ['Resolved', 'Closed', 'Completed'].includes(t.status)).length}
              </p>
            </div>
          </div>
        )}

        {/* View Routing Switch */}
        {activeView === 'list' && (
          <div>
            <div className="mb-6">
              <p className="lmx-eyebrow mb-1">SUPPORT TICKETS</p>
              <h2 className="text-[28px] font-semibold text-ink tracking-tight">My Tickets</h2>
            </div>

            {fetching ? (
              <div className="flex justify-center py-16">
                <div className="lmx-spinner" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="lmx-section-card-plain">
                <div className="lmx-empty-state">
                  <div className="lmx-empty-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 5v2" /><path d="M15 11v2" /><path d="M15 17v2" />
                      <path d="M5 5h14a2 2 0 0 1 1.36.51l.01.01A2 2 0 0 1 21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-ink mb-2">No tickets yet</h3>
                  <p className="text-[14px] text-ink-muted mb-6">Create your first support ticket to get started.</p>
                  <button onClick={() => { setSelectedTicket(null); setActiveView('create'); }} className="lmx-btn-accent">
                    Create Your First Ticket
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => router.push(`/tickets/${ticket._id || ticket.id}`)}
                    className="lmx-section-card cursor-pointer transition-all hover:border-accent"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-ink leading-snug">{ticket.title}</h3>
                        <p className="text-[13px] text-ink-muted mt-1 line-clamp-2">{ticket.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`lmx-chip ${getStatusChipClass(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <span className={`lmx-chip ${getPriorityChipClass(ticket.priority)}`}>
                            <span className="lmx-chip-dot" style={{ background: 'currentColor' }} />
                            {ticket.priority}
                          </span>
                          {ticket.category && (
                            <span className="lmx-chip" style={{ background: 'var(--lmx-surface-chip)', color: 'var(--lmx-ink-muted)' }}>
                              {ticket.category}
                            </span>
                          )}
                          {ticket.product && (
                            <span className="lmx-chip" style={{ background: 'var(--lmx-surface-chip)', color: 'var(--lmx-accent)' }}>
                              {ticket.product}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] text-ink-subtle">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'view' && selectedTicket && (
          <TicketView
            ticket={selectedTicket}
            onEdit={() => setActiveView('edit')}
            onBack={() => { setActiveView('list'); fetchTickets(); }}
          />
        )}

        {activeView === 'create' && (
          <TicketForm
            ticket={null}
            onSuccess={() => { fetchTickets(); setActiveView('list'); }}
            onCancel={() => setActiveView('list')}
          />
        )}

        {activeView === 'edit' && selectedTicket && (
          <TicketForm
            ticket={selectedTicket}
            onSuccess={() => { fetchTickets(); setActiveView('list'); setSelectedTicket(null); }}
            onCancel={() => setActiveView('view')}
          />
        )}
      </div>
      <NotificationDrawer isOpen={drawerOpen} setIsOpen={(val) => { setDrawerOpen(val); if (!val) fetchUnreadCount(); }} />
    </div>
  );
}