'use client';

import { useState, useEffect } from 'react';

export default function TicketList({ onViewTicket, onEditTicket }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusChipClass = (status: string) => {
    const map: Record<string, string> = {
      'Task Viewed': 'lmx-chip-inprogress',
      'Reviewed': 'lmx-chip-pending',
      'Moved to Development': 'lmx-chip-inprogress',
      'Waiting For approval': 'lmx-chip-pending',
      'Updated In staging': 'lmx-chip-inprogress',
      'Completed': 'lmx-chip-active',
    };
    return map[status] || 'lmx-chip-closed';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="lmx-spinner" />
      </div>
    );
  }

  return (
    <div className="lmx-table-wrapper">
      {/* Filters */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--lmx-border)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tickets…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lmx-input"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="lmx-select sm:w-[200px]"
          >
            <option value="">All Status</option>
            <option value="Task Viewed">Task Viewed</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Moved to Development">Moved to Development</option>
            <option value="Waiting For approval">Waiting For approval</option>
            <option value="Updated In staging">Updated In staging</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="lmx-table-header">
            <tr>
              <th>S. No</th>
              <th>Title</th>
              <th>Type</th>
              <th>Ticket Handler</th>
              <th>Description</th>
              <th>Start Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket, index) => (
              <tr key={ticket._id} className="lmx-table-row">
                <td className="text-ink-muted text-[13px]">{index + 1}</td>
                <td>
                  <div className="font-medium text-ink text-[14px]">{ticket.title}</div>
                  <div className="text-ink-subtle text-[12px] mt-0.5">{ticket.ticketId}</div>
                </td>
                <td className="text-[13px]">{ticket.type}</td>
                <td className="text-[13px]">{ticket.assignedTo?.name || '—'}</td>
                <td className="max-w-[200px] truncate text-[13px] text-ink-muted">{ticket.description}</td>
                <td className="text-[13px] text-ink-muted whitespace-nowrap">
                  {ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : '—'}
                </td>
                <td className="text-[13px] text-ink-muted whitespace-nowrap">
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                </td>
                <td>
                  <span className={`lmx-chip ${getStatusChipClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewTicket(ticket)}
                      className="lmx-btn-ghost text-[12px] px-2 py-1"
                      style={{ color: 'var(--lmx-accent)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEditTicket(ticket)}
                      className="lmx-btn-ghost text-[12px] px-2 py-1"
                      style={{ color: 'var(--lmx-brand-solid)' }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {filteredTickets.length === 0 && !loading && (
        <div className="lmx-empty-state">
          <div className="lmx-empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-[16px] font-semibold text-ink mb-1">No tickets found</h3>
          <p className="text-[13px] text-ink-muted">No tickets match your search criteria.</p>
        </div>
      )}
    </div>
  );
}