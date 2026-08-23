import React, { useState } from 'react';
import { Sparkles, Calendar, DollarSign, BookOpen, Bell, ArrowRight, Check, X } from 'lucide-react';

export const JarvisOnboardingModal = ({ isOpen, onClose, onSelectSamplePrompt }) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const stepsData = [
    {
      step: 1,
      title: 'Welcome to J.A.R.V.I.S. AI',
      subtitle: 'Your personal, self-learning HRMS & Operations Assistant.',
      icon: Sparkles,
      color: 'linear-gradient(135deg, #6c3de8 0%, #8b5cf6 100%)',
      description:
        'Jarvis learns your company vocabulary, common workflows, and policies over time — executing repeat tasks faster and offline.',
      highlights: [
        { label: 'Leave Balances & Direct Applications', icon: Calendar },
        { label: 'Payslip Breakdowns & Compensation Insights', icon: DollarSign },
        { label: 'Instant HR Policy Lookups', icon: BookOpen },
        { label: 'Actionable Notification Digests', icon: Bell },
      ],
    },
    {
      step: 2,
      title: 'Natural Language HR Capabilities',
      subtitle: 'Ask naturally just like speaking to a team assistant.',
      icon: Calendar,
      color: 'linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 100%)',
      description: 'Click any sample prompt below to try it out immediately:',
      prompts: [
        'How many leaves do I have left?',
        'Apply for sick leave tomorrow',
        'Show my latest payslip summary',
        'What is our Work From Home (WFH) policy?',
        'Summarize my unread notifications',
      ],
    },
    {
      step: 3,
      title: 'Universal Shortcuts & Security',
      subtitle: 'Accessible anywhere in Workhub at your fingertips.',
      icon: Sparkles,
      color: 'linear-gradient(135deg, #6c3de8 0%, #0ea5e9 100%)',
      description:
        'Jarvis is always one keystroke away. Use the shortcut or click the Arc Reactor button in the top navbar.',
      shortcut: 'Alt + Ctrl + J',
      securityNote:
        'All data is scoped strictly to your authenticated employee profile and organizational security policies.',
    },
  ];

  const current = stepsData[step - 1];
  const Icon = current.icon;

  const handleFinish = (promptToRun) => {
    localStorage.setItem('jarvis_onboarded', 'true');
    onClose();
    if (promptToRun && onSelectSamplePrompt) {
      onSelectSamplePrompt(promptToRun);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl shadow-2xl text-[var(--tracker-ink)] animate-fade-in">
        <button
          onClick={() => handleFinish(null)}
          className="absolute top-4 right-4 p-1.5 text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] rounded-lg hover:bg-[var(--tracker-surface-1)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md text-white"
            style={{ background: current.color }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--brand-solid)]">
              Step {step} of 3
            </span>
            <h2 className="text-lg font-bold text-[var(--tracker-ink)] leading-tight">{current.title}</h2>
          </div>
        </div>

        <p className="text-xs text-[var(--tracker-ink-muted)] leading-relaxed mb-4">{current.description}</p>

        {/* Step 1 Highlights */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            {current.highlights.map((h, i) => {
              const HIcon = h.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-[11px] font-medium text-[var(--tracker-ink)]"
                >
                  <HIcon className="w-3.5 h-3.5 text-[var(--brand-solid)] flex-shrink-0" />
                  <span className="truncate">{h.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2 Sample Prompts */}
        {step === 2 && (
          <div className="flex flex-col gap-1.5 mb-5">
            {current.prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleFinish(p)}
                className="text-left px-3 py-2.5 rounded-xl bg-[var(--tracker-surface-1)] hover:bg-[#6c3de8]/10 border border-[var(--tracker-border-soft)] hover:border-[#6c3de8]/30 text-xs font-medium text-[var(--tracker-ink)] hover:text-[var(--brand-solid)] transition-all flex items-center justify-between group"
              >
                <span>"{p}"</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--brand-solid)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        {/* Step 3 Shortcuts */}
        {step === 3 && (
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex items-center justify-center p-4 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)]">
              <span className="text-xs text-[var(--tracker-ink-muted)] mr-2">Keyboard Shortcut:</span>
              <kbd className="px-3 py-1.5 text-xs font-mono font-bold text-[var(--brand-solid)] bg-[var(--tracker-surface)] rounded-lg border border-[var(--tracker-border)] shadow-xs">
                {current.shortcut}
              </kbd>
            </div>
            <p className="text-[11px] text-[var(--tracker-ink-muted)] text-center leading-relaxed">
              {current.securityNote}
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--tracker-border-soft)]">
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-[var(--brand-solid)]' : 'w-2 bg-[var(--tracker-border)]'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-solid)] hover:opacity-90 text-white transition-all flex items-center gap-1 shadow-xs"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => handleFinish(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#6c3de8] to-[#0ea5e9] hover:opacity-95 text-white transition-all flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" /> Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JarvisOnboardingModal;
