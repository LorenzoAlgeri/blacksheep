/**
 * Escape HTML-significant characters so a string can be safely interpolated
 * into HTML body text or attribute values.
 *
 * Order matters: '&' must be replaced first to avoid double-encoding the
 * subsequent ampersand-prefixed entities.
 *
 * Note: this is intentionally NOT a full HTML sanitizer. It does not strip
 * tags, validate URLs, or guard against script injection beyond entity
 * encoding. For user-controlled HTML, use a real sanitizer.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
