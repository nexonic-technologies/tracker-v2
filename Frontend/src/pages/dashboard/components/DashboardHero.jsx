import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, LogIn, Plus } from 'lucide-react';
import { APP_SHELL, MODULES } from '../../../constants/uiTokens';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}


export default function DashboardHero({ userName, heroActions = [], stats }) {
  const greeting = getGreeting();

  const getLabel = (action) => {
    if (action.dynamic === 'clockLabel') {
      return stats?.attendanceStatus === 'check-in' ? 'Clock Out' : 'Clock In';
    }
    return action.label;
  };

  return (
    <section
      className="lmx-section-card !border-l-[var(--module-project)] p-6 sm:p-8 lg:p-10"
      data-module={MODULES.project.id}
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden>{greeting.emoji}</span>
            <p className="lmx-page-eyebrow !text-[var(--module-project)] mb-0">{greeting.text}</p>
          </div>
          <h1 className={`${APP_SHELL.pageTitle} !text-3xl lg:!text-[40px]`}>
            Welcome back, {userName || 'User'}!
          </h1>
          <p className={`${APP_SHELL.pageSubtitle} flex items-center gap-2`}>
            <Calendar className="h-4 w-4" />
            {getFormattedDate()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {heroActions.map((action) => (
            <Link key={action.to} to={action.to}>
              <button
                type="button"
                className={
                  action.variant === 'primary'
                    ? 'tracker-btn-brand inline-flex items-center gap-2'
                    : 'tracker-btn-secondary inline-flex items-center gap-2'
                }
              >
                <action.icon className="h-4 w-4" />
                {getLabel(action)}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
