'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import TicketView from '../../../components/tickets/TicketView';
import TicketForm from '../../../components/tickets/TicketForm';

import { useGenericAPI } from '../../useGenericAPI';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const { request, read } = useGenericAPI();

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (ticket) {
      document.title = `${ticket.ticketId || 'Ticket'} | ${ticket.title} - WorkHub Support`;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `${ticket.title} - ${ticket.description?.substring(0, 150)}`);
      }
    } else {
      document.title = "Ticket Details | WorkHub Support";
    }
  }, [ticket]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const data = await read('tickets', { id });
      if (data.success) {
        setTicket(data.data);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      {/* Top bar */}
      <nav className="lmx-topbar shrink-0">
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
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="lmx-btn-ghost text-[13px] px-3 py-2">
            Dashboard
          </button>
          <button onClick={handleLogout} className="lmx-btn-ghost text-[13px] px-3 py-2">
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[1200px] w-full mx-auto px-6 py-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="lmx-spinner" />
          </div>
        ) : !ticket ? (
          <div className="lmx-section-card-plain text-center py-16">
            <h3 className="text-[18px] font-semibold text-ink mb-2">Ticket Not Found</h3>
            <p className="text-[14px] text-ink-muted mb-6">The ticket you are looking for does not exist or you do not have permission to view it.</p>
            <button onClick={() => router.push('/dashboard')} className="lmx-btn-accent">
              Back to Dashboard
            </button>
          </div>
        ) : isEditing ? (
          <TicketForm
            ticket={ticket}
            onSuccess={() => { setIsEditing(false); fetchTicket(); }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <TicketView
            ticket={ticket}
            onEdit={() => setIsEditing(true)}
            onBack={() => router.push('/dashboard')}
          />
        )}
      </div>
    </div>
  );
}
