'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AgentSetupForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [agent, setAgent] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/agent-invite/verify-token/${token}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setAgent(data.agent);
      } else {
        setError(data.message || 'Invalid or expired invitation');
      }
    } catch (error: any) {
      console.error('Verify token error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(`Failed to verify invitation: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/agent-invite/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          token,
          password
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to set password');
      }
    } catch (error: any) {
      console.error('Set password error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(`Failed to set password: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="lmx-spinner" />
      </div>
    );
  }

  // Error state (no agent loaded)
  if (error && !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="lmx-section-card-plain max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--lmx-error-light)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-ink mb-2">Invalid Invitation</h1>
          <p className="text-[14px] text-ink-muted leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="lmx-section-card-plain max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--lmx-success-light)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--lmx-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold text-ink mb-2">Password Set Successfully!</h1>
          <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
            Your password has been set. You can now login to the support portal.
          </p>
          <a href="/login" className="lmx-btn-brand inline-block w-full text-center">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="lmx-section-card-plain max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] lmx-gradient-hero flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
          <p className="lmx-eyebrow mb-2">ACCOUNT SETUP</p>
          <h1 className="text-[22px] font-semibold text-ink">Set Your Password</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Welcome {agent?.name}! Please set your password to access the support portal.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
            style={{
              background: 'var(--lmx-error-light)',
              border: '1px solid var(--lmx-error)',
              color: 'var(--lmx-ink)',
            }}
          >
            <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--lmx-error)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="lmx-label">Email</label>
            <input
              type="email"
              value={agent?.email || ''}
              disabled
              className="lmx-input opacity-60 cursor-not-allowed"
              style={{ background: 'var(--lmx-surface-1)' }}
            />
          </div>

          <div>
            <label htmlFor="setup-password" className="lmx-label">New Password</label>
            <input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="lmx-input"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label htmlFor="setup-confirm" className="lmx-label">Confirm Password</label>
            <input
              id="setup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="lmx-input"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="lmx-btn-brand w-full"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting Password…
              </span>
            ) : (
              'Set Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AgentSetup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="lmx-spinner" />
      </div>
    }>
      <AgentSetupForm />
    </Suspense>
  );
}