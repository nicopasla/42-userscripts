import { html, render } from "lit-html";

const WORKER_URL = "https://api.betterintra.com";
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = "ft-announcement-cache";
const DISMISS_PREFIX = "ft-announcement-dismissed:";

interface Announcement {
  message: string | null;
  updatedAt: number | null;
}

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

function getDismissedKey(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return `${DISMISS_PREFIX}${hash}`;
}

function renderBanner(message: string): void {
  const dismiss = () => {
    const el = document.getElementById("ft-announcement-banner");
    if (el) el.remove();
    try {
      sessionStorage.setItem(getDismissedKey(message), "1");
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
          background: #ef4444;
          color: #fff;
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
        <strong>Better Intra notice:</strong> ${message}
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
        if (sessionStorage.getItem(getDismissedKey(cached.data.message)) !== "1") {
          renderBanner(cached.data.message);
        }
      }
      return;
    }

    const res = await fetch(`${WORKER_URL}/api/v1/public/announcement`);
    if (!res.ok) return;
    const data = (await res.json()) as Announcement;
    setCached(data);

    if (data.message && sessionStorage.getItem(getDismissedKey(data.message)) !== "1") {
      renderBanner(data.message);
    }
  } catch {
    /* never break intra */
  }
}
