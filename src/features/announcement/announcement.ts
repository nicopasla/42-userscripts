import { html, render } from "lit-html";

const WORKER_URL = "https://api.betterintra.com";
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = "ft-announcement-cache";
const DISMISS_PREFIX = "ft-announcement-dismissed:";

type AnnouncementLevel = "info" | "warning" | "critical";

interface Announcement {
  message: string | null;
  updatedAt: number | null;
  level: AnnouncementLevel;
}

const LEVEL_STYLES: Record<
  AnnouncementLevel,
  { bg: string; fg: string; label: string }
> = {
  info: { bg: "#2563eb", fg: "#fff", label: "Notice" },
  warning: { bg: "#f59e0b", fg: "#1f2937", label: "Warning" },
  critical: { bg: "#ef4444", fg: "#fff", label: "Critical" },
};

const isProfileHost = () =>
  window.location.hostname === "profile.intra.42.fr" ||
  window.location.hostname === "profile-v3.intra.42.fr";

function getCached(): { data: Announcement; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as { data: Announcement; timestamp: number }) : null;
  } catch {
    return null;
  }
}

function setCached(data: Announcement): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* ignore */
  }
}

function getDismissedKey(message: string, level: string): string {
  let hash = 0;
  const input = `${message}::${level}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `${DISMISS_PREFIX}${hash}`;
}

function renderBanner(message: string, level: AnnouncementLevel): void {
  const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.critical;

  const dismiss = () => {
    const el = document.getElementById("ft-announcement-banner");
    if (el) el.remove();
    try {
      sessionStorage.setItem(getDismissedKey(message, level), "1");
    } catch {
      /* ignore */
    }
  };

  const banner = document.createElement("div");
  banner.id = "ft-announcement-banner";

  render(
    html`
      <style>
        #ft-announcement-banner {
          position: relative;
          z-index: 999999;
        }
        .ft-announcement-bnr {
          background: ${style.bg};
          color: ${style.fg};
          padding: 10px 20px;
          text-align: center;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          position: relative;
        }
        .ft-announcement-level {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-right: 6px;
        }
        .ft-announcement-dismiss {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: inherit;
          opacity: 0.7;
          line-height: 1;
          padding: 4px 8px;
        }
        .ft-announcement-dismiss:hover {
          opacity: 1;
        }
      </style>
      <div class="ft-announcement-bnr">
        <strong class="ft-announcement-level">[${style.label}]</strong>
        ${message}
        <button
          class="ft-announcement-dismiss"
          @click="${dismiss}"
          title="Dismiss"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    `,
    banner,
  );

  const tryInject = () => {
    if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      requestAnimationFrame(tryInject);
    }
  };
  tryInject();
}

export async function initAnnouncementBanner(): Promise<void> {
  if (!isProfileHost()) return;
  if (document.getElementById("ft-announcement-banner")) return;

  try {
    const cached = getCached();
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.data.message) {
        if (sessionStorage.getItem(getDismissedKey(cached.data.message, cached.data.level)) !== "1") {
          renderBanner(cached.data.message, cached.data.level);
        }
      }
      return;
    }

    const res = await fetch(`${WORKER_URL}/api/v1/public/announcement`);
    if (!res.ok) return;
    const data = (await res.json()) as Announcement;
    setCached(data);

    if (data.message && sessionStorage.getItem(getDismissedKey(data.message, data.level)) !== "1") {
      renderBanner(data.message, data.level);
    }
  } catch {
    /* never break intra */
  }
}
