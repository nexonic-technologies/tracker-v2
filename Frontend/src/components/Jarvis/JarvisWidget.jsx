import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Bot, User, Check, AlertCircle, RefreshCw, Calendar, DollarSign, BookOpen, Bell, HelpCircle } from 'lucide-react';
import jarvisService from '../../services/jarvisService.js';
import JarvisOnboardingModal from './JarvisOnboardingModal.jsx';
import './jarvis.css';

export const JarvisWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Good day, sir. J.A.R.V.I.S. is online and at your service. How may I assist you across Workhub HRMS today?',
      t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const messagesEndRef = useRef(null);

  // Check onboarding on mount
  useEffect(() => {
    const onboarded = localStorage.getItem('jarvis_onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  // Global Keyboard Shortcut: Alt + Ctrl + J
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && (e.ctrlKey || e.metaKey)) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (customPrompt) => {
    const text = (customPrompt || input).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await jarvisService.chat({
        utterance: text,
        conversationHistory: history,
      });

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.response || 'Task completed, sir.',
        actionPayload: res.actionPayload,
        offlineResolved: res.offlineResolved,
        t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `My apologies, sir. An error occurred: ${err.response?.data?.error || err.message}`,
          isError: true,
          t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (tool, params) => {
    setLoading(true);
    try {
      const res = await jarvisService.executeAction({ tool, params });
      setMessages((prev) => [
        ...prev,
        {
          id: `confirmed_${Date.now()}`,
          role: 'assistant',
          content: `Action authorized and executed successfully, sir.`,
          actionPayload: { data: res.data },
          t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Execution failed: ${err.message}`,
          isError: true,
          t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Leave Balance', prompt: 'Check my leave balance', icon: Calendar },
    { label: 'Apply Leave', prompt: 'Apply for leave tomorrow', icon: Calendar },
    { label: 'Payslip', prompt: 'Show my latest payslip summary', icon: DollarSign },
    { label: 'WFH Policy', prompt: 'What is our WFH policy?', icon: BookOpen },
    { label: 'Notifications', prompt: 'Summarize my unread notifications', icon: Bell },
  ];

  return (
    <>
      {/* Floating Arc Reactor Dock Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="jarvis-floating-trigger"
          title="Open J.A.R.V.I.S. Assistant (Alt + Ctrl + J)"
          aria-label="Open Jarvis AI Assistant"
        >
          <div className="jarvis-reactor-core">
            <div className="jarvis-reactor-ring" />
            <div className="jarvis-reactor-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold tracking-wider text-[var(--brand-solid)]">JARVIS</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[var(--tracker-ink-muted)]">
            Alt+Ctrl+J
          </span>
        </button>
      )}

      {/* HUD Assistant Modal Window */}
      {isOpen && (
        <div className="jarvis-modal-overlay">
          <div className="jarvis-hud-window">
            {/* Header */}
            <div className="jarvis-hud-header">
              <div className="flex items-center gap-2.5">
                <div className="jarvis-reactor-core" style={{ width: 24, height: 24 }}>
                  <div className="jarvis-reactor-ring" />
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-[var(--brand-solid)] flex items-center gap-1.5">
                    J.A.R.V.I.S. CORE
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-[var(--tracker-ink-muted)]">Workhub Autonomous HR Agent</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="p-1.5 text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] rounded-lg hover:bg-[var(--tracker-surface-1)] transition-colors"
                  title="Guided Tour & Help"
                  aria-label="Guided Tour"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] rounded-lg hover:bg-[var(--tracker-surface-1)] transition-colors"
                  title="Close Assistant (Alt + Ctrl + J)"
                  aria-label="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="jarvis-messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === 'user' ? 'jarvis-bubble-user' : 'jarvis-bubble-assistant'}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px]">
                    <span className="font-semibold">{msg.role === 'user' ? 'You' : 'JARVIS'}</span>
                    <span>{msg.t}</span>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                  {/* Offline learning indicator */}
                  {msg.offlineResolved && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      ⚡ Resolved Offline (0 API Calls)
                    </div>
                  )}

                  {/* Confirmation Action Card */}
                  {msg.actionPayload?.requiresConfirmation && (
                    <div className="jarvis-action-card border-amber-500/40 bg-amber-500/10">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Confirmation Required</span>
                      </div>
                      <p className="text-[11px] text-[var(--tracker-ink-muted)] mb-3">
                        Action: <code>{msg.actionPayload.tool}</code>
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExecuteAction(msg.actionPayload.tool, msg.actionPayload.params)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Authorize & Execute
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="jarvis-bubble-assistant">
                  <div className="flex items-center gap-2 text-xs text-[var(--brand-solid)]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing cognitive reasoning...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips */}
            <div className="px-3 py-2 bg-[var(--tracker-surface)] border-t border-[var(--tracker-border-soft)] overflow-x-auto flex gap-1.5 scrollbar-hide">
              {quickPrompts.map((qp, i) => {
                const QIcon = qp.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.prompt)}
                    disabled={loading}
                    className="jarvis-chip flex items-center gap-1 whitespace-nowrap"
                  >
                    <QIcon className="w-3 h-3" />
                    <span>{qp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="jarvis-input-bar"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Jarvis anything about leaves, payslips, policies..."
                className="jarvis-input-field"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="jarvis-send-btn"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Guided Onboarding Modal */}
      <JarvisOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSelectSamplePrompt={(prompt) => {
          setIsOpen(true);
          handleSend(prompt);
        }}
      />
    </>
  );
};

export default JarvisWidget;
