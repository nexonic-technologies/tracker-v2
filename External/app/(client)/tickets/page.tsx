'use client';

import { useState } from 'react';
import TicketForm from '../../../components/tickets/TicketForm';
import TicketList from '../../../components/tickets/TicketList';
import TicketView from '../../../components/tickets/TicketView';

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setActiveTab('view');
  };

  const handleEditTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setActiveTab('form');
  };

  const refreshTickets = () => {
    setActiveTab('list');
    setSelectedTicket(null);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <p className="lmx-eyebrow mb-1">SUPPORT TICKETS</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-[28px] font-semibold text-ink tracking-tight">Support Tickets</h1>
            {/* Tab bar */}
            <div className="lmx-tab-bar">
              <button
                onClick={() => setActiveTab('list')}
                className={activeTab === 'list' ? 'lmx-tab-active' : 'lmx-tab'}
              >
                Ticket List
              </button>
              <button
                onClick={() => { setActiveTab('form'); setSelectedTicket(null); }}
                className={activeTab === 'form' ? 'lmx-tab-active' : 'lmx-tab'}
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'list' && (
          <TicketList
            onViewTicket={handleViewTicket}
            onEditTicket={handleEditTicket}
          />
        )}

        {activeTab === 'form' && (
          <TicketForm
            ticket={selectedTicket}
            onSuccess={refreshTickets}
            onCancel={() => setActiveTab('list')}
          />
        )}

        {activeTab === 'view' && selectedTicket && (
          <TicketView
            ticket={selectedTicket}
            onEdit={() => handleEditTicket(selectedTicket)}
            onBack={() => setActiveTab('list')}
          />
        )}
      </div>
    </div>
  );
}