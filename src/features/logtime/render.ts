import { html } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import {
  AVG_ONLY_ACTIVE_DAYS,
  CELL_RADIUS,
  MAX_INTENSITY_SECS,
  PAST_MONTHS_OPACITY,
  INTRA_FONT,
} from "./constants";
import { fmtHours, hexToRgba, safeLabelsColor } from "./utils";
import { LogtimeConfig, CalendarEvent, EventsByDate } from "./logtime";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { escapeHtml } from "../../utils/tooltip.ts";
import LOGTIME_CSS from "./logtime.css?inline";
import VIEW_NORMAL_SVG from "../../assets/svg/view-normal.svg?raw";
import VIEW_COMPACT_SVG from "../../assets/svg/view-compact.svg?raw";
import VIEW_HEATMAP_SVG from "../../assets/svg/view-heatmap.svg?raw";
import VIEW_CAROUSEL_SVG from "../../assets/svg/view-carousel.svg?raw";
import CHEVRON_LEFT_SVG from "../../assets/svg/chevron-left.svg?raw";
import CHEVRON_RIGHT_SVG from "../../assets/svg/chevron-right.svg?raw";
import CHEVRON_DOWN_SVG from "../../assets/svg/chevron-down.svg?raw";

export type CalendarViewId = "normal" | "compact" | "heatmap" | "carousel";

export const CALENDAR_VIEWS: {
  id: CalendarViewId;
  label: string;
  icon: string;
}[] = [
  { id: "normal", label: "Normal", icon: VIEW_NORMAL_SVG },
  { id: "compact", label: "Compact", icon: VIEW_COMPACT_SVG },
  { id: "heatmap", label: "Heatmap", icon: VIEW_HEATMAP_SVG },
  { id: "carousel", label: "Carousel", icon: VIEW_CAROUSEL_SVG },
];

function buildDayTooltipHtml(
  secs: number,
  hasData: boolean,
  events?: CalendarEvent[],
): string {
  const parts: string[] = [];
  if (hasData) parts.push(escapeHtml(fmtHours(secs)));
  if (events) {
    for (const e of events) {
      const url =
        e.kind === "exam"
          ? `https://profile.intra.42.fr/exams/${e.id}`
          : `https://profile.intra.42.fr/events/${e.id}`;
      const color = e.is_subscribed ? "rgb(34,197,94)" : "#ed8179";
      const time = new Date(
        e.begin_at.endsWith("Z") ? e.begin_at : e.begin_at + "Z",
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      parts.push(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" style="color:${color};font-weight:600;text-decoration:none">${e.kind === "exam" ? "📚 " : "📅 "}${escapeHtml(e.name)} - ${escapeHtml(time)}</a>`,
      );
    }
  }
  return parts.join("<br/>");
}

function renderDayCell(
  day: number,
  dKey: string,
  secs: number,
  hasData: boolean,
  todayStr: string,
  config: LogtimeConfig,
  events?: CalendarEvent[],
) {
  const alpha = Math.min(secs / MAX_INTENSITY_SECS, 1);
  const bgColor =
    secs > 0 ? hexToRgba(config.calendar_color, alpha) : "var(--muted)";

  const textColor =
    secs > MAX_INTENSITY_SECS / 2
      ? "var(--primary-foreground)"
      : "var(--muted-foreground)";

  const hasSubscribed = events?.some((e) => e.is_subscribed);
  const hasEvent = events && events.length > 0;
  const isFuture = dKey > todayStr;

  let borderStyle = "";
  if (hasSubscribed) {
    borderStyle =
      "border-color: rgb(34,197,94) !important; border-width: 2px !important;";
  } else if (hasEvent) {
    borderStyle = "border-bottom: 3px solid #eab308 !important;";
  }

  const showTooltip = hasData || hasEvent;

  return html`<div
    class="day-cell aspect-square flex items-center justify-center text-[11px] font-bold ${dKey ===
    todayStr
      ? "today-highlight"
      : ""}"
    style="border-radius: ${CELL_RADIUS}; background: ${bgColor}; color: ${textColor}; ${borderStyle}"
    data-tip-html="${showTooltip
      ? buildDayTooltipHtml(secs, hasData, events)
      : ""}"
    data-tip-size="14px"
  >
    ${String(day)}
  </div>`;
}

function renderCalendarGrid(
  year: number,
  mon: number,
  data: Record<string, number>,
  lastDayDate: number,
  config: LogtimeConfig,
  eventsByDate?: EventsByDate,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const headerRow = ["M", "T", "W", "T", "F", "S", "S", "Total"].map(
    (day, idx) =>
      html`<div
        class="text-[11px] font-extrabold text-center"
        style="color: var(--muted-foreground); ${idx === 7
          ? `border-left: 1px solid var(--color-base-300); color: var(--labels-color);`
          : ""}"
      >
        ${day}
      </div>`,
  );

  const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
  const emptyCells = Array.from({ length: offset }, () => html`<div></div>`);
  const dayRows: ReturnType<typeof html>[] = [];
  let weekSecs = 0;
  let cellCount = offset;

  for (let day = 1; day <= lastDayDate; day++) {
    const dKey = `${year}-${String(mon).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    const hasData = dKey in data;
    const secs = hasData ? data[dKey] : 0;
    weekSecs += secs;

    const dayEvents = eventsByDate?.[dKey];
    dayRows.push(
      renderDayCell(day, dKey, secs, hasData, todayStr, config, dayEvents),
    );
    cellCount++;

    if ((cellCount % 7 === 0 && cellCount > 0) || day === lastDayDate) {
      if (day === lastDayDate && cellCount % 7 !== 0) {
        const fillCount = 7 - (cellCount % 7);
        for (let j = 0; j < fillCount; j++) dayRows.push(html`<div></div>`);
      }

      dayRows.push(
        html`<div
          style="font-size: 14px; font-weight: 700; text-align: right; color: var(--labels-color); padding-right: 4px; display: flex; align-items: center; justify-content: flex-end;"
        >
          ${weekSecs > 0 ? fmtHours(weekSecs) : ""}
        </div>`,
      );
      weekSecs = 0;
    }
  }

  return html`<div
    class="grid gap-x-1.25 gap-y-2"
    style="grid-template-columns: repeat(7, 1fr) 58px;"
  >
    ${headerRow} ${emptyCells} ${dayRows}
  </div>`;
}

export function renderMonthCard(
  ym: string,
  data: Record<string, number>,
  isCurrent: boolean,
  config: LogtimeConfig,
  eventsByDate?: EventsByDate,
) {
  const [year, mon] = ym.split("-").map(Number);
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const lastDayDate = new Date(year, mon, 0).getDate();
  const divisor = AVG_ONLY_ACTIVE_DAYS
    ? Object.values(data).filter((s) => s > 0).length || 1
    : isCurrent
      ? new Date().getDate()
      : lastDayDate;
  const avg = total / divisor;

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, mon - 1),
  );
  const goalSecs = config.goal_hours * 3600;
  const goalPercent = Math.round((total / goalSecs) * 100);
  const isGoalMet = goalPercent >= 100;
  const isPast = !isCurrent;
  const fillClass = isGoalMet ? "liquid-fill-full" : "liquid-fill";

  const monthEarnings = (total / 3600) * config.rate;
  const isMonthCapped =
    config.max_earnings > 0 && monthEarnings >= config.max_earnings;
  const cappedMonthEarnings =
    config.max_earnings > 0 && monthEarnings > config.max_earnings
      ? config.max_earnings
      : monthEarnings;
  const monthTacos = Math.round(cappedMonthEarnings / config.divisor);

  return html`<div
    class="month-card ${isCurrent ? "current-month" : ""}"
    style="${!isCurrent ? `opacity: ${PAST_MONTHS_OPACITY};` : ""}"
    data-month="${ym}"
  >
    <div class="flex justify-between items-center mb-3">
      <span class="text-xl font-bold text-base-content">${monthName}</span>
      <span
        class="badge badge-lg font-bold transition-all duration-200 ${isGoalMet
          ? "badge-rainbow"
          : "badge-outline badge-success"}"
      >
        ${fmtHours(total)}${config.show_goal ? ` / ${config.goal_hours}h` : ""}
      </span>
    </div>

    <div
      class="flex justify-between items-center text-sm"
      style="color: var(--labels-color); margin-bottom: 10px;"
    >
      <div
        class="day-cell"
        style="background: transparent; width: auto; height: auto; padding: 0; cursor: help; border: none;"
        data-tip="${config.show_goal
          ? `Remaining: ${fmtHours(Math.max(0, goalSecs - total))}`
          : ""}"
      >
        ${config.show_goal ? html`<b>${goalPercent}%</b>` : ""}
        ${config.show_goal && config.show_tacos
          ? html`<span class="mx-1.5 text-base-content/30 text-lg leading-none"
              >•</span
            >`
          : ""}
        ${config.show_tacos
          ? html`${monthTacos}${isMonthCapped ? "+" : ""} ${config.emoji}`
          : ""}
      </div>
      ${config.show_average
        ? html`<span>Avg: <b>${fmtHours(avg)}</b></span>`
        : ""}
    </div>

    ${config.show_goal
      ? html`<div
          class="w-full h-2 rounded-full overflow-hidden mb-3"
          style="background: var(--color-base-300);"
        >
          <div
            class="h-full transition-all duration-500 ${fillClass} ${isPast
              ? "is-past"
              : ""}"
            style="width: ${Math.min(goalPercent, 100)}%;"
          ></div>
        </div>`
      : ""}
    ${renderCalendarGrid(year, mon, data, lastDayDate, config, eventsByDate)}
  </div>`;
}

export function renderCarouselView(
  monthCard: ReturnType<typeof html>,
  opts: {
    canPrev: boolean;
    canNext: boolean;
    prevLabel: string;
    nextLabel: string;
    loading: boolean;
    onPrev: () => void;
    onNext: () => void;
  },
) {
  return html`<div class="lt-carousel">
    <button
      type="button"
      class="lt-carousel-arrow"
      aria-label="Previous month"
      ?disabled=${!opts.canPrev}
      data-tip="${opts.canPrev ? opts.prevLabel : ""}"
      @click=${opts.canPrev ? opts.onPrev : undefined}
    >
      ${opts.loading
        ? html`<span class="loading loading-spinner loading-xs"></span>`
        : unsafeHTML(
            CHEVRON_LEFT_SVG.replace("<svg", '<svg width="16" height="16"'),
          )}
    </button>
    <div class="lt-carousel-stage">${monthCard}</div>
    <button
      type="button"
      class="lt-carousel-arrow"
      aria-label="Next month"
      ?disabled=${!opts.canNext}
      data-tip="${opts.canNext ? opts.nextLabel : ""}"
      @click=${opts.canNext ? opts.onNext : undefined}
    >
      ${unsafeHTML(
        CHEVRON_RIGHT_SVG.replace("<svg", '<svg width="16" height="16"'),
      )}
    </button>
  </div>`;
}

export function renderLoadMoreCard(onClick: () => void, loading = false) {
  return html`<div
    class="month-card"
    style="cursor: ${loading
      ? "default"
      : "pointer"}; opacity: ${PAST_MONTHS_OPACITY}; display: flex; align-items: center; justify-content: center; min-height: 200px;"
    @click=${loading ? undefined : onClick}
  >
    <div class="flex flex-col items-center gap-2">
      ${loading
        ? html`<span class="loading loading-spinner loading-lg"></span>`
        : html`<span class="text-base font-bold text-base-content"
            >Load older months</span
          >`}
      <span class="text-sm" style="color: var(--muted-foreground);">
        ${loading ? "Fetching data..." : "Click to fetch full logtime history"}
      </span>
    </div>
  </div>`;
}

export function renderYearLabel(year: string) {
  return html`<div
    class="flex items-center justify-center px-1"
    style="min-width: 48px;"
  >
    <span
      class="text-xs font-bold uppercase tracking-widest"
      style="color: var(--muted-foreground); writing-mode: vertical-lr;"
    >
      ${year}
    </span>
  </div>`;
}

export function renderHeaderContent(
  lastSeenValue: string,
  monthsData: Record<string, Record<string, number>>,
  config: LogtimeConfig,
  calendarView: string,
  onViewChange: (value: string) => void,
  primaryColor: string,
  primaryContent: string,
  collapsed = false,
) {
  let totalCappedEarnings = 0;

  for (const data of Object.values(monthsData)) {
    const monthSecs = Object.values(data).reduce((a, b) => a + b, 0);
    const monthEarnings = (monthSecs / 3600) * config.rate;
    const cappedMonthEarnings = config.max_earnings
      ? Math.min(monthEarnings, config.max_earnings)
      : monthEarnings;
    totalCappedEarnings += cappedMonthEarnings;
  }

  const totalTacos = Math.floor(totalCappedEarnings / config.divisor);

  const views = CALENDAR_VIEWS;

  const activeView = views.find((v) => v.id === calendarView) ?? views[0];

  return html`<div class="flex items-center justify-between pb-3">
    <div
      class="lt-header font-bold uppercase text-sm tracking-tight flex items-center w-full"
    >
      <span class="lt-title">Logtime</span>
      ${config.show_tacos
        ? html`<span
            class="badge badge-dash badge-success badge-lg font-bold ml-2 lt-tacos-badge"
            >${totalTacos} ${config.emoji}</span
          >`
        : ""}
      <div class="lt-view-switcher ml-2 ${collapsed ? "collapsed" : ""}">
        <div class="join lt-view-join">
          ${views.map(
            (v) =>
              html`<button
                type="button"
                class="btn btn-sm join-item"
                style="height:1.5rem;min-width:2.25rem;padding-left:0.75rem;padding-right:0.75rem;${calendarView ===
                v.id
                  ? `background-color:${primaryColor};border-color:${primaryColor};color:${primaryContent};`
                  : "background-color:transparent;border-color:color-mix(in oklab, var(--color-base-content) 20%, transparent);color:var(--color-base-content);"}"
                data-tip="${v.label}"
                @click="${() => onViewChange(v.id)}"
              >
                ${unsafeHTML(
                  v.icon.replace("<svg", '<svg width="16" height="16"'),
                )}
              </button>`,
          )}
        </div>
        <details class="dropdown dropdown-end lt-view-dropdown">
          <summary
            class="btn btn-sm list-none"
            style="height:1.5rem;min-width:2.25rem;padding-left:0.75rem;padding-right:0.75rem;background-color:${primaryColor};border-color:${primaryColor};color:${primaryContent};"
            data-tip="${activeView.label}"
          >
            ${unsafeHTML(
              activeView.icon.replace("<svg", '<svg width="16" height="16"'),
            )}
            <span
              class="lt-view-dropdown-chevron size-3 flex-shrink-0 flex items-center justify-center"
              >${unsafeHTML(
                CHEVRON_DOWN_SVG.replace("<svg", '<svg width="12" height="12"'),
              )}</span
            >
          </summary>
          <ul
            class="menu menu-sm dropdown-content z-20 mt-2 rounded-box bg-base-100 p-1 shadow-xl"
            style="width:max-content;min-width:11rem;"
          >
            ${views.map(
              (v) =>
                html`<li>
                  <button
                    type="button"
                    class="whitespace-nowrap ${calendarView === v.id
                      ? "menu-active"
                      : ""}"
                    style="${calendarView === v.id
                      ? `background-color:${primaryColor};border-color:${primaryColor};color:${primaryContent};`
                      : ""}"
                    @click="${(e: Event) => {
                      onViewChange(v.id);
                      (e.currentTarget as HTMLElement)
                        .closest("details")
                        ?.removeAttribute("open");
                    }}"
                  >
                    <span class="flex items-center justify-center"
                      >${unsafeHTML(
                        v.icon.replace("<svg", '<svg width="16" height="16"'),
                      )}</span
                    >
                    <span>${v.label}</span>
                  </button>
                </li>`,
            )}
          </ul>
        </details>
      </div>
      ${lastSeenValue !== "N/A"
        ? html`<span
            class="ml-auto badge badge-success font-bold tracking-tight lt-active-badge"
            >Active ${lastSeenValue}</span
          >`
        : ""}
    </div>
  </div>`;
}

export function renderContainer(
  header: ReturnType<typeof html>,
  monthCards: ReturnType<typeof html>[],
  theme: string,
  config: LogtimeConfig,
) {
  const disableAnimCss = config.disable_animations
    ? `.lt-box-container *, .lt-box-container *::after { animation: none !important; transition: none !important; }
       .liquid-fill::after { display: none !important; }
       .liquid-fill { border-radius: 0 4px 4px 0; }`
    : "";

  const adjustedLabelsColor = safeLabelsColor(config.labels_color, theme);

  return html`<style>
      ${sharedCSS}
      ${LOGTIME_CSS}
      :host {
        --intra-font: ${INTRA_FONT};
        --border-color: ${config.labels_color};
        --calendar-color: ${config.calendar_color};
        --rainbow-colors: ${config.rainbow_colors};
        --labels-color: ${adjustedLabelsColor};
        --muted: color-mix(in srgb, var(--color-base-300) 70%, transparent);
        --muted-foreground: var(--color-base-content);
        --card-surface: color-mix(in srgb, var(--color-base-content) 3%, transparent);
        --card-surface-strong: color-mix(in srgb, var(--color-base-content) 6%, transparent);
        --card-hairline: color-mix(in srgb, var(--color-base-content) 8%, transparent);
        --card-hairline-strong: color-mix(in srgb, var(--color-base-content) 16%, transparent);
        display: block;
        width: 100%;
      }
      ${disableAnimCss}
    </style>
    <div data-theme="${theme}">
      <div
        class="md:h-96 overflow-y-hidden md:drop-shadow-md md:rounded-lg pt-4 px-6 pb-6 transition-all lt-box-container"
      >
        ${header}
        <div
          class="log-slider-fixed ${config.calendar_view === "carousel"
            ? "is-carousel"
            : ""}"
        >
          <div class="grid-centering-container">${monthCards}</div>
        </div>
      </div>
    </div>`;
}
