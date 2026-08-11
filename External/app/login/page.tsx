'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGenericAPI } from '../useGenericAPI';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { request } = useGenericAPI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await request('agent/login', 'POST', formData);

      if (data.success) {
        localStorage.setItem('agentToken', data.token);
        localStorage.setItem('agentId', data.agentId);
        localStorage.setItem('clientId', data.clientId);
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        router.push('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand gradient panel */}
      <div className="hidden lg:flex lg:w-[480px] lmx-gradient-hero flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* Logo area */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[10px] bg-white/15 border border-white/25 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-white/90 font-semibold text-lg tracking-tight">WorkHub</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-white text-[34px] font-bold leading-tight tracking-tight mb-3">
            Support Portal
          </h1>
          <p className="text-white/65 text-[15px] leading-relaxed max-w-[340px]">
            Track your tickets, monitor progress, and communicate with our team — all in one place.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs tracking-[1.5px] uppercase font-medium">
            Powered by WorkHub
          </p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-[10px] lmx-gradient-hero flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-ink font-semibold text-lg tracking-tight">WorkHub</span>
          </div>

          <div className="mb-8">
            <p className="lmx-eyebrow mb-2">SUPPORT TICKETS</p>
            <h2 className="text-[28px] font-semibold text-ink tracking-tight leading-tight">
              Agent Portal Login
            </h2>
            <p className="mt-2 text-[14px] text-ink-muted">
              Sign in to access your client ticket dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
                style={{
                  background: 'var(--lmx-error-light)',
                  border: '1px solid var(--lmx-error)',
                  color: 'var(--lmx-ink)',
                }}
              >
                <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--lmx-error)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="lmx-label">Email Address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="lmx-input"
                placeholder="agent@company.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="lmx-label">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="lmx-input"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lmx-btn-brand w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}