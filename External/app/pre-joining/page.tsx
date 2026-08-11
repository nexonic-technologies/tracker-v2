'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGenericAPI } from '../useGenericAPI';

function PreJoiningContent() {
  const searchParams = useSearchParams();
  const initialAppId = searchParams.get('applicationId') || '';

  const [applicationId, setApplicationId] = useState(initialAppId);
  const [email, setEmail] = useState('');
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    panNumber: '',
    aadharNumber: '',
    bankAccountNo: '',
    ifscCode: '',
    bankName: '',
    policyAgreed: false,
    bgvConsent: false
  });

  const { request } = useGenericAPI();

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!applicationId.trim()) return;
    setLoading(true);
    setSearchAttempted(true);

    try {
      // Lookup candidate using populate api
      const res = await request(
        `populate/read/candidates?filter=${encodeURIComponent(JSON.stringify({ applicationId: applicationId.trim() }))}&limit=1`,
        'GET'
      );
      if (res?.data && res.data.length > 0) {
        setCandidate(res.data[0]);
      } else {
        // Fallback match by last 4 chars if APP-2026 format
        const allRes = await request(`populate/read/candidates?limit=100`, 'GET');
        const match = allRes?.data?.find((c: any) => 
          c.applicationId === applicationId.trim() ||
          c._id?.slice(-4).toUpperCase() === applicationId.trim().replace('APP-2026-', '')
        );
        setCandidate(match || null);
      }
    } catch (err: any) {
      console.error('Error fetching candidate:', err);
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAppId) {
      handleLookup();
    }
  }, [initialAppId]);

  const handleConfirmJoining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.policyAgreed || !formData.bgvConsent) {
      alert('Please acknowledge the HR policies and BGV consent before confirming.');
      return;
    }
    setLoading(true);
    try {
      if (candidate?._id) {
        await request(
          `populate/update/candidates/${candidate._id}`,
          'PUT',
          {
            stage: 'Offered',
            preJoiningConfirmed: true,
            preJoiningConfirmedAt: new Date().toISOString(),
            stageNote: 'Pre-Joining Confirmation submitted via External Portal'
          },
          'Pre-Joining Confirmation submitted successfully!'
        );
      }
      setConfirmed(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit pre-joining confirmation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Header Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
            WH
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">WorkHub Portal</h1>
            <p className="text-xs text-emerald-400 font-medium">Candidate Pre-Joining Portal</p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs text-slate-400">Support Email</span>
          <p className="text-xs font-semibold text-slate-200">hr@company.com</p>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto w-full flex-1">
        {!candidate && !confirmed && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl max-w-xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                Pre-Joining Access
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">Access Your Joining Portal</h2>
              <p className="text-sm text-slate-400 mt-2">
                Enter your unique Application ID to view your job offer details, upload pre-joining documents, and confirm your joining.
              </p>
            </div>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Application ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APP-2026-8941"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Registered Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying Application ID...' : 'Access Portal →'}
              </button>
            </form>

            {searchAttempted && !candidate && !loading && (
              <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-center">
                No active candidate offer found for Application ID: <strong className="font-mono">{applicationId}</strong>. Please check your credentials or contact HR.
              </div>
            )}
          </div>
        )}

        {candidate && !confirmed && (
          <div className="space-y-6">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold tracking-wider uppercase">
                    Offer Status: {candidate.stage}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
                    Welcome, {candidate.firstName} {candidate.lastName || ''}!
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Application ID: <strong className="font-mono text-emerald-400">{candidate.applicationId || applicationId}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setCandidate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold self-start sm:self-auto cursor-pointer"
                >
                  Change Application ID
                </button>
              </div>
            </div>

            {/* Offer Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Target Joining Date</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {candidate.joiningDate ? new Date(candidate.joiningDate).toLocaleDateString() : 'To Be Confirmed'}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Offered Package (CTC)</span>
                <p className="text-xl font-bold text-white mt-1">
                  {candidate.offeredSalary ? `₹${Number(candidate.offeredSalary).toLocaleString('en-IN')}/year` : 'Standard Package'}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Email</span>
                <p className="text-sm font-semibold text-slate-200 mt-1 truncate">
                  {candidate.email}
                </p>
              </div>
            </div>

            {/* Pre-Joining Form */}
            <form onSubmit={handleConfirmJoining} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                  1. Identity & Payroll Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">PAN Card Number *</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 uppercase font-mono text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Aadhar Card Number (12 Digits) *</label>
                    <input
                      type="text"
                      placeholder="123456789012"
                      maxLength={12}
                      value={formData.aadharNumber}
                      onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 font-mono text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={formData.bankAccountNo}
                      onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bank IFSC Code *</label>
                    <input
                      type="text"
                      placeholder="SBIN0001234"
                      maxLength={11}
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 uppercase font-mono text-sm focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 mb-4">
                  2. Policy Disclosures & Background Check Consent
                </h3>
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.bgvConsent}
                      onChange={(e) => setFormData({ ...formData, bgvConsent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      I authorize WorkHub and its authorized background verification partners to perform educational qualification, past employment, and credential verification checks.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.policyAgreed}
                      onChange={(e) => setFormData({ ...formData, policyAgreed: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      I confirm that I have read and agree to comply with the Company HR Code of Conduct, Non-Disclosure Agreement (NDA), POSH Policy, and Information Security guidelines.
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl transition text-sm tracking-wide uppercase shadow-lg shadow-emerald-950/80 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Submitting Pre-Joining Confirmation...' : '→ Submit Pre - Joining Confirmation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {confirmed && (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-white">Pre-Joining Confirmation Received!</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Thank you for confirming your pre-joining details. Our HR team has been notified and will prepare your onboarding credentials and Day 1 welcome kit.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
              Application ID: <strong className="font-mono text-emerald-400">{candidate?.applicationId || applicationId}</strong>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 border-t border-slate-800 mt-12 text-xs text-slate-500">
        © 2026 WorkHub ERP Platform. Powered by Enterprise Candidate Experience.
      </footer>
    </div>
  );
}

export default function PreJoiningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Pre-Joining Portal...
      </div>
    }>
      <PreJoiningContent />
    </Suspense>
  );
}
