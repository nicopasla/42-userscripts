import { getConfig } from "../../config.ts";
import { fetchCampusList } from "../campus/campus.ts";
import { TITLE_BADGE_SELECTOR } from "./selectors.ts";

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
  const badgeEls = root.querySelectorAll<HTMLElement>(TITLE_BADGE_SELECTOR);
  if (!badgeEls.length) return;

  const containers = new Set<HTMLElement>();
  for (const el of badgeEls) {
    if (el.parentElement) containers.add(el.parentElement);
  }

  for (const container of containers) {
    container.style.setProperty("flex-wrap", "wrap", "important");
  }
}

export function getTitleBadges(
  root: ParentNode,
): { title: string; el: HTMLElement }[] {
  const list: { title: string; el: HTMLElement }[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(TITLE_BADGE_SELECTOR)) {
    if (el.closest("[data-ft-badge-menu], [data-ft-badge-more]")) continue;
    const title = el.textContent?.trim() || "";
    if (title) list.push({ title, el });
  }
  return list;
}

export interface BadgeLayoutOpts {
  order: string[];
  wrap: boolean;
}

export function applyBadgeLayout(
  root: ParentNode,
  opts: BadgeLayoutOpts,
): void {
  const badges = getTitleBadges(root);
  if (!badges.length) return;

  const container = badges[0].el.parentElement;
  if (!container) return;

  const hiddenSet = new Set(
    opts.order
      .filter((name) => name.startsWith("-"))
      .map((name) => name.substring(1).trim().toLowerCase()),
  );

  const desiredWrap = opts.wrap ? "wrap" : "nowrap";
  if (container.style.getPropertyValue("flex-wrap") !== desiredWrap) {
    container.style.setProperty("flex-wrap", desiredWrap, "important");
  }

  for (const { title, el } of badges) {
    const hidden = hiddenSet.has(title.toLowerCase());
    const display = hidden ? "none" : "";
    if (
      el.style.getPropertyValue("display") !== display ||
      el.style.getPropertyPriority("display") !==
        (display === "none" ? "important" : "")
    ) {
      el.style.setProperty(
        "display",
        display,
        display === "none" ? "important" : "",
      );
    }
  }

  const ordered = opts.order
    .filter((name) => !name.startsWith("-"))
    .map((name) => name.trim().toLowerCase());
  if (ordered.length) {
    const byTitle = new Map(badges.map((b) => [b.title.toLowerCase(), b.el]));

    const orderedEls: HTMLElement[] = [];
    for (const name of ordered) {
      const el = byTitle.get(name);
      if (el) orderedEls.push(el);
    }
    for (const { title, el } of badges) {
      if (!byTitle.has(title.toLowerCase())) continue;
      if (!orderedEls.includes(el)) orderedEls.push(el);
    }
    const namedSet = new Set(ordered);
    for (const { el } of badges) {
      const name = el.textContent?.trim().toLowerCase() || "";
      if (!namedSet.has(name)) orderedEls.push(el);
    }

    const currentEls = [...container.children] as HTMLElement[];

    const sameOrder =
      orderedEls.length === currentEls.length &&
      orderedEls.every((el, i) => el === currentEls[i]);

    if (!sameOrder) {
      const fragment = document.createDocumentFragment();
      for (const el of orderedEls) fragment.appendChild(el);
      container.appendChild(fragment);
    }
  }
}

let lastAppliedKey = "";

export function applyTitleBadgeWrap() {
  if (location.hostname !== "profile-v3.intra.42.fr") return;
  if (!(location.pathname === "/" || location.pathname.startsWith("/users")))
    return;
  void (async () => {
    const order = (await getConfig("PROFILE_BADGE_ORDER")) as string[];
    const wrap = await getConfig("PROFILE_BADGE_WRAP");
    const key = `${JSON.stringify(order || [])}|${wrap}`;
    if (key === lastAppliedKey) return;
    lastAppliedKey = key;
    applyBadgeLayout(document, {
      order: order || [],
      wrap,
    });
  })();
}

let badgesInitialized = false;

export async function initBadges() {
  if (badgesInitialized) return;
  badgesInitialized = true;

  if (location.pathname !== "/") return;

  const badgeEls = document.querySelectorAll<HTMLElement>(TITLE_BADGE_SELECTOR);

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
