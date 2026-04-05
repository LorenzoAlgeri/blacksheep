export interface ArtistEntry {
  id: string;
  name: string;
  role: string;
}

export interface EventEntry {
  id: string;
  title: string;
  time: string;
  location: string;
  lineup: ArtistEntry[];
}

export interface EmailPalette {
  bg: string;
  text: string;
  accent: string;
}

export interface EmailTemplateData {
  title: string;
  body: string;
  showPhoto: boolean;
  photoUrl: string;
  showEvents: boolean;
  events: EventEntry[];
  showCta: boolean;
  ctaText: string;
  ctaLink: string;
  unsubscribeUrl: string;
  privacyUrl?: string;
  palette: EmailPalette;
}

const ARTIST_ROLES = ["DJ SET", "LIVE", "DANCE PERFORMANCE", "SPECIAL GUEST", "HOST"] as const;

export type ArtistRole = (typeof ARTIST_ROLES)[number];
export { ARTIST_ROLES };

export interface PalettePreset {
  name: string;
  palette: EmailPalette;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  { name: "Classic", palette: { bg: "#000000", text: "#FFFFF3", accent: "#BE8305" } },
  { name: "Midnight", palette: { bg: "#031240", text: "#FFFFF3", accent: "#BE8305" } },
  { name: "Monochrome", palette: { bg: "#000000", text: "#FFFFF3", accent: "#FFFFF3" } },
  { name: "Burgundy", palette: { bg: "#0a0a0a", text: "#FFFFF3", accent: "#731022" } },
  { name: "Purple", palette: { bg: "#0a0a0a", text: "#FFFFF3", accent: "#65305C" } },
  { name: "Forest", palette: { bg: "#0a0a0a", text: "#FFFFF3", accent: "#334B31" } },
  { name: "Daylight", palette: { bg: "#FFFFF3", text: "#1F1F1F", accent: "#BE8305" } },
  { name: "Clean", palette: { bg: "#FFFFF3", text: "#1F1F1F", accent: "#1F1F1F" } },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "#";
    return u.href;
  } catch {
    return "#";
  }
}

function nl2br(text: string): string {
  return text.replace(/\n/g, "<br>");
}

// Convert hex to hex+alpha (8-char hex)
function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function buildLineupHtml(lineup: ArtistEntry[], p: EmailPalette): string {
  const filtered = lineup.filter((a) => a.name.trim());
  if (filtered.length === 0) return "";
  const lines = filtered
    .map(
      (a) =>
        `<div style="font-size:11px;letter-spacing:0.15em;color:${hexAlpha(p.text, 0.7)};margin-top:4px;">${escapeHtml(a.name).toUpperCase()} &mdash; ${escapeHtml(a.role)}</div>`,
    )
    .join("");
  return `<div style="margin-top:14px;"><div style="font-size:9px;letter-spacing:0.3em;color:${hexAlpha(p.text, 0.3)};margin-bottom:6px;">LINEUP</div>${lines}</div>`;
}

function buildEventBlockHtml(event: EventEntry, isFirst: boolean, p: EmailPalette): string {
  const divider = isFirst
    ? ""
    : `<div style="width:24px;height:1px;background:${hexAlpha(p.accent, 0.19)};margin:16px auto;"></div>`;

  return `${divider}
  <div style="background:${hexAlpha(p.text, 0.03)};border-left:2px solid ${p.accent};margin:0 24px;padding:20px 24px;">
    <div style="font-size:10px;letter-spacing:0.3em;color:${p.accent};margin-bottom:8px;">PROSSIMO EVENTO</div>
    <div style="font-family:'Arial Black',sans-serif;font-size:16px;color:${p.text};">${escapeHtml(event.title)}</div>
    <div style="font-size:13px;color:${hexAlpha(p.text, 0.5)};margin-top:4px;">${escapeHtml(event.time)}</div>
    <div style="font-size:13px;color:${hexAlpha(p.text, 0.5)};">${escapeHtml(event.location)}</div>
    ${buildLineupHtml(event.lineup, p)}
  </div>`;
}

export function buildEmailHtml(data: EmailTemplateData): string {
  const p = data.palette;

  const photoBlock =
    data.showPhoto && data.photoUrl.trim()
      ? `
  <div style="padding:0 24px 8px;">
    <img src="${sanitizeUrl(data.photoUrl)}" alt="BLACK SHEEP" style="width:100%;border-radius:4px;opacity:0.9;" />
  </div>`
      : "";

  const eventsBlock =
    data.showEvents && data.events.length > 0
      ? data.events.map((ev, i) => buildEventBlockHtml(ev, i === 0, p)).join("")
      : "";

  const ctaBlock = data.showCta
    ? `
  <div style="padding:32px 24px;text-align:center;">
    <a href="${sanitizeUrl(data.ctaLink)}" style="display:inline-block;background:${p.text};color:${p.bg};font-family:'Arial Black',sans-serif;font-size:13px;letter-spacing:0.15em;padding:14px 32px;text-decoration:none;">${escapeHtml(data.ctaText)}</a>
  </div>`
    : "";

  const unsubscribeLink = data.unsubscribeUrl
    ? `<br><a href="${data.unsubscribeUrl}" style="color:${hexAlpha(p.text, 0.25)};text-decoration:underline;">Disiscriviti</a> &middot; <a href="${data.privacyUrl ?? "#"}" style="color:${hexAlpha(p.text, 0.25)};text-decoration:underline;">Privacy Policy</a>`
    : "{{UNSUB}}";

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${p.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="background:${p.bg};color:${p.text};padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;">

  <div style="padding:40px 24px 24px;text-align:center;">
    <div style="font-family:'Arial Black',sans-serif;font-size:28px;letter-spacing:0.08em;color:${p.text};">BLACK SHEEP</div>
    <div style="font-size:10px;letter-spacing:0.4em;color:${hexAlpha(p.text, 0.5)};margin-top:4px;">EVERY MONDAY</div>
  </div>

  <div style="width:40px;height:1px;background:${hexAlpha(p.accent, 0.25)};margin:0 auto;"></div>

  <div style="padding:32px 24px;">
    <div style="font-family:'Arial Black',sans-serif;font-size:18px;letter-spacing:0.05em;color:${p.text};text-align:center;">${escapeHtml(data.title)}</div>
    <p style="font-size:14px;line-height:1.7;color:${hexAlpha(p.text, 0.7)};margin:20px 0;text-align:center;">${nl2br(escapeHtml(data.body))}</p>
  </div>

  ${photoBlock}

  ${eventsBlock}

  ${ctaBlock}

  <div style="padding:24px;text-align:center;border-top:1px solid ${hexAlpha(p.text, 0.06)};">
    <div style="font-size:10px;color:${hexAlpha(p.text, 0.15)};line-height:1.6;">
      Ricevi questa email perch\u00e9 ti sei iscritto alla newsletter di BLACK SHEEP.${unsubscribeLink}
    </div>
  </div>

</div>
</body>
</html>`;
}

export function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function makeDefaultArtist(): ArtistEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "DJ SET",
  };
}

export function makeDefaultEvent(): EventEntry {
  return {
    id: crypto.randomUUID(),
    title: getNextMonday(),
    time: "23:00 \u2014 05:00",
    location: "11 Clubroom \u00b7 Corso Como \u00b7 Milano",
    lineup: [makeDefaultArtist()],
  };
}
