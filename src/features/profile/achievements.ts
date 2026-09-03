import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { getConfig } from "../../config.ts";
import { getCloudLogin } from "../account/account.ts";
import { getLoginFromPage } from "../../utils/profile-login.ts";
import { INTRA_FONT } from "../logtime/constants.ts";
import CHECK_CIRCLE_SVG from "../../assets/svg/check-circle.svg?raw";

interface Achievement {
  name: string;
  achieved_at: string;
  description: string;
  svg: string;
}

const INJECTED_ID = "ft-achievements-injected";
let achievementsInitialized = false;
let lastInjectedLogin: string | null = null;

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

async function fetchAchievements(
  login: string,
  token: string,
): Promise<Achievement[]> {
  try {
    const res = await fetch(
      `https://intrapy.intra.42.fr/api/v1/users/${login}/achievements`,
      { headers: { Authorization: token } },
    );
    if (!res.ok) return [];
    return (await res.json()) as Achievement[];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function findCard(): HTMLElement | null {
  for (const card of document.querySelectorAll<HTMLElement>(
    ".bg-white.md\\:h-96",
  )) {
    if (
      card
        .querySelector("[class*='uppercase']")
        ?.textContent?.trim()
        .toUpperCase() === "LAST ACHIEVEMENTS"
    )
      return card;
  }
  return null;
}

function renderList(
  achievements: Achievement[],
  svgCache: Map<string, string>,
) {
  return html`<div
    class="grid gap-4 mt-4"
    style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))"
  >
    ${achievements.map(
      (a) =>
        html` <div
          class="w-full border-2 border-neutral-200 flex flex-row justify-between rounded-sm h-24"
        >
          <div class="p-3 flex flex-row justify-between w-full items-center">
            <div class="flex flex-col min-w-0 flex-1">
              <h1 class="text-base font-medium leading-none">${a.name}</h1>
              <p
                class="text-xs max-h-10 overflow-y-auto text-neutral-400 pt-2"
                style="scrollbar-width:none"
              >
                ${a.description}
              </p>
            </div>
            <div class="pt-1 flex flex-row gap-1 shrink-0 ml-3">
              <div>
                <span
                  class="size-6 flex items-center justify-center"
                  style="color: hsl(var(--legacy-main))"
                  >${unsafeHTML(CHECK_CIRCLE_SVG)}</span
                >
              </div>
              <div>
                <p class="font-bold text-legacy-main">Achieved</p>
                <p>${formatDate(a.achieved_at)}</p>
              </div>
            </div>
          </div>
          <div class="bg-zinc-100 w-20 grid place-items-center shrink-0">
            ${svgCache.has(a.svg)
              ? html`<div style="width:45px;height:45px">
                  ${unsafeHTML(
                    svgCache.get(a.svg)!.replace(/(width|height)="[^"]*"/g, ""),
                  )}
                </div>`
              : html`<div
                  class="w-8 h-8 bg-zinc-200 rounded-sm animate-pulse"
                ></div>`}
          </div>
        </div>`,
    )}
  </div>`;
}

function inject(achievements: Achievement[]) {
  const existing = document.getElementById(INJECTED_ID);
  const card = findCard();
  if (!card) {
    if (existing) existing.remove();
    return;
  }

  const grid = card.querySelector<HTMLElement>(
    ":scope .h-full .grid, :scope .grid",
  );
  const area = grid?.parentElement;
  if (!area) return;

  if (existing) {
    if (grid) grid.style.display = "";
    existing.remove();
  }
  if (grid) grid.style.display = "none";

  const container = document.createElement("div");
  container.id = INJECTED_ID;
  container.style.cssText = `font-family: ${INTRA_FONT};`;

  const svgCache = new Map<string, string>();
  const load = (a: Achievement) => {
    const curried = () => render(renderList(achievements, svgCache), container);
    if (svgCache.has(a.svg)) {
      curried();
      return;
    }
    fetch(a.svg)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        if (t) svgCache.set(a.svg, t);
        curried();
      })
      .catch(() => {});
  };
  for (const a of achievements) load(a);
  render(renderList(achievements, svgCache), container);
  area.appendChild(container);
}

async function tryInject(achievements: Achievement[]) {
  const sorted = [...achievements].sort(
    (a, b) =>
      new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime(),
  );
  let attempts = 0;
  const poll = () => {
    if (++attempts > 50) return;
    if (!findCard()) {
      requestAnimationFrame(poll);
      return;
    }
    inject(sorted);
  };
  requestAnimationFrame(poll);
}

export async function initAchievements() {
  if (!(await getConfig("PROFILE_SHOW_ACHIEVEMENTS"))) return;
  if (
    location.hostname !== "profile-v3.intra.42.fr" ||
    location.pathname !== "/"
  )
    return;

  const pageLogin = getLoginFromPage();
  const login = (await getCloudLogin()) || pageLogin;
  if (!login) return;
  if (achievementsInitialized && login === lastInjectedLogin) return;

  const token = await waitForToken(30000);
  if (!token) return;
  achievementsInitialized = true;
  lastInjectedLogin = login;

  const achievements = await fetchAchievements(login, token);
  if (achievements.length === 0) return;

  await tryInject(achievements);
}
