import { render } from "lit-html";
import { getConfig } from "../../config.ts";
import { hashLogin } from "../../utils/crypto.ts";
import {
  findLogtimeMount,
  hideOldLogtime,
  setupScrollHandlers,
} from "./dom.ts";
import {
  renderContainer,
  renderHeaderContent,
  renderMonthCard,
  renderLoadMoreCard,
  renderYearLabel,
} from "./render.ts";
import { renderCompactMonthGroup, MonthEntry, chunkMonths } from "./compact.ts";
import { renderHeatmapCard } from "./heatmap.ts";
import { getLastSeenFormatted, limit } from "./utils.ts";
import { getEffectiveTheme, getIsLight, THEMES } from "../profile/theme/theme-manager.ts";
import { bindTooltips } from "../../utils/tooltip.ts";
import { syncCalendarIcs } from "../calendar/calendar-sync.ts";

export interface CalendarEvent {
  id: number;
  name: string;
  kind: string;
  begin_at: string;
  end_at: string;
  location: string;
  is_subscribed: boolean;
}

export type EventsByDate = Record<string, CalendarEvent[]>;

const INTRAPY_BASE = "https://intrapy.intra.42.fr";
const WORKER_URL = "https://api.betterintra.com";

const historyCache = new Map<string, Record<string, number>>();
const fetchPromiseMap = new Map<string, Promise<void>>();

let loadMoreLogin: string | null = null;
let loadMoreBefore: string | undefined;
let loadMoreLoading = false;
let restoreScrollLeft = -1;
let skipScroll = false;

function extractLoginFromPath(): string | null {
  const m = location.pathname.match(/^\/users\/([^/]+)/);
  return m ? m[1] : null;
}

async function fetchHistoricalLogtime(
  login: string,
  before?: string,
): Promise<void> {
  if (historyCache.has(login)) return;
  if (fetchPromiseMap.has(login)) {
    await fetchPromiseMap.get(login);
    return;
  }

  const promise = (async () => {
    try {
      const cloudLogin = await getConfig("CLOUD_LOGIN");
      const sessionToken = await getConfig("CLOUD_TOKEN");
      if (!cloudLogin || !sessionToken) {
        historyCache.set(login, {});
        return;
      }

      const hashed = await hashLogin(cloudLogin);
      let url = `${WORKER_URL}/api/v1/private/logtime/history?login=${encodeURIComponent(hashed)}&user=${encodeURIComponent(login)}`;
      if (before) url += `&before=${encodeURIComponent(before)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.days) {
          historyCache.set(login, data.days as Record<string, number>);
          return;
        }
      }
    } catch {}

    historyCache.set(login, {});
  })();

  fetchPromiseMap.set(login, promise);
  await promise;
  fetchPromiseMap.delete(login);
}

function mergeHistoryWithHook(
  hookData: Record<string, string>,
  login: string,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const history = historyCache.get(login);

  if (history) {
    for (const [date, secs] of Object.entries(history)) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      merged[date] =
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }

  for (const [date, time] of Object.entries(hookData)) {
    merged[date] = time;
  }

  return merged;
}

const getConfigs = async () => ({
  goal_hours: await getConfig("LOGTIME_GOAL_HOURS"),
  show_average: await getConfig("LOGTIME_SHOW_AVERAGE"),
  show_goal: await getConfig("LOGTIME_SHOW_GOAL"),
  show_tacos: await getConfig("LOGTIME_SHOW_TACOS"),
  emoji: limit(await getConfig("LOGTIME_EMOJI")),
  divisor: await getConfig("LOGTIME_EMOJI_DIVISOR"),
  rate: await getConfig("LOGTIME_EMOJI_RATE"),
  show_days_mode: await getConfig("LOGTIME_SHOW_DAYS_MODE"),
  calendar_color: await getConfig("LOGTIME_CALENDAR_COLOR"),
  labels_color: await getConfig("LOGTIME_LABELS_COLOR"),
  disable_animations: await getConfig("DISABLE_ANIMATIONS"),
  max_earnings: await getConfig("LOGTIME_MAX_EARNINGS"),
  calendar_view: await getConfig("LOGTIME_CALENDAR_VIEW"),
});

export type LogtimeConfig = Awaited<ReturnType<typeof getConfigs>>;

let isLoaded = false;
let CONFIG: LogtimeConfig;
export let lastStats: Record<string, string> | null = null;
let currentTheme = "light";
let primaryColor = "hsl(199 89% 48%)";
let primaryContent = "hsl(0 0% 100%)";
let scrollHandlersCleanup: (() => void) | null = null;
let heatmapScrollHandler: ((e: Event) => void) | null = null;

function isOwnProfile(): boolean {
  return (
    location.hostname === "profile-v3.intra.42.fr" && location.pathname === "/"
  );
}

function groupEventsByDate(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  const byDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const iso = ev.begin_at.endsWith("Z") ? ev.begin_at : ev.begin_at + "Z";
    const d = new Date(iso);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(ev);
  }
  return byDate;
}

async function fetchEvents(): Promise<Record<string, CalendarEvent[]>> {
  try {
    const token = sessionStorage.getItem("ft_intrapy_token");
    if (!token) return {};
    const res = await fetch(`${INTRAPY_BASE}/api/v1/users/me/events`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, CalendarEvent>;
    return groupEventsByDate(Object.values(data));
  } catch {
    return {};
  }
}

function renderLogtime(
  stats: Record<string, string>,
  eventsByDate?: Record<string, CalendarEvent[]>,
): void {
  if (!stats || !CONFIG) return;
  lastStats = stats;

  const byMonth: Record<string, Record<string, number>> = {};
  Object.keys(stats)
    .sort()
    .forEach((d) => {
      const ym = d.slice(0, 7);
      if (!byMonth[ym]) byMonth[ym] = {};
      const [h = 0, m = 0, s = 0] = (stats[d] || "00:00:00")
        .split(":")
        .map(Number);
      byMonth[ym][d] = h * 3600 + m * 60 + s;
    });

  const monthKeys = Object.keys(byMonth).sort();
  const monthCards: ReturnType<
    | typeof renderMonthCard
    | typeof renderYearLabel
    | typeof renderCompactMonthGroup
    | typeof renderHeatmapCard
  >[] = [];

  if (CONFIG.calendar_view === "heatmap") {
    monthCards.push(renderHeatmapCard(stats, CONFIG));
  } else if (CONFIG.calendar_view === "compact" && monthKeys.length > 1) {
    const lastYm = monthKeys[monthKeys.length - 1];
    const pastMonthEntries: MonthEntry[] = monthKeys
      .slice(0, -1)
      .map((ym) => ({ ym, data: byMonth[ym] }));

    const sections: { year: string; months: MonthEntry[] }[] = [];
    if (pastMonthEntries.length > 0) {
      let cy = pastMonthEntries[0].ym.slice(0, 4);
      let cm: MonthEntry[] = [];
      for (const entry of pastMonthEntries) {
        const yr = entry.ym.slice(0, 4);
        if (yr !== cy) {
          sections.push({ year: cy, months: cm });
          cy = yr;
          cm = [];
        }
        cm.push(entry);
      }
      sections.push({ year: cy, months: cm });
    }

    // Build flat list of all groups with year info
    const allGroups: {
      group: MonthEntry[];
      year: string;
      isFirstInYear: boolean;
    }[] = [];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const groups = chunkMonths(sec.months);
      for (let gi = 0; gi < groups.length; gi++) {
        allGroups.push({
          group: groups[gi],
          year: sec.year,
          isFirstInYear: gi === 0 && si > 0,
        });
      }
    }

    // Fix trailing singleton: if last group is alone, merge with previous
    if (
      allGroups.length >= 2 &&
      allGroups[allGroups.length - 1].group.length === 1
    ) {
      const merged = [
        ...allGroups[allGroups.length - 2].group,
        ...allGroups[allGroups.length - 1].group,
      ];
      const reChunked = chunkMonths(merged);
      allGroups.splice(allGroups.length - 2, 2);
      for (const g of reChunked) {
        allGroups.push({
          group: g,
          year:
            allGroups.length > 0
              ? allGroups[allGroups.length - 1].year
              : sections[0].year,
          isFirstInYear: false,
        });
      }
    }

    // Render with year labels interspersed
    for (const g of allGroups) {
      if (g.isFirstInYear) {
        monthCards.push(renderYearLabel(g.year));
      }
      monthCards.push(renderCompactMonthGroup(g.group, CONFIG));
    }

    monthCards.push(
      renderMonthCard(lastYm, byMonth[lastYm], true, CONFIG, eventsByDate),
    );
  } else {
    let prevYear = "";
    for (const ym of monthKeys) {
      const year = ym.slice(0, 4);
      if (year !== prevYear && prevYear !== "") {
        monthCards.push(renderYearLabel(year));
      }
      prevYear = year;
      monthCards.push(
        renderMonthCard(
          ym,
          byMonth[ym],
          ym === monthKeys[monthKeys.length - 1],
          CONFIG,
          eventsByDate,
        ),
      );
    }
  }

  if (loadMoreLogin && monthCards.length > 0) {
    const login = loadMoreLogin;
    const before = loadMoreBefore;
    monthCards.unshift(
      renderLoadMoreCard(async () => {
        loadMoreLoading = true;
        const host = document.getElementById("logtime-shadow-wrapper");
        const root = host?.shadowRoot;
        const sw = root?.querySelector(
          ".log-slider-fixed",
        ) as HTMLElement | null;
        const hookMonth = before?.slice(0, 7);
        let anchor = hookMonth
          ? (root?.querySelector(
              `[data-month="${hookMonth}"]`,
            ) as HTMLElement | null)
          : null;
        if (anchor && !anchor.classList.contains("month-card")) {
          anchor = anchor.closest(".month-card") as HTMLElement | null;
        }
        const anchorOffset = anchor ? anchor.offsetLeft : 0;
        const savedScroll = sw ? sw.scrollLeft : 0;

        restoreScrollLeft = savedScroll;
        renderLogtime(stats, eventsByDate);

        await fetchHistoricalLogtime(login, before);
        loadMoreLogin = null;
        loadMoreBefore = undefined;
        loadMoreLoading = false;

        const merged = mergeHistoryWithHook(stats, login);
        skipScroll = true;
        renderLogtime(merged, eventsByDate);

        let newAnchor = root?.querySelector(
          `[data-month="${hookMonth}"]`,
        ) as HTMLElement | null;
        if (newAnchor && !newAnchor.classList.contains("month-card")) {
          newAnchor = newAnchor.closest(".month-card") as HTMLElement | null;
        }
        const shift = (newAnchor?.offsetLeft ?? anchorOffset) - anchorOffset;
        const newSw = root?.querySelector(
          ".log-slider-fixed",
        ) as HTMLElement | null;
        if (newSw) {
          requestAnimationFrame(() => {
            newSw.scrollLeft = Math.max(0, savedScroll + shift);
          });
        }
      }, loadMoreLoading),
    );
  }

  const lastSeenValue = getLastSeenFormatted(stats, CONFIG.show_days_mode);
  const handleViewChange = async (value: string) => {
    await chrome.storage.local.set({ LOGTIME_CALENDAR_VIEW: value });
    CONFIG.calendar_view = value;
    if (lastStats) renderLogtime(lastStats);
  };
  const header = renderHeaderContent(
    lastSeenValue,
    byMonth,
    CONFIG,
    CONFIG.calendar_view,
    handleViewChange,
    primaryColor,
    primaryContent,
  );

  let shadowHost = document.getElementById("logtime-shadow-wrapper");
  if (!shadowHost) {
    shadowHost = document.createElement("div");
    shadowHost.id = "logtime-shadow-wrapper";
    const mount = findLogtimeMount();
    if (mount) mount.prepend(shadowHost);
    shadowHost.attachShadow({ mode: "open" });
  }
  if (shadowHost.shadowRoot) bindTooltips(shadowHost.shadowRoot, getIsLight);
  hideOldLogtime();

  render(
    renderContainer(header, monthCards, currentTheme, CONFIG),
    shadowHost.shadowRoot!,
  );

  const scrollWrapper = shadowHost.shadowRoot!.querySelector(
    ".log-slider-fixed",
  ) as HTMLElement;
  if (scrollWrapper) {
    if (scrollHandlersCleanup) {
      scrollHandlersCleanup();
      scrollHandlersCleanup = null;
    }
    scrollHandlersCleanup = setupScrollHandlers(scrollWrapper);

    if (CONFIG.calendar_view === "heatmap") {
      if (heatmapScrollHandler) {
        scrollWrapper.removeEventListener("scroll", heatmapScrollHandler);
        heatmapScrollHandler = null;
      }
      const yearLabel = shadowHost.shadowRoot!.getElementById(
        "heatmap-sticky-year",
      );
      const handleYearScroll = () => {
        const cols = shadowHost.shadowRoot!.querySelectorAll(".heatmap-column");
        const scrollLeft = scrollWrapper.scrollLeft;
        for (const col of cols) {
          const rect = (col as HTMLElement).getBoundingClientRect();
          const parentRect = scrollWrapper.getBoundingClientRect();
          if (rect.right > parentRect.left + 50) {
            const year = (col as HTMLElement).dataset.year;
            if (year && yearLabel) yearLabel.textContent = year;
            break;
          }
        }
      };
      heatmapScrollHandler = handleYearScroll;
      scrollWrapper.addEventListener("scroll", handleYearScroll, {
        passive: true,
      });
    }
    if (skipScroll) {
      skipScroll = false;
    } else if (restoreScrollLeft >= 0) {
      const target = restoreScrollLeft;
      restoreScrollLeft = -1;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollWrapper.scrollLeft = target;
        });
      });
    } else {
      const scrollToLatest = () => {
        scrollWrapper.scrollLeft =
          scrollWrapper.scrollWidth - scrollWrapper.clientWidth;
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToLatest);
      });
      window.addEventListener("load", scrollToLatest, { once: true });
      setTimeout(scrollToLatest, 100);
    }
  }
}

function isProfileV3TargetPage() {
  return (
    location.hostname === "profile-v3.intra.42.fr" &&
    (location.pathname === "/" || /^\/users\/[^/]+\/?$/.test(location.pathname))
  );
}

function installFetchHook() {
  document.addEventListener("42_LOGTIME_DATA", async (event: Event) => {
    const detail = (event as CustomEvent<Record<string, string>>).detail;
    if (!detail) return;

    const hookDates = Object.keys(detail).sort();
    const before =
      hookDates.length > 0 ? hookDates[hookDates.length - 1] : undefined;

    if (isOwnProfile()) {
      const cloudLogin = await getConfig("CLOUD_LOGIN");
      if (cloudLogin) {
        const hasHistory = historyCache.has(cloudLogin);
        if (!hasHistory) {
          loadMoreLogin = cloudLogin;
          loadMoreBefore = before;
        }
        const stats = hasHistory
          ? mergeHistoryWithHook(detail, cloudLogin)
          : detail;
        renderLogtime(stats);

        fetchEvents().then((events) => {
          renderLogtime(lastStats || detail, events);

          const flatEvents = Object.values(events).flat();
          const subscribed = flatEvents.filter((e) => e.is_subscribed);
          if (subscribed.length > 0) {
            syncCalendarIcs(subscribed);
          }
        });
        return;
      }
    }

    const targetLogin = extractLoginFromPath();
    if (targetLogin) {
      const hasHistory = historyCache.has(targetLogin);
      if (!hasHistory) {
        loadMoreLogin = targetLogin;
        loadMoreBefore = before;
      }
      const stats = hasHistory
        ? mergeHistoryWithHook(detail, targetLogin)
        : detail;
      renderLogtime(stats);
      return;
    }

    renderLogtime(detail);
  });
}

export function applyPublicLogtimeSettings(logtime: {
  calendarColor?: string;
  labelsColor?: string;
  emoji?: string;
  emojiDivisor?: string | number;
  emojiRate?: string | number;
}) {
  if (!isLoaded || !logtime) return;

  CONFIG.calendar_color = logtime.calendarColor ?? CONFIG.calendar_color;
  CONFIG.labels_color = logtime.labelsColor ?? CONFIG.labels_color;
  CONFIG.emoji = logtime.emoji ? limit(logtime.emoji) : CONFIG.emoji;
  CONFIG.divisor =
    logtime.emojiDivisor !== undefined
      ? Number(logtime.emojiDivisor)
      : CONFIG.divisor;
  CONFIG.rate =
    logtime.emojiRate !== undefined ? Number(logtime.emojiRate) : CONFIG.rate;

  if (lastStats) {
    renderLogtime(lastStats);
  }
}

export async function initLogtime() {
  if (isLoaded) return;
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  CONFIG = await getConfigs();
  currentTheme = await getEffectiveTheme();
  const presetKey = await getConfig("PROFILE_THEME_PRESET");
  const preset = THEMES[presetKey] ?? THEMES["dark"];
  primaryColor = `hsl(${preset.primary})`;
  primaryContent = `hsl(${preset.primaryForeground})`;
  installFetchHook();

  if (isProfileV3TargetPage()) {
    isLoaded = true;
  }
}
