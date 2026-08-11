// This file maps our CSS variables from tokens.css for use in JS components (e.g. inline styles or styled-components)
// It ensures we have a single source of truth for design tokens.

export const tokens = {
  colors: {
    brand: 'var(--brand-solid)',
    brandTeal: 'var(--brand-teal)',
    success: 'var(--tracker-success)',
    successLight: 'var(--tracker-success-light)',
    warning: 'var(--tracker-warning)',
    warningLight: 'var(--tracker-warning-light)',
    danger: 'var(--tracker-danger)',
    dangerLight: 'var(--tracker-danger-light)',
    info: 'var(--tracker-info)',
    infoLight: 'var(--tracker-info-light)',
    
    // Canvas & Surface
    canvas: 'var(--tracker-canvas)',
    surface: 'var(--tracker-surface)',
    surface1: 'var(--tracker-surface-1)',
    surface2: 'var(--tracker-surface-2)',
    
    // Ink
    ink: 'var(--tracker-ink)',
    inkMuted: 'var(--tracker-ink-muted)',
    inkSubtle: 'var(--tracker-ink-subtle)',
    
    // Borders
    border: 'var(--tracker-border)',
    borderSoft: 'var(--tracker-border-soft)',
    borderFocus: 'var(--tracker-border-focus)',
  },
  
  statusColors: {
    backlogs: { bg: 'var(--tracker-surface-1)', text: 'var(--tracker-ink-muted)' },
    assigned: { bg: 'var(--tracker-info-light)', text: 'var(--tracker-info)' },
    in_progress: { bg: 'var(--tracker-warning-light)', text: 'var(--tracker-warning)' },
    review: { bg: 'var(--tracker-accent-muted)', text: 'var(--tracker-accent)' },
    done: { bg: 'var(--tracker-success-light)', text: 'var(--tracker-success)' },
    failed: { bg: 'var(--tracker-danger-light)', text: 'var(--tracker-danger)' },
  },

  radius: {
    sm: 'var(--tracker-radius-sm)',
    md: 'var(--tracker-radius-md)',
    lg: 'var(--tracker-radius-lg)',
    xl: 'var(--tracker-radius-xl)',
    card: 'var(--tracker-radius-card)',
  },

  shadows: {
    card: 'var(--tracker-shadow-card)',
    raised: 'var(--tracker-shadow-raised)',
  }
};
