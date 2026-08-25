import { getConfig } from "../../config.ts";
import { hashLogin } from "../../utils/crypto.ts";
import {
  decide,
  normalizeUrl,
  parseSubjectLink,
  formatShortDate,
  formatRelativeTime,
} from "./fingerprint.ts";
import { renderSubjectBadge } from "./ui.ts";

const WORKER_URL = "https://api.betterintra.com";
const CHECK_COOLDOWN_MS = 15 * 60 * 1000;

interface LocalSubjectState {
  lastUrl?: string;
  versionDate?: number;
  changedAt?: number;
  checkedAt?: number;
}

type SubjectTrackerState = Record<string, LocalSubjectState>;

interface WorkerStateEntry {
  slug: string;
  tracked: boolean;
  name?: string;
  subjectId?: string | null;
  createdAt?: number | null;
  modifiedAt?: number | null;
  lastChangedAt?: number | null;
}

interface WorkerReportEntry {
  slug: string;
  status: "first" | "known" | "changed" | "unknown";
  name?: string;
  createdAt?: number | null;
  modifiedAt?: number | null;
  lastChangedAt?: number | null;
  subjectId?: string | null;
}

interface CloudClient {
  token: string;
  hashedLogin: string;
}

export function matchProjectSlug(pathname: string): string | null {
  const m = pathname.match(/^\/(?:projects\/)?([^/]+)(?:\/.*)?$/);
  return m ? m[1] : null;
}

function isProjectPage(): string | null {
  if (window.location.hostname !== "projects.intra.42.fr") return null;
  return matchProjectSlug(window.location.pathname);
}

function findSubjectAnchor(): HTMLAnchorElement | null {
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    '.project-attachments-list a[href$=".pdf"]',
  );
  return anchors[0] ?? null;
}

async function readLocalState(): Promise<SubjectTrackerState> {
  const raw = await getConfig("SUBJECT_TRACKER_STATE");
  return (raw && typeof raw === "object" ? raw : {}) as SubjectTrackerState;
}

async function cloudClient(): Promise<CloudClient | null> {
  const [token, login] = await Promise.all([
    getConfig("CLOUD_TOKEN"),
    getConfig("CLOUD_LOGIN"),
  ]);
  if (!token || !login) return null;
  return { token, hashedLogin: await hashLogin(login) };
}

async function getWorkerState(
  slug: string,
  client: CloudClient,
): Promise<WorkerStateEntry | null> {
  const url = `${WORKER_URL}/api/v1/private/subjects/state?login=${encodeURIComponent(client.hashedLogin)}&slugs=${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${client.token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { subjects?: WorkerStateEntry[] };
    return data.subjects?.find((s) => s.slug === slug) ?? null;
  } catch {
    return null;
  }
}

async function reportToWorker(
  slug: string,
  client: CloudClient,
  url: string,
): Promise<WorkerReportEntry | null> {
  const endpoint = `${WORKER_URL}/api/v1/private/subjects/report?login=${encodeURIComponent(client.hashedLogin)}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [{ slug, url: normalizeUrl(url) }] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { subjects?: WorkerReportEntry[] };
    return data.subjects?.find((s) => s.slug === slug) ?? null;
  } catch {
    return null;
  }
}

function versionDateOf(
  createdAt: number | null | undefined,
  modifiedAt: number | null | undefined,
  fallback?: number,
): number | undefined {
  return modifiedAt ?? createdAt ?? fallback ?? undefined;
}

async function waitForSubject(
  anchor: HTMLAnchorElement | null,
): Promise<HTMLAnchorElement | null> {
  const MAX_ATTEMPTS = 40;
  const DELAY_MS = 150;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (anchor) return anchor;
    await new Promise((r) => setTimeout(r, DELAY_MS));
    anchor = findSubjectAnchor();
  }
  return anchor;
}

export async function initSubjectTracker(): Promise<void> {
  const enabled = await getConfig("SUBJECT_TRACKER_ENABLED");
  if (!enabled) return;

  const slug = isProjectPage();
  if (!slug) return;

  const anchor = await waitForSubject(findSubjectAnchor());
  if (!anchor) return;

  const url = anchor.href;
  const state = await readLocalState();
  const local = state[slug] ?? {};
  if (local.checkedAt && Date.now() - local.checkedAt < CHECK_COOLDOWN_MS) {
    maybeRenderBadge(slug, local, anchor);
    return;
  }

  const client = await cloudClient();
  let nextLocal: LocalSubjectState;

  if (client) {
    const entry = await getWorkerState(slug, client);
    if (entry === null) {
      // Worker unreachable → fall back to latest local knowledge.
      nextLocal = {
        lastUrl: local.lastUrl ?? normalizeUrl(url),
        versionDate: local.versionDate ?? Date.now(),
        changedAt: local.changedAt,
        checkedAt: Date.now(),
      };
    } else if (!entry.tracked) {
      // Never-seen slug → seed via the worker (reads the PDF metadata).
      const report = await reportToWorker(slug, client, url);
      nextLocal = {
        lastUrl: normalizeUrl(url),
        versionDate:
          report?.modifiedAt ??
          report?.createdAt ??
          local.versionDate ??
          Date.now(),
        changedAt: local.changedAt,
        checkedAt: Date.now(),
      };
    } else {
      const currentSubjectId = parseSubjectLink(url)?.subjectId ?? null;
      const recordedSubjectId = entry.subjectId ?? null;
      if (
        currentSubjectId &&
        recordedSubjectId &&
        currentSubjectId !== recordedSubjectId
      ) {
        // Resource differs from the registry → report the change.
        const report = await reportToWorker(slug, client, url);
        const changed =
          report?.status === "changed"
            ? report
            : {
                modifiedAt: entry.modifiedAt,
                lastChangedAt: entry.lastChangedAt,
              };
        nextLocal = {
          lastUrl: normalizeUrl(url),
          versionDate:
            versionDateOf(changed.modifiedAt, undefined) ??
            versionDateOf(entry.createdAt, entry.modifiedAt),
          changedAt: changed.lastChangedAt ?? Date.now(),
          checkedAt: Date.now(),
        };
      } else {
        // Same link → show the recorded state (baseline or previous update).
        nextLocal = {
          lastUrl: normalizeUrl(url),
          versionDate: versionDateOf(entry.createdAt, entry.modifiedAt),
          changedAt: entry.lastChangedAt ?? undefined,
          checkedAt: Date.now(),
        };
      }
    }
  } else {
    // No cloud session → pure local comparison of the link.
    const prev = local.lastUrl ? { url: local.lastUrl } : null;
    if (decide(prev, { url }) === "changed") {
      nextLocal = {
        lastUrl: normalizeUrl(url),
        changedAt: Date.now(),
        checkedAt: Date.now(),
      };
    } else {
      // No prior record → seed a baseline so the badge shows immediately.
      nextLocal = {
        lastUrl: normalizeUrl(url),
        versionDate: local.versionDate ?? Date.now(),
        changedAt: local.changedAt,
        checkedAt: Date.now(),
      };
    }
  }

  await chrome.storage.local.set({
    SUBJECT_TRACKER_STATE: { ...state, [slug]: nextLocal },
  });

  maybeRenderBadge(slug, nextLocal, anchor);
}

export function maybeRenderBadge(
  _slug: string,
  local: LocalSubjectState,
  button: HTMLAnchorElement | null,
): void {
  if (!button) return;
  const date = local.versionDate ?? local.changedAt;
  if (!date) return;

  const DAY = 86_400_000;
  const age = Date.now() - date;
  const recent = age <= 7 * DAY;
  const tone: "error" | "warning" | "ghost" =
    age <= 7 * DAY ? "error" : age <= 30 * DAY ? "warning" : "ghost";
  const when = recent ? formatRelativeTime(date) : formatShortDate(date);
  renderSubjectBadge(button, "Subject updated", when, tone);
}
