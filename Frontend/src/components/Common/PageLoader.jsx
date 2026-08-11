/**
 * Inline page loader — centered spinner for content areas.
 * Uses design tokens (border-hairline, border-t-accent, bg-canvas).
 * Use ModernLoader.jsx for full-screen overlay loaders instead.
 */
export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-canvas text-ink">
      <div className="h-8 w-8 border-4 border-hairline border-t-accent rounded-full animate-spin" />
    </div>
  );
}
