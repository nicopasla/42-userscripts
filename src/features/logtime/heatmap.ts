import { html } from "lit-html";
import { MAX_INTENSITY_SECS } from "./constants";
import { fmtHours, hexToRgba } from "./utils";
import { LogtimeConfig } from "./logtime";

export function getMondayWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

interface CellData {
  date: string;
  day: number;
  month: number;
  secs: number | null;
  isToday: boolean;
  isFuture: boolean;
}

interface HeatmapColumn {
  cells: CellData[];
}

export function renderHeatmapCard(
  stats: Record<string, string>,
  config: LogtimeConfig,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const dates = Object.keys(stats).sort();
  if (dates.length === 0) return html`<div></div>`;

  const firstDate = new Date(dates[0] + "T00:00:00");
  const lastDataDate = new Date(dates[dates.length - 1] + "T00:00:00");
  const endDate = today > lastDataDate ? today : lastDataDate;

  const startDay = firstDate.getDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const startDate = new Date(firstDate);
  startDate.setDate(firstDate.getDate() + mondayOffset);

  const utcEnd = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  const utcStart = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const daysDiff = Math.floor((utcEnd - utcStart) / 86400000);
  const numWeeks = Math.ceil((daysDiff + 1) / 7);

  const columns: HeatmapColumn[] = [];
  const monthLabels: { label: string; col: number; ym: string }[] = [];
  const yearLabels: { label: string; col: number }[] = [];

  const cursor = new Date(startDate);
  let lastLabelMonth = -1;
  let lastLabelYear = -1;

  for (let w = 0; w < numWeeks; w++) {
    const cells: CellData[] = [];

    for (let d = 0; d < 7; d++) {
      const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const timeStr = stats[dateKey];
      const hasData = timeStr && timeStr !== "00:00:00";
      const [h = 0, m = 0, s = 0] = (timeStr || "0:0:0").split(":").map(Number);
      const secs = hasData ? h * 3600 + m * 60 + s : null;

      cells.push({
        date: dateKey,
        day: cursor.getDate(),
        month: cursor.getMonth(),
        secs,
        isToday: dateKey === todayStr,
        isFuture: cursor > today,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    let colLatestMonth = -1;
    let colLatestYear = -1;
    for (const cell of cells) {
      if (!cell.isFuture) {
        colLatestMonth = cell.month;
        colLatestYear = parseInt(cell.date.slice(0, 4));
      }
    }

    if (colLatestYear !== -1 && colLatestYear !== lastLabelYear) {
      yearLabels.push({
        label: String(colLatestYear),
        col: w,
      });
      lastLabelYear = colLatestYear;
    }

    if (colLatestMonth !== -1 && colLatestMonth !== lastLabelMonth) {
      const labelYm = `${cells[0].date.slice(0, 4)}-${String(colLatestMonth + 1).padStart(2, "0")}`;
      monthLabels.push({
        label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
          new Date(Number(cells[0].date.slice(0, 4)), colLatestMonth),
        ),
        col: w,
        ym: labelYm,
      });
      lastLabelMonth = colLatestMonth;
    }

    columns.push({ cells });
  }

  const cellW = 32;
  const gap = 5;
  const dayLabelsW = 50;

  const labelMap = new Map<number, string>();
  const labelYmMap = new Map<number, string>();
  for (const ml of monthLabels) {
    labelMap.set(ml.col, ml.label);
    labelYmMap.set(ml.col, ml.ym);
  }

  const yearLabelMap = new Map<number, string>();
  for (const yl of yearLabels) {
    yearLabelMap.set(yl.col, yl.label);
  }

  const monthTotals: Record<string, number> = {};
  for (const date of dates) {
    const ym = date.slice(0, 7);
    const [h = 0, m = 0, s = 0] = (stats[date] || "0:0:0")
      .split(":")
      .map(Number);
    monthTotals[ym] = (monthTotals[ym] || 0) + h * 3600 + m * 60 + s;
  }

  const displayYear = columns[columns.length - 1].cells[0].date.slice(0, 4);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return html`<div class="month-card heatmap-card">
    <div class="heatmap-months-row" style="display:flex; height:18px;">
      <span
        id="heatmap-sticky-year"
        class="text-[10px] font-extrabold tracking-wider flex items-center"
        style="position:sticky; left:0; width:${dayLabelsW}px; z-index:10; background:hsl(var(--card)); color:var(--labels-color); justify-content:flex-end; padding-right:6px;"
      >
        ${displayYear}
      </span>
      <div class="flex" style="gap:${gap}px; padding-right:${dayLabelsW}px;">
        ${columns.map(
          (col, ci) =>
            html`<div
              style="width:${cellW}px; overflow:visible; white-space:nowrap;"
            >
              ${labelMap.has(ci)
                ? (() => {
                    const ym = labelYmMap.get(ci)!;
                    const total = monthTotals[ym] || 0;
                    return html`<span
                      class="text-[10px] font-bold day-cell"
                      style="color:var(--muted-foreground); background:transparent; width:auto; height:auto; padding:0; cursor:help; border:none;"
                      data-tip="${total > 0 ? fmtHours(total) : ""}"
                      data-tip-size="14px"
                    >
                      ${labelMap.get(ci)}
                    </span>`;
                  })()
                : ""}
            </div>`,
        )}
      </div>
    </div>
    <div class="flex" style="gap:0;">
      <div
        class="heatmap-day-labels"
        style="width:${dayLabelsW}px; display:flex; flex-direction:column; gap:${gap}px; position:sticky; left:0; z-index:10; background:hsl(var(--card)); padding-top:2px;"
      >
        ${dayLabels.map(
          (label) =>
            html`<span
              class="text-[11px] font-medium flex items-center"
              style="height:${cellW}px; color:var(--muted-foreground); justify-content:flex-end; padding-right:6px;"
            >
              ${label}
            </span>`,
        )}
      </div>
      <div class="heatmap-columns" style="display:flex; gap:${gap}px;">
        ${columns.map(
          (col) =>
            html`<div
              class="heatmap-column"
              data-year="${col.cells[0].date.slice(0, 4)}"
              style="display:flex; flex-direction:column; gap:${gap}px;"
            >
              ${col.cells.map((cell) => {
                if (cell.isFuture) {
                  return html`<div
                    class="heatmap-cell"
                    data-month="${cell.date.slice(0, 7)}"
                    style="width:${cellW}px; height:${cellW}px; background:var(--muted); opacity:0.3;"
                  ></div>`;
                }

                const alpha = cell.secs
                  ? Math.min(cell.secs / MAX_INTENSITY_SECS, 1)
                  : 0;
                const bgColor =
                  alpha > 0
                    ? hexToRgba(config.calendar_color, alpha)
                    : "var(--muted)";

                const dateLabel = `${String(cell.day).padStart(2, "0")}/${String(
                  cell.month + 1,
                ).padStart(2, "0")}/${cell.date.slice(0, 4)}`;

                return html`<div
                  class="heatmap-cell day-cell ${cell.isToday
                    ? "today-highlight"
                    : ""}"
                  data-month="${cell.date.slice(0, 7)}"
                  style="width:${cellW}px; height:${cellW}px; background:${bgColor};"
                  data-tip="${dateLabel}${cell.secs ? ` - ${fmtHours(cell.secs)}` : ""}"
                  data-tip-size="14px"
                ></div>`;
              })}
            </div>`,
        )}
      </div>
      <div
        class="heatmap-day-labels"
        style="width:${dayLabelsW}px; display:flex; flex-direction:column; gap:${gap}px; padding-top:2px;"
      >
        ${dayLabels.map(
          (label) =>
            html`<span
              class="text-[11px] font-medium flex items-center"
              style="height:${cellW}px; color:var(--muted-foreground); padding-left:6px;"
            >
              ${label}
            </span>`,
        )}
      </div>
    </div>
  </div>`;
}
