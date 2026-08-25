import { getConfig } from "../../config.ts";
import { getCloudLogin } from "../account/account.ts";
import { hashLogin } from "../../utils/crypto.ts";
import { createCountdown } from "../../utils/countdown.ts";
import {
  TOOLTIP_SHOW_DELAY,
  hideFloatingTooltip,
  showFloatingTooltip,
} from "../../utils/tooltip.ts";
import { getIsLight } from "./theme/theme-manager.ts";
import { createSkeleton, createSkeletonLines } from "../../utils/skeleton.ts";

const WORKER_URL = "https://api.betterintra.com";
const CARD_ID = "ft-roulette-card";

let rouletteStatsInitialized = false;
let rouletteStatsPolling = false;
let countdownInterval: number | null = null;

interface RouletteEntry {
  historic_id: number;
  sum: number;
  total: number;
  created_at: string;
}

interface EvalStatsData {
  byMonth: Record<
    string,
    { total: number; failed: number; successPercentage: number | null }
  >;
  global: { total: number; failed: number; successPercentage: number | null };
}

function formatRouletteDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function nextRouletteTimestamp(from: number): number {
  const d = new Date(from);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6, 0, 0),
  );
  while (next.getUTCDay() !== 5 || next.getTime() <= from) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime();
}

function getNextRoulette(): {
  days: number;
  hours: number;
  minutes: number;
  dateLabel: string;
} {
  const now = Date.now();
  const nextMs = nextRouletteTimestamp(now);
  const diff = nextMs - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  const d = new Date(nextMs);
  const dateLabel = `${d.toLocaleDateString("en-US", { weekday: "long" })} ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "long" })}, 8:00`;

  return { days, hours, minutes, dateLabel };
}

function getCountdownParts(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = Date.now();
  const nextMs = nextRouletteTimestamp(now);
  const diff = nextMs - now;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function getTargetLogin(): string | null {
  if (location.pathname.startsWith("/users/")) {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[1] || null;
  }
  return null;
}

async function fetchProfileStats(targetLogin: string): Promise<{
  roulette: RouletteEntry[];
  evalStats: EvalStatsData | null;
}> {
  const cloudLogin = await getCloudLogin();
  const sessionToken = await getConfig("CLOUD_TOKEN");
  if (!cloudLogin || !sessionToken) return { roulette: [], evalStats: null };

  const hashedLogin = await hashLogin(cloudLogin);

  try {
    const params = new URLSearchParams({
      login: hashedLogin,
      target: targetLogin,
      force: "1",
    });
    const res = await fetch(
      `${WORKER_URL}/api/v1/private/profile-stats?${params}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      },
    );
    if (!res.ok) return { roulette: [], evalStats: null };

    const data = (await res.json()) as {
      roulette: { entries: RouletteEntry[] };
      evalStats: EvalStatsData;
    };

    return {
      roulette: data.roulette?.entries || [],
      evalStats: data.evalStats || null,
    };
  } catch {
    return { roulette: [], evalStats: null };
  }
}

function buildRouletteSection(
  entries: RouletteEntry[],
  showHistory: boolean,
  loading: boolean,
): HTMLElement {
  const section = document.createElement("div");

  const wins = new Set(entries.map((e) => formatRouletteDate(e.created_at)))
    .size;
  const points = entries.reduce((acc, e) => acc + e.sum, 0);
  const { dateLabel } = getNextRoulette();

  const counters = document.createElement("div");
  counters.className = "flex flex-row justify-around items-stretch my-2 gap-3";

  const winCol = document.createElement("span");
  winCol.style.cssText =
    "display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 10px; color: rgb(59,130,246); background: rgba(59,130,246,0.1);";
  const winLabel = document.createElement("span");
  winLabel.className =
    "text-sm font-semibold opacity-70 uppercase tracking-wide";
  winLabel.textContent = "Wins";
  winCol.appendChild(winLabel);
  const winValue = document.createElement("span");
  winValue.style.cssText =
    "font-size: 26px; font-weight: 700; margin-left: 6px;";
  if (loading) {
    winValue.appendChild(createSkeleton({ width: "28px", height: "20px" }));
  } else {
    winValue.textContent = String(wins);
  }
  winCol.appendChild(winValue);
  counters.appendChild(winCol);

  const ptsCol = document.createElement("span");
  ptsCol.style.cssText =
    "display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 10px; color: rgb(34,197,94); background: rgba(34,197,94,0.1);";
  const ptsLabel = document.createElement("span");
  ptsLabel.className =
    "text-sm font-semibold opacity-70 uppercase tracking-wide";
  ptsLabel.textContent = "Points";
  ptsCol.appendChild(ptsLabel);
  const ptsValue = document.createElement("span");
  ptsValue.style.cssText =
    "font-size: 26px; font-weight: 700; margin-left: 6px;";
  if (loading) {
    ptsValue.appendChild(createSkeleton({ width: "36px", height: "20px" }));
  } else {
    ptsValue.textContent = String(points);
  }
  ptsCol.appendChild(ptsValue);
  counters.appendChild(ptsCol);

  const nextCol = document.createElement("span");
  nextCol.style.cssText =
    "display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 10px; color: rgb(245,158,11); background: rgba(245,158,11,0.1);";
  const nextLabel = document.createElement("span");
  nextLabel.className =
    "text-sm font-semibold opacity-70 uppercase tracking-wide";
  nextLabel.textContent = "Next";
  nextCol.appendChild(nextLabel);
  const parts = getCountdownParts();
  const countdown = createCountdown(
    [parts.days, parts.hours, parts.minutes, parts.seconds],
    { digits: 2 },
  );
  countdown.el.id = "ft-roulette-countdown";
  countdown.el.style.cssText =
    "font-size: 26px; font-weight: 700; margin-left: 6px;";
  nextCol.appendChild(countdown.el);
  counters.appendChild(nextCol);

  section.appendChild(counters);

  if (showHistory && loading) {
    const divider = document.createElement("div");
    divider.style.cssText =
      "border-top: 1px solid hsl(var(--border)); margin: 8px 0;";
    section.appendChild(divider);

    const list = document.createElement("div");
    list.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px;";
    for (const width of ["120px", "104px", "112px"]) {
      list.appendChild(
        createSkeleton({ width, height: "30px", radius: "999px" }),
      );
    }
    section.appendChild(list);
  }

  if (showHistory && !loading && entries.length > 0) {
    const divider = document.createElement("div");
    divider.style.cssText =
      "border-top: 1px solid hsl(var(--border)); margin: 8px 0;";
    section.appendChild(divider);

    const scrollWrap = document.createElement("div");
    scrollWrap.style.cssText = "overflow-y: auto; max-height: 100px;";

    const list = document.createElement("div");
    list.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px;";

    const grouped = new Map<string, number>();
    for (const entry of entries) {
      const dateStr = formatRouletteDate(entry.created_at);
      grouped.set(dateStr, (grouped.get(dateStr) || 0) + entry.sum);
    }
    for (const [dateStr, totalSum] of grouped) {
      const badge = document.createElement("span");
      badge.style.cssText =
        "display: inline-flex; align-items: center; gap: 8px; background: rgba(34,197,94,0.1); color: rgb(34,197,94); font-size: 14px; font-weight: 600; padding: 6px 16px; border-radius: 999px; white-space: nowrap;";
      const datePart = document.createElement("span");
      datePart.style.cssText =
        "opacity: 0.65; font-size: 13px; font-weight: 600;";
      datePart.textContent = dateStr;
      badge.appendChild(datePart);
      const plus = document.createElement("span");
      plus.style.cssText = "font-size: 16px; font-weight: 700;";
      plus.textContent = `+${totalSum}`;
      badge.appendChild(plus);
      list.appendChild(badge);
    }

    scrollWrap.appendChild(list);
    section.appendChild(scrollWrap);
  }

  return section;
}

function buildEvalStatsSection(data: EvalStatsData): HTMLElement {
  const section = document.createElement("div");

  const titleRow = document.createElement("div");
  titleRow.style.cssText =
    "display: flex; align-items: center; gap: 8px; margin-bottom: 8px;";

  const titleWrap = document.createElement("div");
  titleWrap.className = "inline-flex";
  const title = document.createElement("span");
  title.className = "font-bold uppercase text-sm cursor-help";
  title.textContent = "Evaluations as Corrector";
  titleWrap.appendChild(title);
  titleRow.appendChild(titleWrap);

  const tooltipText =
    "Shows how many times you acted as a corrector (evaluator) per month, and how many of those evaluations you marked as failed (below 50%) — with the success percentage";
  let hovered = false;
  let tooltipTimer: number | null = null;
  title.addEventListener("mouseenter", () => {
    hovered = true;
    if (tooltipTimer !== null) window.clearTimeout(tooltipTimer);
    tooltipTimer = window.setTimeout(() => {
      tooltipTimer = null;
      void getIsLight().then((isLight) => {
        if (hovered)
          showFloatingTooltip(title, tooltipText, isLight, document.body);
      });
    }, TOOLTIP_SHOW_DELAY);
  });
  title.addEventListener("mouseleave", () => {
    hovered = false;
    if (tooltipTimer !== null) {
      window.clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }
    hideFloatingTooltip();
  });

  const badgesWrap = document.createElement("div");
  badgesWrap.style.cssText =
    "display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; white-space: nowrap;";

  function makeBadge(
    containerStyle: string,
    label: string,
    value: string,
  ): HTMLSpanElement {
    const badge = document.createElement("span");
    badge.style.cssText = containerStyle;
    const labelEl = document.createElement("span");
    labelEl.className =
      "text-sm font-semibold opacity-70 uppercase tracking-wide";
    labelEl.textContent = label;
    badge.appendChild(labelEl);
    const valueEl = document.createElement("span");
    valueEl.style.cssText =
      "font-size: 20px; font-weight: 700; margin-left: 6px;";
    valueEl.textContent = value;
    badge.appendChild(valueEl);
    return badge;
  }

  if (data.global.successPercentage !== null) {
    const color =
      data.global.successPercentage >= 67 ? "rgb(34,197,94)" : "rgb(239,68,68)";
    const badge = document.createElement("span");
    badge.style.cssText = `font-size: 20px; font-weight: 700; padding: 10px 20px; border-radius: 10px; color: ${color}; background: rgba(${data.global.successPercentage >= 67 ? "34,197,94" : "239,68,68"},0.1);`;
    badge.textContent = `${data.global.successPercentage}%`;
    badgesWrap.appendChild(badge);
  }

  badgesWrap.appendChild(
    makeBadge(
      "display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 10px; color: rgb(59,130,246); background: rgba(59,130,246,0.1);",
      "total",
      String(data.global.total),
    ),
  );

  badgesWrap.appendChild(
    makeBadge(
      "display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 10px; color: rgb(239,68,68); background: rgba(239,68,68,0.1);",
      "failed",
      String(data.global.failed),
    ),
  );

  titleRow.appendChild(badgesWrap);

  section.appendChild(titleRow);

  const tableWrap = document.createElement("div");

  const table = document.createElement("table");
  table.style.cssText =
    "width: 100% !important; border-collapse: collapse !important; font-size: 12px !important;";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.style.cssText =
    "border-bottom: 1px solid hsl(var(--primary) / 0.2) !important;";
  const headers = ["Month", "Total", "Failed", "Success %"];
  for (const h of headers) {
    const th = document.createElement("th");
    th.style.cssText =
      "text-align: left !important; padding: 4px 4px !important; font-weight: 500 !important; color: hsl(var(--primary) / 0.6) !important;";
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const months = Object.keys(data.byMonth).sort().reverse();
  for (const month of months) {
    const m = data.byMonth[month];
    const tr = document.createElement("tr");
    tr.style.cssText =
      "border-bottom: 1px solid hsl(var(--primary) / 0.2) !important;";

    const dateTd = document.createElement("td");
    dateTd.style.cssText =
      "padding: 4px 4px !important; color: hsl(var(--primary) / 0.5) !important;";
    const [yearNum, monthNum] = month.split("-");
    dateTd.textContent = `${monthNum}/${yearNum}`;
    tr.appendChild(dateTd);

    const totalTd = document.createElement("td");
    totalTd.style.cssText =
      "padding: 4px 4px !important; font-weight: 500 !important; color: inherit !important;";
    totalTd.textContent = String(m.total);
    tr.appendChild(totalTd);

    const failedTd = document.createElement("td");
    failedTd.style.cssText =
      "padding: 4px 4px !important; color: inherit !important;";
    if (m.failed > 0) failedTd.style.color = "rgb(239,68,68) !important";
    failedTd.textContent = String(m.failed);
    tr.appendChild(failedTd);

    const pctTd = document.createElement("td");
    pctTd.style.cssText =
      "padding: 4px 4px !important; font-weight: 500 !important;";
    if (m.successPercentage !== null) {
      pctTd.style.color =
        m.successPercentage >= 80
          ? "rgb(34,197,94) !important"
          : "rgb(239,68,68) !important";
      pctTd.textContent = `${m.successPercentage}%`;
    } else {
      pctTd.textContent = "—";
      pctTd.style.color = "hsl(var(--primary) / 0.3) !important";
    }
    tr.appendChild(pctTd);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  section.appendChild(tableWrap);

  return section;
}

function buildEvalStatsSkeleton(): HTMLElement {
  const section = document.createElement("div");

  const titleRow = document.createElement("div");
  titleRow.style.cssText =
    "display: flex; align-items: center; gap: 8px; margin-bottom: 8px;";

  const title = document.createElement("span");
  title.className = "font-bold uppercase text-sm";
  title.textContent = "Evaluations as Corrector";
  titleRow.appendChild(title);

  const badgesWrap = document.createElement("div");
  badgesWrap.style.cssText =
    "display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0;";
  for (const width of ["74px", "96px", "104px"]) {
    badgesWrap.appendChild(
      createSkeleton({ width, height: "42px", radius: "10px" }),
    );
  }
  titleRow.appendChild(badgesWrap);
  section.appendChild(titleRow);

  section.appendChild(
    createSkeletonLines(4, { width: "100%", height: "18px" }),
  );

  return section;
}

function ensureCard(): HTMLElement | null {
  const existing = document.getElementById(CARD_ID);
  if (existing) return existing;

  const grid =
    document.querySelector(".dash-main") ||
    document.querySelector(".bg-white.md\\:h-96")?.parentElement;
  if (!grid) return null;

  const card = document.createElement("div");
  card.id = CARD_ID;
  card.className = "bg-white md:h-96 md:drop-shadow-md md:rounded-lg";
  card.style.cssText =
    "overflow: hidden; display: flex; flex-direction: column; height: 384px;";
  grid.appendChild(card);
  return card;
}

/**
 * Fills the card in place. Called once with `loading` while the worker request
 * is in flight, so the card holds its slot in the grid from the first frame,
 * then again with the data once it lands.
 */
function renderCard(
  card: HTMLElement,
  rouletteEntries: RouletteEntry[],
  evalStats: EvalStatsData | null,
  showRouletteHistory: boolean,
  loading: boolean,
) {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  card.textContent = "";

  const topSection = document.createElement("div");
  topSection.style.cssText =
    "flex: 1; min-height: 0; overflow-y: scroll; padding: 24px 24px 12px 24px;";

  const rouletteTitle = document.createElement("div");
  rouletteTitle.style.cssText =
    "font-weight: 700; text-transform: uppercase; font-size: 14px; margin-bottom: 8px;";
  rouletteTitle.textContent = "Thursday Roulette";
  topSection.appendChild(rouletteTitle);

  topSection.appendChild(
    buildRouletteSection(rouletteEntries, showRouletteHistory, loading),
  );

  card.appendChild(topSection);

  if (loading || evalStats) {
    const divider = document.createElement("div");
    divider.style.cssText =
      "border-top: 1px solid hsl(var(--primary) / 0.2); flex-shrink: 0; margin: 0 24px;";
    card.appendChild(divider);

    const bottomSection = document.createElement("div");
    bottomSection.style.cssText =
      "flex: 1; min-height: 0; overflow-y: scroll; padding: 12px 24px 24px 24px;";
    bottomSection.appendChild(
      evalStats ? buildEvalStatsSection(evalStats) : buildEvalStatsSkeleton(),
    );
    card.appendChild(bottomSection);
  }

  countdownInterval = window.setInterval(() => {
    const host = document.getElementById("ft-roulette-countdown");
    if (!host?.shadowRoot) {
      if (countdownInterval !== null) clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }
    const segs =
      host.shadowRoot.querySelectorAll<HTMLSpanElement>(".countdown > span");
    if (segs.length === 0) {
      if (countdownInterval !== null) clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }
    const parts = getCountdownParts();
    const values = [parts.days, parts.hours, parts.minutes, parts.seconds];
    segs.forEach((seg, i) => {
      const value = String(values[i] ?? 0);
      seg.style.setProperty("--value", value);
      seg.setAttribute("aria-label", value);
      seg.textContent = value.padStart(2, "0");
    });
  }, 1000);
}

export async function initRouletteStats() {
  if (rouletteStatsInitialized || rouletteStatsPolling) return;
  if (!(await getConfig("PROFILE_SHOW_ROULETTE"))) return;

  if (
    location.hostname !== "profile-v3.intra.42.fr" ||
    !(location.pathname === "/" || location.pathname.startsWith("/users"))
  )
    return;

  const showHistory = await getConfig("PROFILE_SHOW_ROULETTE_HISTORY");
  const cloudLogin = await getCloudLogin();
  const targetLogin = getTargetLogin() || cloudLogin;
  if (!targetLogin) return;

  rouletteStatsPolling = true;

  // Fire the worker request right away: it must not wait for the intra grid to
  // be in the DOM, otherwise the card can only be filled after both are done.
  const statsPromise = fetchProfileStats(targetLogin).catch(() => ({
    roulette: [] as RouletteEntry[],
    evalStats: null as EvalStatsData | null,
  }));

  let attempts = 0;
  const poll = () => {
    if (++attempts > 30) {
      rouletteStatsPolling = false;
      return;
    }

    const card = ensureCard();
    if (!card) {
      requestAnimationFrame(poll);
      return;
    }

    // The card takes its slot in the grid immediately, with placeholders where
    // the worker values go, so nothing pops in once the request resolves.
    renderCard(card, [], null, showHistory, true);

    statsPromise.then(({ roulette, evalStats }) => {
      rouletteStatsInitialized = true;
      rouletteStatsPolling = false;
      renderCard(card, roulette, evalStats, showHistory, false);
    });
  };
  requestAnimationFrame(poll);
}
