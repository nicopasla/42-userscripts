import { html } from "lit-html";
import { AVG_ONLY_ACTIVE_DAYS, PAST_MONTHS_OPACITY } from "./constants";
import { fmtHours } from "./utils";
import { LogtimeConfig } from "./logtime";

export type MonthEntry = { ym: string; data: Record<string, number> };

export function chunkMonths(items: MonthEntry[]): MonthEntry[][] {
  if (items.length <= 1) return [items];
  if (items.length % 2 === 0) {
    const groups: MonthEntry[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      groups.push(items.slice(i, i + 2));
    }
    return groups;
  }
  const groups: MonthEntry[][] = [items.slice(0, 1)];
  for (let i = 1; i < items.length; i += 2) {
    groups.push(items.slice(i, i + 2));
  }
  return groups;
}

function renderCompactMonthCard(
  ym: string,
  data: Record<string, number>,
  config: LogtimeConfig,
  borderTop = false,
) {
  const [year, mon] = ym.split("-").map(Number);
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const lastDayDate = new Date(year, mon, 0).getDate();
  const divisor = AVG_ONLY_ACTIVE_DAYS
    ? Object.values(data).filter((s) => s > 0).length || 1
    : lastDayDate;
  const avg = total / divisor;

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, mon - 1),
  );
  const goalSecs = config.goal_hours * 3600;
  const goalPercent = Math.round((total / goalSecs) * 100);
  const isGoalMet = goalPercent >= 100;
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
    class="compact-month ${borderTop ? "compact-divider" : ""}"
    data-month="${ym}"
  >
    <div class="flex justify-between items-center">
      <span class="text-lg font-bold text-base-content">${monthName}</span>
      <span
        class="badge badge-lg font-bold transition-all duration-200 ${isGoalMet
          ? "badge-rainbow"
          : "badge-outline badge-success"}"
      >
        ${fmtHours(total)}${config.show_goal
          ? html` / ${config.goal_hours}h`
          : ""}
      </span>
    </div>

    <div>
      <div
        class="flex justify-between items-center text-sm"
        style="color: var(--labels-color); margin-bottom: 6px;"
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
            ? html`<span class="mx-1.5 text-base-content/30 leading-none"
                >·</span
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
            class="w-full h-2 rounded-full overflow-hidden"
            style="background: var(--color-base-300);"
          >
            <div
              class="h-full transition-all duration-500 ${fillClass}"
              style="width: ${Math.min(goalPercent, 100)}%;"
            ></div>
          </div>`
        : ""}
    </div>
  </div>`;
}

export function renderCompactMonthGroup(
  months: MonthEntry[],
  config: LogtimeConfig,
) {
  const isEmptySlot = html`<div></div>`;

  if (months.length === 1) {
    const mon = parseInt(months[0].ym.slice(5, 7));
    const isTop = mon % 2 === 0;
    return html`<div
      class="month-card compact-group"
      style="opacity: ${PAST_MONTHS_OPACITY};"
    >
      <div class="compact-grid grid grid-cols-1 gap-0">
        ${isTop
          ? renderCompactMonthCard(months[0].ym, months[0].data, config)
          : isEmptySlot}
        ${isTop
          ? isEmptySlot
          : renderCompactMonthCard(months[0].ym, months[0].data, config)}
      </div>
    </div>`;
  }

  return html`<div
    class="month-card compact-group"
    style="opacity: ${PAST_MONTHS_OPACITY};"
  >
    <div class="compact-grid grid grid-cols-1 gap-0">
      ${months.map((m, i) =>
        renderCompactMonthCard(m.ym, m.data, config, i > 0),
      )}
    </div>
  </div>`;
}
