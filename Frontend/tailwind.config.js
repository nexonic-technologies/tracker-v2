// tailwind.config.js
import lineClamp from '@tailwindcss/line-clamp';
import Scrollbar from 'tailwind-scrollbar-hide';

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--tracker-canvas)",
        "canvas-muted": "var(--tracker-canvas-muted)",
        surface: "var(--tracker-surface)",
        "surface-1": "var(--tracker-surface-1)",
        "surface-2": "var(--tracker-surface-2)",
        ink: "var(--tracker-ink)",
        "ink-muted": "var(--tracker-ink-muted)",
        "ink-subtle": "var(--tracker-ink-subtle)",
        "ink-tertiary": "var(--tracker-ink-tertiary)",
        hairline: "var(--tracker-border)",
        "hairline-soft": "var(--tracker-border-soft)",
        accent: "var(--module-accent)",
        "accent-muted": "var(--module-accent-light)",
        brand: "var(--brand-solid)",
        "brand-teal": "var(--brand-teal)",
      },
      borderRadius: {
        "tracker-card": "14px",
      },
    },
  },
  plugins: [lineClamp, Scrollbar],
};
