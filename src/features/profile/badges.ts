import { getConfig } from "../../config.ts";
import { fetchCampusList } from "../campus/campus.ts";

const CAMPUS_BASE = "https://api.betterintra.com/gh/campuses";

interface CampusBadgeData {
  badgeBaseUrl: string;
  badges: Record<string, string>;
}

let badgeData: CampusBadgeData | null | undefined;
let fetchPromise: Promise<CampusBadgeData | null> | undefined;

async function getCampusBadgeData(): Promise<CampusBadgeData | null> {
  if (badgeData !== undefined) return badgeData;

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const campusId = await getConfig("CLUSTERS_CAMPUS");
    if (!campusId) return null;

    const manifest = await fetchCampusList();
    const campus = manifest.campuses.find((c) => c.id === campusId);
    const slug = campus
      ? campus.name.toLowerCase().replace(/\s+/g, "-")
      : campusId;

    const cacheKey = `BADGES_DATA_${slug}`;
    const cached = await chrome.storage.local.get(cacheKey);
    const entry = cached[cacheKey];
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return entry as CampusBadgeData;
    }

    try {
      const res = await fetch(`${CAMPUS_BASE}/${slug}.json`);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.badgeBaseUrl === "string") {
          const parsed: CampusBadgeData = {
            badgeBaseUrl: data.badgeBaseUrl,
            badges:
              data.badges && typeof data.badges === "object" ? data.badges : {},
          };
          await chrome.storage.local.set({ [cacheKey]: parsed });
          return parsed;
        }
      }
    } catch {}

    return null;
  })();

  badgeData = await fetchPromise;
  fetchPromise = undefined;
  return badgeData;
}

export async function getBadgeUrl(name: string): Promise<string | null> {
  const data = await getCampusBadgeData();
  if (!data) return null;

  const resolved =
    data.badges[name] ??
    Object.entries(data.badges).find(([key]) => name.endsWith(key))?.[1];
  if (!resolved) return null;
  return data.badgeBaseUrl.replace("{name}", resolved);
}

export function wrapTitleBadges(root: ParentNode): void {
  const badgeEls = root.querySelectorAll<HTMLElement>(
    '[class*="text-primary-foreground"][class*="inline-flex"]',
  );
  if (!badgeEls.length) return;

  const containers = new Set<HTMLElement>();
  for (const el of badgeEls) {
    if (el.parentElement) containers.add(el.parentElement);
  }

  for (const container of containers) {
    container.style.setProperty("flex-wrap", "wrap", "important");
  }
}

export function applyTitleBadgeWrap() {
  if (location.hostname !== "profile-v3.intra.42.fr") return;
  if (!(location.pathname === "/" || location.pathname.startsWith("/users")))
    return;
  wrapTitleBadges(document);
}

let badgesInitialized = false;

export async function initBadges() {
  if (badgesInitialized) return;
  badgesInitialized = true;

  if (location.pathname !== "/") return;

  const badgeEls = document.querySelectorAll<HTMLElement>(
    '[class*="text-primary-foreground"][class*="inline-flex"]',
  );

  for (const el of badgeEls) {
    const name = el.textContent?.trim() || "";
    if (!name) continue;

    const url = await getBadgeUrl(name);
    if (!url) continue;

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className = el.className;
    anchor.setAttribute("style", el.getAttribute("style") || "");
    anchor.textContent = el.textContent;
    el.replaceWith(anchor);
  }
}
