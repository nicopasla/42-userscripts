export interface SubjectLink {
  url: string;
  subjectId: string | null;
  lang: string | null;
  filename: string;
}

export type SubjectStatus = "first" | "known" | "changed";

export function normalizeUrl(href: string): string {
  try {
    const u = new URL(href);
    return `${u.origin}${u.pathname}`;
  } catch {
    return href;
  }
}

export function isSubjectUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function parseSubjectLink(href: string): SubjectLink | null {
  if (!isSubjectUrl(href)) return null;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const url = normalizeUrl(href);
  const match = u.pathname.match(/\/pdf\/pdf\/(\d+)\/([^/]+)$/);
  const subjectId = match ? match[1] : null;
  const filename = match ? match[2] : (u.pathname.split("/").pop() ?? "");
  const first = filename.split(".")[0] ?? "";
  const lang = /^[a-z]{2}$/.test(first) ? first : null;
  return { url, subjectId, lang, filename };
}

export type PreviousSubjectRecord = {
  url?: string;
} | null;

export function decide(
  prev: PreviousSubjectRecord,
  next: { url: string },
): SubjectStatus {
  if (!prev) return "first";
  if (!prev.url) return "first";
  if (normalizeUrl(prev.url) === normalizeUrl(next.url)) return "known";
  return "changed";
}

export function formatShortDate(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).slice(-2);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
}

export function formatRelativeTime(
  ms: number,
  now: number = Date.now(),
): string {
  const diff = Math.max(0, now - ms);
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatShortDate(ms);
}
