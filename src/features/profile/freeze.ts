import { render, html } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import FREEZE_SVG from "../../assets/svg/freeze.svg?raw";
import { createCountdown } from "../../utils/countdown.ts";

const INJECTED_ID = "ft-freeze-card";

function waitForToken(timeout = 15000): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout>;

    const handler = (e: CustomEvent) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(e.detail);
    };
    const cleanup = () => {
      document.removeEventListener(
        "42_INTRAPY_TOKEN",
        handler as EventListener,
      );
      clearTimeout(timer);
    };
    document.addEventListener("42_INTRAPY_TOKEN", handler as EventListener);

    const stored = sessionStorage.getItem("ft_intrapy_token");
    if (stored) {
      resolved = true;
      cleanup();
      resolve(stored);
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeout);
  });
}

async function fetchCursusData(login: string, token: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://intrapy.intra.42.fr/api/v1/users/${login}/cursus`,
      { headers: { Authorization: token } },
    );
    if (!res.ok) {
      console.warn("fetchCursusData: non-ok response", res.status);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn("fetchCursusData: network error", e);
    return [];
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getCountdownParts(endIso: string): number[] {
  const diff = new Date(endIso).getTime() - Date.now();
  if (diff <= 0) return [0, 0, 0, 0];
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return [d, h, m, s];
}

function startCountdown(
  container: HTMLElement,
  endIso: string,
  color: string,
): void {
  const countdown = createCountdown(getCountdownParts(endIso), {
    digits: 2,
  });
  countdown.el.style.cssText =
    `font-size: 1.5rem; font-weight: 700; color: ${color};`;
  container.appendChild(countdown.el);

  if (_intervalId !== null) clearInterval(_intervalId);
  _intervalId = setInterval(() => {
    if (new Date(endIso).getTime() - Date.now() <= 0) {
      if (_intervalId !== null) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
      countdown.update([0, 0, 0, 0]);
      return;
    }
    countdown.update(getCountdownParts(endIso));
  }, 1000);
}

let _running = false;
let _intervalId: ReturnType<typeof setInterval> | null = null;

window.addEventListener(
  "pagehide",
  () => {
    if (_intervalId !== null) {
      clearInterval(_intervalId);
      _intervalId = null;
    }
    _running = false;
  },
  { once: true },
);

const FREEZE_CACHE_KEY = "FREEZE_CACHE";

async function readFreezeCache(login: string): Promise<string | null> {
  try {
    const stored = await chrome.storage.local.get(FREEZE_CACHE_KEY);
    const raw = stored[FREEZE_CACHE_KEY];
    const map = (typeof raw === "string" ? JSON.parse(raw) : raw) || {};
    const until = map[login];
    return typeof until === "string" && new Date(until).getTime() > Date.now()
      ? until
      : null;
  } catch {
    return null;
  }
}

async function writeFreezeCache(login: string, until: string | null) {
  try {
    const stored = await chrome.storage.local.get(FREEZE_CACHE_KEY);
    const raw = stored[FREEZE_CACHE_KEY];
    const map = (typeof raw === "string" ? JSON.parse(raw) : raw) || {};
    if (until) {
      map[login] = until;
    } else {
      delete map[login];
    }
    await chrome.storage.local.set({
      [FREEZE_CACHE_KEY]: JSON.stringify(map),
    });
  } catch {
    /* the card still works without the cache */
  }
}

function removeFreezeCard() {
  document.getElementById(INJECTED_ID)?.remove();
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function waitForProfileCard(): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const poll = () => {
      const flexRow = document.querySelector<HTMLElement>(
        ".flex.flex-col.lg\\:flex-row.gap-6.md\\:gap-8",
      );
      const profileCard = flexRow?.firstElementChild as HTMLElement | null;
      if (profileCard) {
        resolve(profileCard);
        return;
      }
      if (++attempts > 60) {
        resolve(null);
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
}

function buildFreezeCard(profileCard: HTMLElement, freezeUntil: string) {
  const color =
    getComputedStyle(profileCard).getPropertyValue("--user-color").trim() ||
    "#00babc";

  const card = document.createElement("div");
  card.id = INJECTED_ID;
  card.dataset.freezeUntil = freezeUntil;
  card.className =
    "border border-ft-gray-border bg-ft-gray/50 rounded-xl flex flex-col items-center justify-center gap-2 w-full";
  card.style.cssText = `min-height: 200px;`;

  const iconWrap = document.createElement("div");
  iconWrap.style.cssText = `width: 2.5rem; height: 2.5rem; color: #fff; animation: ft-freeze-spin 8s linear infinite;`;
  if (!document.getElementById("ft-freeze-spin-style")) {
    const style = document.createElement("style");
    style.id = "ft-freeze-spin-style";
    style.textContent = `@keyframes ft-freeze-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
  render(unsafeHTML(FREEZE_SVG), iconWrap);

  const title = document.createElement("div");
  title.style.cssText = `font-size: 1.25rem; font-weight: 700; color: ${color};`;
  title.textContent = "Freeze";

  const until = document.createElement("div");
  until.style.cssText = `font-size: 1rem; font-weight: 700; opacity: 0.7;`;
  until.textContent = `Until ${formatDate(freezeUntil)}`;

  const countdownContainer = document.createElement("div");
  startCountdown(countdownContainer, freezeUntil, color);

  card.appendChild(iconWrap);
  card.appendChild(title);
  card.appendChild(until);
  card.appendChild(countdownContainer);

  const infoHost = document.getElementById("profile-badges-shadow");
  const target = infoHost ?? profileCard;
  target.insertAdjacentElement("afterend", card);
}

export async function initFreezeCard() {
  if (_running) return;
  _running = true;

  try {
    const pathParts = location.pathname.split("/").filter(Boolean);
    if (pathParts[0] !== "users" || !pathParts[1]) return;

    const existingCard = document.getElementById(INJECTED_ID);
    if (existingCard) return;

    const targetLogin = pathParts[1];

    // A freeze that was still running on the last visit is drawn right away,
    // so the card does not push the page down once the intra API answers. The
    // cached date is only trusted while it is in the future, and the response
    // below either confirms it or drops the card.
    const cached = await readFreezeCache(targetLogin);
    if (cached && !document.getElementById(INJECTED_ID)) {
      const profileCard = await waitForProfileCard();
      if (profileCard && !document.getElementById(INJECTED_ID)) {
        buildFreezeCard(profileCard, cached);
      }
    }

    const token = await waitForToken(20000);
    if (!token) return;

    const cursusList = await fetchCursusData(targetLogin, token);
    if (!Array.isArray(cursusList) || cursusList.length === 0) return;

    const frozen = cursusList.find(
      (c: any) =>
        c.freeze_until && new Date(c.freeze_until).getTime() > Date.now(),
    );
    const freezeUntil: string | null = frozen?.freeze_until ?? null;
    await writeFreezeCache(targetLogin, freezeUntil);

    if (!freezeUntil) {
      removeFreezeCard();
      return;
    }

    const shown = document.getElementById(INJECTED_ID);
    if (shown?.dataset.freezeUntil === freezeUntil) return;

    removeFreezeCard();
    const profileCard = await waitForProfileCard();
    if (!profileCard) return;
    buildFreezeCard(profileCard, freezeUntil);
  } finally {
    if (!document.getElementById(INJECTED_ID)) _running = false;
  }
}
