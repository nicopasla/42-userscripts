import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { HUB_INFO } from "../hub/hubSettings.data.ts";

import GITHUB_SVG from "../../assets/svg/github.svg?raw";
import HEART_SVG from "../../assets/svg/heart.svg?raw";
import ICON_SVG from "../../assets/svg/icon.svg?raw";
import ISSUES_SVG from "../../assets/svg/issues.svg?raw";
import PERSON_FOLLOW_SVG from "../../assets/svg/person-follow.svg?raw";
import PR_SVG from "../../assets/svg/pr.svg?raw";
import STAR_SVG from "../../assets/svg/star.svg?raw";

const QUICK_LINKS = [
  {
    href: HUB_INFO.github,
    svg: GITHUB_SVG,
    label: "GitHub",
    color: "bg-primary text-primary-content",
  },
  {
    href: HUB_INFO.issues,
    svg: ISSUES_SVG,
    label: "Issues",
    color: "bg-secondary text-secondary-content",
  },
  {
    href: `${HUB_INFO.github}/pulls`,
    svg: PR_SVG,
    label: "PRs",
    color: "bg-accent text-accent-content",
  },
];

const starCount = fetch("https://api.github.com/repos/nicopasla/better-intra")
  .then((r) => r.json())
  .then((d) => d.stargazers_count as number)
  .catch(() => null);

const followerCount = fetch("https://api.github.com/users/nicopasla")
  .then((r) => r.json())
  .then((d) => d.followers as number)
  .catch(() => null);

type Stats = {
  total: number;
  newLast30Days: number;
  newLast14Days: number;
  newLast7Days: number;
  countries: { country: string; count: number }[];
};

const communityStats = fetch("https://api.betterintra.com/api/v1/public/stats")
  .then((r) => r.json())
  .then((d) => d as Stats)
  .catch(() => null);

function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map((c) => 127397 + c.charCodeAt(0)),
  );
}

let countryNames: Intl.DisplayNames | null = null;
try {
  countryNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  countryNames = null;
}

function countryName(code: string): string {
  if (!code || code.length !== 2) return "Unknown";
  if (!countryNames) return code;
  try {
    return countryNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function renderAboutPanel(): ReturnType<typeof html> {
  return html`
    <div
      class="card bg-base-100 border border-base-300 shadow-sm w-full h-full overflow-hidden select-none"
    >
      <div
        class="card-body p-4 flex flex-col gap-4 text-base-content overflow-y-auto"
      >
        <!-- Hero -->
        <div class="flex flex-col gap-3 shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="size-12 flex items-center justify-center"
                style="color: #00babc;"
              >
                ${unsafeHTML(ICON_SVG)}
              </div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight">
                  ${HUB_INFO.name}
                </h1>
                <a
                  href="${HUB_INFO.github}/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-sm font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <span>v${HUB_INFO.version}</span>
                </a>
                <a
                  href="https://github.com/nicopasla/better-intra"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-sm gap-1"
                >
                  <span
                    class="size-4 flex items-center justify-center fill-current"
                  >
                    ${unsafeHTML(STAR_SVG)}
                  </span>
                  <span>Star</span>
                  ${until(
                    starCount.then((c) =>
                      c != null
                        ? html`<span class="badge badge-sm font-mono"
                            >${c}</span
                          >`
                        : "",
                    ),
                    html`<span
                      class="loading loading-spinner loading-xs"
                    ></span>`,
                  )}
                </a>
              </div>
            </div>
          </div>
          <p class="text-sm opacity-60 max-w-full">
            UI and UX improvements for 42 Intra v3: logtime calendar, cluster
            map tools, custom profiles, shortcuts, friends widget, and more.
          </p>
        </div>

        <!-- Community -->
        <div class="flex flex-col gap-2 shrink-0">
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-widest">
              Community
            </h2>
            <div class="flex-1 h-px bg-base-300/40"></div>
          </div>
          ${until(
            communityStats.then((s) =>
              s && s.total > 0
                ? html`
                    <div
                      class="flex flex-col gap-3 p-4 bg-base-200 rounded-xl border border-base-300"
                    >
                      <div class="flex items-start justify-between gap-4">
                        <div
                          class="flex flex-col items-center rounded-xl bg-base-100 px-6 py-3"
                          style="border: 2px solid #00babc"
                        >
                          <span
                            class="text-4xl font-bold font-mono leading-none"
                            >${s.total}</span
                          >
                          <span class="text-sm opacity-60 font-semibold"
                            >users</span
                          >
                        </div>
                        <div class="flex items-start justify-end gap-6">
                          ${[
                            {
                              label: "in 30 days",
                              value: s.newLast30Days,
                              color: "#38bdf8",
                            },
                            {
                              label: "in 14 days",
                              value: s.newLast14Days,
                              color: "#4ade80",
                            },
                            {
                              label: "in 7 days",
                              value: s.newLast7Days,
                              color: "#fb923c",
                            },
                          ].map(
                            (w) => html`
                              <div
                                class="flex flex-col items-center rounded-xl bg-base-100 px-6 py-3"
                                style="border: 2px solid ${w.color}"
                              >
                                <span
                                  class="text-3xl font-bold font-mono leading-none"
                                  >+${w.value}</span
                                >
                                <span
                                  class="text-sm text-center opacity-60 font-semibold"
                                  >${w.label}</span
                                >
                              </div>
                            `,
                          )}
                        </div>
                      </div>
                      ${s.countries.length > 0
                        ? html`
                            <div class="flex flex-wrap gap-1 justify-center">
                              ${s.countries.map(
                                (c) => html`
                                  <span
                                    class="badge badge-lg font-mono gap-2 px-4 py-4 bg-base-100"
                                    style="border: 2px solid #00babc"
                                    data-tip="${countryName(c.country)}"
                                  >
                                    <span class="text-2xl"
                                      >${countryFlag(c.country)}</span
                                    >
                                    <span class="text-xl font-bold"
                                      >${c.count}</span
                                    >
                                  </span>
                                `,
                              )}
                            </div>
                          `
                        : ""}
                    </div>
                  `
                : "",
            ),
            html`<div class="loading loading-spinner loading-sm"></div>`,
          )}
        </div>

        <!-- Quick Links -->
        <div class="flex flex-col gap-2 shrink-0">
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-semibold uppercase tracking-widest">
              Quick Links
            </h2>
            <div class="flex-1 h-px bg-base-300/40"></div>
          </div>
          <div class="join w-full">
            ${QUICK_LINKS.map(
              (link) => html`
                <a
                  href="${link.href}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="join-item btn btn-md flex-1 gap-2 border-none ${link.color} transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span
                    class="size-5 flex items-center justify-center fill-current"
                  >
                    ${unsafeHTML(link.svg)}
                  </span>
                  <span class="text-sm font-semibold">${link.label}</span>
                </a>
              `,
            )}
          </div>
        </div>

        <!-- Divider -->
        <div class="divider my-0 opacity-20 shrink-0"></div>

        <!-- Footer -->
        <div class="text-center mt-auto shrink-0">
          <p class="text-sm opacity-50 font-medium">
            Made for 42 Belgium · ${HUB_INFO.license} License
          </p>
          <div class="flex justify-center gap-3 mt-2">
            <a
              href="https://github.com/nicopasla"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm gap-1"
            >
              <span
                class="size-4 flex items-center justify-center fill-current"
              >
                ${unsafeHTML(PERSON_FOLLOW_SVG)}
              </span>
              <span>Follow</span>
              ${until(
                followerCount.then((c) =>
                  c != null
                    ? html`<span class="badge badge-sm font-mono">${c}</span>`
                    : "",
                ),
                html`<span class="loading loading-spinner loading-xs"></span>`,
              )}
            </a>
            <a
              href="https://github.com/sponsors/nicopasla"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm gap-1"
            >
              <span
                class="size-4 flex items-center justify-center fill-current"
              >
                ${unsafeHTML(HEART_SVG)}
              </span>
              <span>Sponsor</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}
