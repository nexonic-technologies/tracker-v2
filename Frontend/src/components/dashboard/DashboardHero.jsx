import React from 'react';
import { Link } from 'react-router-dom';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
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
    <div className="h-11 flex items-center justify-between px-1 text-xs select-none">
      <div className="flex items-center gap-2 text-ink-subtle truncate">
        <span aria-hidden>{greeting.emoji}</span>
        <span className="font-medium">{greeting.text}</span>
        <span>&middot;</span>
        <span className="font-semibold text-ink">{userName || 'User'}</span>
        <span className="hidden sm:inline">&middot;</span>
        <span className="hidden sm:inline">{getFormattedDate()}</span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {heroActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 transition-colors"
          >
            {action.icon && <action.icon className="h-3.5 w-3.5" />}
            <span>{getLabel(action)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
