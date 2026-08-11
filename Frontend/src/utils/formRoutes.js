/** Build form route with optional record id (vite-plugin-pages: .../form.jsx) */
export function entityFormPath(basePath, id) {
  const base = basePath.replace(/\/$/, "");
  return id ? `${base}/form?id=${encodeURIComponent(id)}` : `${base}/form`;
}
