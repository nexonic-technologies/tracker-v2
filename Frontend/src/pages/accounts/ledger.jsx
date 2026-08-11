import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  CreditCard,
  Search,
  Plus,
  FileText,
  History,
  Lock,
  Unlock,
  Building2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ClientLedger = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    clients: [],
    ledgerEntries: [],
    allEntries: [],
    selectedClientId: '',
    loading: true,
    totalOutstanding: 0
  });
  const [period_closures, setperiod_closures] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'CR', 'DR'

  // Helper to check if a date is within a closed period
  const checkPeriodStatus = (date) => {
    if (!date) return { locked: false, closure: null };

    const targetDate = new Date(date);
    const closure = period_closures.find(c => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return targetDate >= start && targetDate <= end &&
        c.status === "Closed" &&
        c.modules?.quotations?.closed;
    });

    return { locked: !!closure, closure };
  };

  const fetchData = async (clientId = '') => {
    try {
      setData(prev => ({ ...prev, loading: true }));

      const [clientsRes, oasRes, paymentsRes, closuresRes] = await Promise.all([
        axiosInstance.post('/populate/read/clients', { limit: 1000, select: 'name _id' }),
        axiosInstance.post('/populate/read/orderacknowledgments', {
          filter: { status: 'Approved' },
          limit: 1000,
          populateFields: { clientId: 'name' }
        }),
        axiosInstance.post('/populate/read/payments', {
          filter: { status: 'Confirmed' },
          limit: 2000,
          populateFields: { clientId: 'name' }
        }),
        axiosInstance.post('/populate/read/period_closures', { limit: 1000, sort: { createdAt: -1 } })
      ]);

      const clients = clientsRes.data?.data || [];
      const oas = oasRes.data?.data || [];
      const payments = paymentsRes.data?.data || [];
      setperiod_closures(closuresRes.data?.data || []);

      // Build client ID -> Name lookup map as fallback
      const clientNameMap = {};
      clients.forEach(c => {
        if (c._id) clientNameMap[String(c._id)] = c.name;
      });

      const getClientName = (clientIdField) => {
        if (!clientIdField) return 'Unknown Client';
        if (typeof clientIdField === 'object' && clientIdField.name) {
          return clientIdField.name;
        }
        const idStr = String(typeof clientIdField === 'object' ? (clientIdField._id || clientIdField) : clientIdField);
        return clientNameMap[idStr] || 'Unknown Client';
      };

      // Process All Clients Summary
      const clientSummaries = clients.map(client => {
        const clientOAs = oas.filter(o => {
          const id = String(o.clientId?._id || o.clientId);
          return id === String(client._id);
        });
        const clientPayments = payments.filter(p => {
          const id = String(p.clientId?._id || p.clientId);
          return id === String(client._id);
        });

        const credit = clientOAs.reduce((sum, o) => sum + (o.committedPrice || 0), 0);
        const debit = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
          ...client,
          credit,
          debit,
          balance: credit - debit
        };
      }).filter(c => c.credit > 0 || c.debit > 0);

      // Process Consolidated Ledger
      const allEntries = [
        ...oas.map(o => ({
          date: o.createdAt,
          clientName: getClientName(o.clientId),
          clientId: String(o.clientId?._id || o.clientId),
          description: `OA: ${o.oaNumber}`,
          credit: o.committedPrice || 0,
          debit: 0,
          type: 'CR'
        })),
        ...payments.map(p => ({
          date: p.paymentDate,
          clientName: getClientName(p.clientId),
          clientId: String(p.clientId?._id || p.clientId),
          description: `Payment: ${p.referenceNo || 'Ref'}`,
          credit: 0,
          debit: p.amount || 0,
          type: 'DR'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Process Client Specific Ledger Entries with Running Balance
      let ledgerEntries = [];
      if (clientId) {
        const clientOAs = oas.filter(o => String(o.clientId?._id || o.clientId) === String(clientId));
        const clientPayments = payments.filter(p => String(p.clientId?._id || p.clientId) === String(clientId));

        const clientEntries = [
          ...clientOAs.map(o => ({
            date: o.createdAt,
            clientName: getClientName(o.clientId),
            clientId,
            description: `OA: ${o.oaNumber}`,
            credit: o.committedPrice || 0,
            debit: 0,
            type: 'CR'
          })),
          ...clientPayments.map(p => ({
            date: p.paymentDate,
            clientName: getClientName(p.clientId),
            clientId,
            description: `Payment: ${p.referenceNo || 'Ref'}`,
            credit: 0,
            debit: p.amount || 0,
            type: 'DR'
          }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        let runningBalance = 0;
        ledgerEntries = clientEntries.map(entry => {
          runningBalance += (entry.credit - entry.debit);
          return {
            ...entry,
            balance: runningBalance
          };
        }).reverse(); // Show newest on top for table view
      }

      const totalOutstanding = clientSummaries.reduce((sum, c) => sum + c.balance, 0);

      setData({
        clients: clientSummaries,
        ledgerEntries: ledgerEntries,
        allEntries,
        selectedClientId: clientId,
        loading: false,
        totalOutstanding
      });
    } catch (err) {
      toast.error('Failed to fetch financial data');
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute active displayed rows based on selected client, search term, and type filter
  const activeRows = useMemo(() => {
    let rows = data.selectedClientId ? data.ledgerEntries : data.allEntries;

    if (typeFilter !== 'ALL') {
      rows = rows.filter(r => r.type === typeFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        (r.clientName && r.clientName.toLowerCase().includes(term)) ||
        (r.description && r.description.toLowerCase().includes(term))
      );
    }

    return rows;
  }, [data.selectedClientId, data.ledgerEntries, data.allEntries, typeFilter, searchTerm]);

  const selectedClient = data.clients.find(c => c._id === data.selectedClientId);

  return (
    <div className="w-full space-y-3" data-module="project">

      {/* ─── UNIFIED SINGLE-CARD LEDGER WORKSPACE ─── */}
      <div className="bg-surface rounded-2xl border border-hairline shadow-xs overflow-hidden">

        {/* 1. Integrated Header Command Bar */}
        <div className="p-4 sm:p-5 border-b border-hairline-soft flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 dark:bg-zinc-900/40">
          <div>
            <p className="lmx-page-eyebrow mb-0.5">ACCOUNTS & FINANCE</p>
            <h1 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              Client Payment Ledger
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Consolidated commercial contracts, payment receipts, and balance tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Total Outstanding Metric Badge */}
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Outstanding:</span>
              <span className="text-base font-extrabold text-amber-800 dark:text-amber-300">
                ₹{(selectedClient ? selectedClient.balance : data.totalOutstanding).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => navigate('/accounts/payments')}
              className="tracker-btn-brand text-xs px-4 py-2 flex items-center gap-2 cursor-pointer font-bold shadow-xs"
            >
              <Plus size={15} /> Record Payment
            </button>
          </div>
        </div>

        {/* 2. Integrated Filter & Search Toolbar (Single Control Bar) */}
        <div className="p-3 sm:p-4 border-b border-hairline-soft flex items-center justify-between flex-wrap gap-3 bg-surface">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">

            {/* Client Selector Dropdown */}
            <div className="relative min-w-[220px]">
              <select
                value={data.selectedClientId}
                onChange={(e) => fetchData(e.target.value)}
                className="lmx-input h-9 text-xs font-bold focus:ring-2 focus:ring-brand focus:outline-none"
              >
                <option value="">All Clients (Consolidated)</option>
                {data.clients.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.balance > 0 ? `(₹${c.balance.toLocaleString('en-IN')})` : '✓'}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" size={14} />
              <input
                type="text"
                placeholder="Search by client name, transaction description, OA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 h-9 bg-surface border border-hairline rounded-lg text-xs focus:ring-2 ring-brand/20 outline-none"
              />
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-lg border border-hairline-soft">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${typeFilter === 'ALL' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('CR')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${typeFilter === 'CR' ? 'bg-surface text-amber-700 dark:text-amber-300 shadow-xs' : 'text-ink-muted hover:text-ink'}`}
            >
              <ArrowUpRight size={12} /> Billed (CR)
            </button>
            <button
              onClick={() => setTypeFilter('DR')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${typeFilter === 'DR' ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-ink-muted hover:text-ink'}`}
            >
              <ArrowDownLeft size={12} /> Paid (DR)
            </button>
          </div>
        </div>

        {/* 3. Unified Full-Width High-Density Transaction Table */}
        <div className="overflow-x-auto min-h-[380px]">
          {data.loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
              <div className="h-6 w-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-ink-subtle font-medium">Loading ledger transactions...</span>
            </div>
          ) : activeRows.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <FileText className="h-8 w-8 mx-auto text-slate-300 dark:text-zinc-700" />
              <p className="text-xs font-semibold text-ink-muted">No transaction entries found for the selected filter.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/40 text-[10px] font-bold text-ink-subtle uppercase tracking-wider border-b border-hairline-soft">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Client Company</th>
                  <th className="px-4 py-2.5">Transaction Detail</th>
                  <th className="px-4 py-2.5 text-center">Type</th>
                  <th className="px-4 py-2.5 text-right">Credit / Billed (₹)</th>
                  <th className="px-4 py-2.5 text-right">Debit / Paid (₹)</th>
                  {data.selectedClientId && <th className="px-4 py-2.5 text-right">Running Balance (₹)</th>}
                  <th className="px-4 py-2.5">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft text-xs">
                {activeRows.map((entry, idx) => {
                  const periodStatus = checkPeriodStatus(entry.date);
                  const isPayment = entry.type === 'DR';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-ink-muted whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-ink whitespace-nowrap">
                        {entry.clientName}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-ink">
                        {entry.description}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        {isPayment ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/40">
                            <ArrowDownLeft size={10} /> PAYMENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                            <ArrowUpRight size={10} /> INVOICE / OA
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-ink whitespace-nowrap">
                        {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      {data.selectedClientId && (
                        <td className="px-4 py-2.5 text-right font-extrabold text-ink whitespace-nowrap">
                          ₹{(entry.balance || 0).toLocaleString('en-IN')}
                        </td>
                      )}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {periodStatus.locked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
                            <Lock size={10} /> Period Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            <Unlock size={10} /> Open
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};

export default ClientLedger;
