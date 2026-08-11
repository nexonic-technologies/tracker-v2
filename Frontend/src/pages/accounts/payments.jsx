import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { 
  CreditCard, 
  User, 
  DollarSign, 
  Calendar, 
  FileText,
  CheckCircle2,
  Lock,
  TrendingDown,
  Receipt,
  Plus,
  Building2,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmtCurrency = (num) => {
  const val = Number(num) || 0;
  return `₹${val.toLocaleString('en-IN')}`;
};

const RecordPayment = () => {
  const navigate = useNavigate();
  const clientSelectRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingClientData, setFetchingClientData] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);

  // Selected client ledger details
  const [clientFinancials, setClientFinancials] = useState({
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
    recentPayments: []
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    paymentDate: todayStr,
    paymentMethod: 'Bank Transfer',
    referenceNo: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axiosInstance.post('/populate/read/clients', { 
        limit: 1000, 
        select: 'name _id Status' 
      });
      setClients(response.data?.data || []);
    } catch (err) {
      toast.error('Failed to load clients list');
    }
  };

  useEffect(() => {
    if (!formData.clientId) {
      setClientFinancials({
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
        recentPayments: []
      });
      return;
    }

    const fetchClientLedger = async () => {
      setFetchingClientData(true);
      try {
        const [oasRes, paymentsRes] = await Promise.all([
          axiosInstance.post('/populate/read/orderacknowledgments', {
            filter: { clientId: formData.clientId, status: 'Approved' },
            limit: 1000
          }),
          axiosInstance.post('/populate/read/payments', {
            filter: { clientId: formData.clientId, status: 'Confirmed' },
            limit: 1000,
            sort: { createdAt: -1 }
          })
        ]);

        const oas = oasRes.data?.data || [];
        const payments = paymentsRes.data?.data || [];

        const totalBilled = oas.reduce((sum, o) => sum + (o.committedPrice || 0), 0);
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const outstanding = totalBilled - totalPaid;

        setClientFinancials({
          totalBilled,
          totalPaid,
          outstanding,
          recentPayments: payments.slice(0, 4)
        });
      } catch (err) {
        console.error('Error fetching client ledger:', err);
      } finally {
        setFetchingClientData(false);
      }
    };

    fetchClientLedger();
  }, [formData.clientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      return toast.error('Please select a client company');
    }
    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      return toast.error('Please enter a valid payment amount greater than ₹0');
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post('/populate/create/payments', {
        ...formData,
        amount: numAmount,
        status: 'Confirmed',
        paymentDate: todayStr
      });

      const newRecord = res.data?.data || formData;
      const selectedClientObj = clients.find(c => c._id === formData.clientId);
      const clientName = selectedClientObj?.name || 'Client';

      const prevBal = clientFinancials.outstanding;
      const newBal = prevBal - numAmount;

      toast.success(`Payment of ${fmtCurrency(numAmount)} recorded for ${clientName}!`);

      setSubmittedRecord({
        ...newRecord,
        clientName,
        amount: numAmount,
        prevBalance: prevBal,
        newBalance: newBal,
        date: todayStr
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording payment entry');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNewEntry = () => {
    setSubmittedRecord(null);
    setFormData({
      clientId: '',
      amount: '',
      paymentDate: todayStr,
      paymentMethod: 'Bank Transfer',
      referenceNo: '',
      notes: ''
    });
    setTimeout(() => {
      clientSelectRef.current?.focus();
    }, 100);
  };

  const amountNumber = Number(formData.amount) || 0;
  const simulatedNewBalance = clientFinancials.outstanding - amountNumber;

  return (
    <div className="w-full space-y-4" data-module="payroll">
      
      {/* ─── PAGE TITLE TOOLBAR ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-hairline-soft">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">ACCOUNTS & LEDGER</p>
          <h1 className="text-lg sm:text-xl font-bold text-ink tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand" />
            Client Payment Entry Terminal
          </h1>
        </div>

        <button
          onClick={() => navigate('/accounts/ledger')}
          className="tracker-btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer font-semibold"
        >
          View Full Ledger
        </button>
      </div>

      {/* ─── WORKSPACE CONTENT GRID (Reduced Width 6:6 Split) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* LEFT COLUMN: TALLER, NARROWER VERTICAL FORM (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          {submittedRecord ? (
            /* Immediate Entry Confirmation Card */
            <div className="bg-surface rounded-2xl border border-emerald-200/60 dark:border-emerald-950/40 p-6 shadow-xs space-y-5 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Payment Recorded & Posted to Ledger</h3>
                  <p className="text-xs text-ink-muted">Transaction logged for {submittedRecord.clientName} on {submittedRecord.date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-ink-subtle uppercase block mb-0.5">Amount Paid</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{fmtCurrency(submittedRecord.amount)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-subtle uppercase block mb-0.5">Payment Method</span>
                  <span className="font-semibold text-ink">{submittedRecord.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-subtle uppercase block mb-0.5">New Outstanding</span>
                  <span className="text-xs font-bold text-ink">{fmtCurrency(submittedRecord.newBalance)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleResetForNewEntry}
                  className="tracker-btn-brand text-xs px-4 py-2.5 flex-1 flex items-center justify-center gap-2 cursor-pointer font-bold"
                >
                  <Plus size={15} /> Record Next Payment
                </button>
                <button
                  onClick={() => navigate('/accounts/ledger')}
                  className="tracker-btn-secondary text-xs px-4 py-2.5 flex-1 flex items-center justify-center gap-2 cursor-pointer font-semibold"
                >
                  View Ledger Details
                </button>
              </div>
            </div>
          ) : (
            /* TALL VERTICAL Payment Form */
            <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-hairline p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
                <h2 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={15} className="text-brand" />
                  New Transaction Details
                </h2>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/40 flex items-center gap-1">
                  <Lock size={9} /> Date: Today ({todayStr})
                </span>
              </div>

              {/* Stacked Vertical Fields for Taller Aspect Ratio */}
              <div className="space-y-3.5">
                {/* 1. Client Company Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-brand" />
                    1. Company / Client <span className="text-rose-500">*</span>
                  </label>
                  <select
                    ref={clientSelectRef}
                    tabIndex={1}
                    className="lmx-input h-11 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-brand focus:outline-none"
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    required
                  >
                    <option value="">Select Company...</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.Status === 'Active' ? '✓' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Amount Received */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={13} className="text-brand" />
                    2. Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    tabIndex={2}
                    type="number"
                    step="any"
                    className="lmx-input h-11 text-base font-extrabold text-brand focus:ring-2 focus:ring-brand focus:outline-none"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                {/* 3. Payment Method */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={13} className="text-brand" />
                    3. Payment Method
                  </label>
                  <select
                    tabIndex={3}
                    className="lmx-input h-11 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand focus:outline-none"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Online">Online / UPI</option>
                    <option value="Check">Check / Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* 4. Payment Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand" />
                    4. Date Posted
                  </label>
                  <input
                    tabIndex={4}
                    type="text"
                    className="lmx-input h-11 bg-slate-100 dark:bg-zinc-800/60 text-ink-muted cursor-not-allowed font-medium text-xs select-none"
                    value={todayStr}
                    readOnly
                    disabled
                  />
                </div>

                {/* 5. Reference Number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-brand" />
                    5. Reference / Transaction ID
                  </label>
                  <input
                    tabIndex={5}
                    type="text"
                    className="lmx-input h-11 text-xs sm:text-sm focus:ring-2 focus:ring-brand focus:outline-none"
                    placeholder="e.g. NEFT-991202 or CHQ-4401"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))}
                  />
                </div>

                {/* 6. Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} className="text-brand" />
                    6. Internal Ledger Notes
                  </label>
                  <textarea
                    tabIndex={6}
                    className="lmx-input min-h-[75px] py-2 text-xs sm:text-sm focus:ring-2 focus:ring-brand focus:outline-none"
                    placeholder="Optional remarks or invoice reference numbers..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  tabIndex={8}
                  type="button"
                  onClick={() => navigate('/accounts/ledger')}
                  className="tracker-btn-secondary py-2.5 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  tabIndex={7}
                  type="submit"
                  disabled={loading}
                  className="tracker-btn-brand py-2.5 px-6 text-xs sm:text-sm font-bold flex-1 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Posting Entry...' : (
                    <>
                      <CheckCircle2 size={16} />
                      Post Payment & Update Balance
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* RIGHT COLUMN: CLIENT LEDGER (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="bg-surface rounded-2xl border border-hairline p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-soft">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Receipt size={15} className="text-brand" />
                Client Ledger
              </h3>
              {fetchingClientData && (
                <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {!formData.clientId ? (
              <div className="py-12 text-center text-ink-subtle space-y-2">
                <User className="h-9 w-9 mx-auto text-slate-300 dark:text-zinc-700" />
                <p className="text-xs font-medium">Select a company from the left to view ledger position & balance calculator.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 2 Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                    <span className="text-[10px] font-bold text-ink-subtle uppercase block mb-0.5">Total Billed</span>
                    <span className="text-sm font-extrabold text-ink">{fmtCurrency(clientFinancials.totalBilled)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40">
                    <span className="text-[10px] font-bold text-ink-subtle uppercase block mb-0.5">Total Received</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{fmtCurrency(clientFinancials.totalPaid)}</span>
                  </div>
                </div>

                {/* Current Outstanding Debt */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase block mb-0.5">Current Outstanding Balance</span>
                  <span className="text-xl font-black text-amber-800 dark:text-amber-300">{fmtCurrency(clientFinancials.outstanding)}</span>
                </div>

                {/* Live Entry Impact Calculator */}
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Balance Impact</span>
                    <TrendingDown className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Current Debt:</span>
                      <span className="font-semibold">{fmtCurrency(clientFinancials.outstanding)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Payment Entry:</span>
                      <span>- {fmtCurrency(amountNumber)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800 text-white">
                      <span>New Resulting Debt:</span>
                      <span className={simulatedNewBalance < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {fmtCurrency(Math.max(0, simulatedNewBalance))}
                        {simulatedNewBalance < 0 && ' (Overpaid)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Payments List */}
                {clientFinancials.recentPayments.length > 0 && (
                  <div className="pt-1 space-y-2">
                    <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider block">Recent Payments</span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {clientFinancials.recentPayments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-1/50">
                          <div>
                            <span className="font-bold text-ink">{fmtCurrency(p.amount)}</span>
                            <span className="text-[10px] text-ink-subtle block">{p.paymentMethod} &middot; {p.paymentDate?.split('T')[0]}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            Confirmed
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default RecordPayment;
