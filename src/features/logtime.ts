import { gmGetValue, gmSetValue, gmDeleteValue } from "../lib/gm.ts";
import {
  DEFAULT_LOGTIME_CONFIG,
  LOGTIME_CONFIG_KEYS,
  getLogtimeStorageKey,
  type LogtimeConfig,
  type ShowDaysMode,
} from "./logtime.data.ts";
import "../assets/style.css";


export async function initLogtime() {
  const DEBUG = false;
  const dbg = (...args: unknown[]) => {
    if (DEBUG) console.debug("[logtime]", ...args);
  };

  dbg("init:start", { href: location.href, readyState: document.readyState });

  const DEFAULT_CONFIG: LogtimeConfig = { ...DEFAULT_LOGTIME_CONFIG };
  const STORABLE_KEYS = LOGTIME_CONFIG_KEYS;
  const CONFIG: LogtimeConfig = { ...DEFAULT_CONFIG };

  const MAX_INTENSITY_SECS = 3600 * 12;
  const BG_CARD = "#ffffff";
  const CARD_RADIUS = "16px";
  const CELL_RADIUS = "6px";
  const GAP_BETWEEN_CARDS = "16px";
  const CARD_WIDTH = "280px";
  const PAST_MONTHS_OPACITY = 0.8;
  const AVG_ONLY_ACTIVE_DAYS = true;
  const COLORS = {
    BORDER: "#e2e8f0",
    TEXT_DARK: "#1e293b",
    TEXT_LIGHT: "#94a3b8",
    CELL_EMPTY: "#f8fafc",
  };
  const INTRA_FONT =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const rgbaCache = new Map<string, string>();

  function setConfigValue<K extends keyof LogtimeConfig>(
    key: K,
    value: LogtimeConfig[K],
  ): void {
    CONFIG[key] = value;
  }

  async function loadConfig(): Promise<void> {
    for (const key of STORABLE_KEYS) {
      const stored = await gmGetValue<string | number | boolean | null>(
        getLogtimeStorageKey(key),
        null,
      );
      if (stored === null) continue;

      switch (key) {
        case "LOGTIME_GOAL_HOURS": {
          const n =
            typeof stored === "number"
              ? stored
              : Number.parseFloat(String(stored));
          if (Number.isFinite(n)) setConfigValue(key, n);
          break;
        }
        case "LOGTIME_SHOW_AVERAGE":
        case "LOGTIME_SHOW_GOAL":
        case "LOGTIME_SHOW_TACOS":
          setConfigValue(
            key,
            stored === true || String(stored).toLowerCase() === "true",
          );
          break;

        case "LOGTIME_SHOW_DAYS_MODE": {
          const mode = String(stored);
          setConfigValue(
            key,
            mode === "date" || mode === "both" || mode === "days"
              ? mode
              : "date",
          );
          break;
        }

        case "LOGTIME_CALENDAR_COLOR":
        case "LOGTIME_LABELS_COLOR":
          setConfigValue(key, String(stored));
          break;
      }
    }
    dbg("loadConfig:done", { CONFIG: { ...CONFIG } });
  }

  async function saveConfig(): Promise<void> {
    dbg("saveConfig:start", { CONFIG: { ...CONFIG } });
    for (const key of STORABLE_KEYS) {
      await gmSetValue(getLogtimeStorageKey(key), String(CONFIG[key]));
    }
    dbg("saveConfig:done");
  }

  const fmtHours = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  };

  function hexToRgba(hex: string, opacity: number): string {
    const key = `${hex}|${opacity}`;
    const cached = rgbaCache.get(key);
    if (cached) return cached;
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    const val = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    rgbaCache.set(key, val);
    return val;
  }

  const getLastSeenFormatted = (
    stats: Record<string, string>,
    mode: ShowDaysMode = "date",
  ): string => {
    const activeDays = Object.entries(stats)
      .filter(([, time]) => time !== "00:00:00")
      .map(([date]) => date)
      .sort();

    if (activeDays.length === 0) return "N/A";
    const lastDateStr = activeDays[activeDays.length - 1];
    const [y, m, d] = lastDateStr.split("-");
    const dateStr = `${d}/${m}`;
    if (mode === "date") return dateStr;

    const lastDate = new Date(lastDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const relative =
      diffDays === 0
        ? "today"
        : diffDays === 1
          ? "yesterday"
          : `${diffDays} days ago`;
    return mode === "days" ? relative : `${dateStr} (${relative})`;
  };

  function setupStyles() {
    dbg("setupStyles");
    const style = document.createElement("style");
    style.textContent = `.lt-box-container{font-family:${INTRA_FONT};margin-bottom:1rem;}
    [class*="logtime"],.card,.card-body,.row,.col-md-12{overflow:visible!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;}
    .log-slider-fixed{overflow-x:auto!important;overflow-y:hidden!important;max-height:fit-content!important;align-items:flex-start!important;width:100%;margin-top:-10px!important;font-family:${INTRA_FONT};display:flex!important;scroll-behavior:smooth;cursor:grab;user-select:none;-ms-overflow-style:none;scrollbar-width:none;}
    .log-slider-fixed::-webkit-scrollbar{display:none!important;}
    .grid-centering-container{display:flex;gap:${GAP_BETWEEN_CARDS};padding:10px;margin:0 auto;min-width:min-content;}
    .month-card{transition:opacity .2s ease;border:1px solid ${COLORS.BORDER};background:${BG_CARD};border-radius:${CARD_RADIUS};padding:16px;width:${CARD_WIDTH};flex-shrink:0;box-shadow:0 4px 6px -1px rgba(0,0,0,.05);display:flex;flex-direction:column;}
    .month-card.current-month{border:2px solid ${CONFIG.LOGTIME_CALENDAR_COLOR}!important;box-shadow:0 0 15px ${CONFIG.LOGTIME_CALENDAR_COLOR}33!important;opacity:1!important;}
    .day-cell{transition:transform .1s ease;cursor:pointer;position:relative;}
    .day-cell:hover{transform:scale(1.2);filter:brightness(.9);z-index:50!important;}
    .today-highlight{box-shadow:0 0 0 2px rgba(239,68,68,.65),0 0 12px rgba(239,68,68,.45);border:none!important;z-index:10;}
    .day-tooltip{display:none;position:absolute;bottom:130%;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;font-size:11px;padding:4px 8px;border-radius:4px;z-index:100;white-space:nowrap;pointer-events:none;}
    .day-cell:hover .day-tooltip{display:block;}
    .modal-content{background:#fff;border-radius:12px;max-width:420px;width:94%;overflow:visible;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);font-family:${INTRA_FONT};position:relative;}
    .modal-header{padding:12px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e293b;display:flex;align-items:center;}
    .modal-title{flex-grow:1;text-align:center;font-size:15px;letter-spacing:-.01em;}
    #reset-log-cfg{background:#fff;border:1px solid #fee2e2;color:#ef4444;font-size:11px;padding:4px 8px;border-radius:6px;cursor:pointer;font-weight:700;transition:all .2s ease;}
    #reset-log-cfg:hover{background:#fef2f2;border-color:#f87171;}
    #close-modal{display:flex;position:relative;width:28px;height:28px;padding:0;border:none;border-radius:50%;background:#f1f5f9;color:#64748b;cursor:pointer;transition:all .3s ease;}
    #close-modal:hover{background:#e2e8f0;color:#1e293b;}
    #close-modal::before,#close-modal::after{content:" ";position:absolute;top:50%;left:50%;width:2px;height:14px;background-color:currentColor;border-radius:1px;}
    #close-modal::before{transform:translate(-50%,-50%) rotate(45deg);}
    #close-modal::after{transform:translate(-50%,-50%) rotate(-45deg);}
    .modal-body{padding:12px 14px;display:flex;flex-direction:column;gap:10px;font-family:${INTRA_FONT};}
    .field-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;background:#fafcff;}
    .field-row label{font-size:13px;font-weight:600;color:#1e293b;}
    .field-control{font-size:13px;font-family:${INTRA_FONT};padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;}
    .color-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .color-item{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;background:#fafcff;}
    .color-item label{font-size:12px;font-weight:600;color:#1e293b;}
    .color-item input[type="color"]{width:44px;height:30px;padding:0;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;}
    .toggle-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;background:#fafcff;}
    .toggle-row span{font-size:13px;font-weight:600;color:#1e293b;}
    .toggle-row input[type="checkbox"]{width:16px;height:16px;margin:0;}
    .modal-footer{padding:12px 14px;border-top:1px solid #e2e8f0;}
    #save-log-cfg{width:100%;padding:9px;background:#00BCBA;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .2s;font-family:${INTRA_FONT};}
    #save-log-cfg:hover{opacity:.9;}
    #lt-settings-trigger{font-size:12px;color:#000;background:#f8fafc;border:1px solid #e2e8f0;padding:4px 12px;border-radius:8px;cursor:pointer;transition:all .2s;}
    #lt-settings-trigger:hover{border-color:${CONFIG.LOGTIME_LABELS_COLOR};background:#fff;}`;
    document.head.appendChild(style);
  }

  function createMonthCard(
    ym: string,
    data: Record<string, number>,
    isCurrent: boolean,
  ): HTMLDivElement {
    const [year, mon] = ym.split("-").map(Number);
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const lastDayDate = new Date(year, mon, 0).getDate();
    const divisor = AVG_ONLY_ACTIVE_DAYS
      ? Object.values(data).filter((s) => s > 0).length || 1
      : isCurrent
        ? new Date().getDate()
        : lastDayDate;
    const avg = total / divisor;

    const card = document.createElement("div");
    card.className = `month-card ${isCurrent ? "current-month" : ""}`;
    if (!isCurrent) card.style.opacity = String(PAST_MONTHS_OPACITY);

    const monthName = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(new Date(year, mon - 1));
    const goalSecs = CONFIG.LOGTIME_GOAL_HOURS * 3600;
    const goalPercent = Math.round((total / goalSecs) * 100);

    card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-size: 22px; font-weight: 700; color: ${COLORS.TEXT_DARK};">${monthName}</span>
      <span style="font-size: 16px; font-weight: 800; color: ${CONFIG.LOGTIME_LABELS_COLOR}; background: rgba(38, 166, 65, 0.08); padding: 4px 10px; border-radius: 8px;">
        ${fmtHours(total)}${CONFIG.LOGTIME_SHOW_GOAL ? `/ ${CONFIG.LOGTIME_GOAL_HOURS}h` : ""}
      </span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: ${CONFIG.LOGTIME_LABELS_COLOR}; margin-bottom: 10px;">
      <div class="day-cell" style="background:transparent; width:auto; height:auto; padding:0; cursor:help;">
        ${CONFIG.LOGTIME_SHOW_GOAL ? `<b>${goalPercent}% </b>` : ""}
        ${CONFIG.LOGTIME_SHOW_TACOS ? ` ${Math.round(((total / 3600) * 2) / 8)} 🌮` : ""}
        ${CONFIG.LOGTIME_SHOW_GOAL ? `<div class="day-tooltip">Remaining: ${fmtHours(Math.max(0, goalSecs - total))}</div>` : ""}
      </div>
      ${CONFIG.LOGTIME_SHOW_AVERAGE ? `<span>Avg: <b>${fmtHours(avg)}</b></span>` : "<span></span>"}
    </div>
    ${
      CONFIG.LOGTIME_SHOW_GOAL
        ? `
    <div style="width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; margin-bottom: 16px; overflow: hidden;">
      <div style="height: 100%; background: ${CONFIG.LOGTIME_LABELS_COLOR}; transition: width 0.5s ease; width: ${Math.min(goalPercent, 100)}%;"></div>
    </div>`
        : ""
    }
  `;

    card.appendChild(createCalendarGrid(year, mon, data, lastDayDate));
    return card;
  }

  function createCalendarGrid(
    year: number,
    mon: number,
    data: Record<string, number>,
    lastDayDate: number,
  ): HTMLDivElement {
    const grid = document.createElement("div");
    grid.style.cssText = `display:grid; grid-template-columns:repeat(7, 1fr) 58px; gap:8px 5px;`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    ["M", "T", "W", "T", "F", "S", "S", "Total"].forEach((d, idx) => {
      const el = document.createElement("div");
      el.textContent = d;
      el.style.cssText = `font-size:11px; font-weight:800; text-align:center; color:${COLORS.TEXT_LIGHT}; ${idx === 7 ? "border-left:1px solid #f1f5f9; color:" + CONFIG.LOGTIME_LABELS_COLOR : ""}`;
      grid.appendChild(el);
    });

    const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
    for (let i = 0; i < offset; i++)
      grid.appendChild(document.createElement("div"));

    let weekSecs = 0;
    for (let day = 1; day <= lastDayDate; day++) {
      const dKey = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasData = Object.prototype.hasOwnProperty.call(data, dKey);
      const s = data[dKey] ?? 0;
      weekSecs += s;

      const cellDate = new Date(year, mon - 1, day);
      cellDate.setHours(0, 0, 0, 0);
      const isTodayOrFuture = cellDate >= today;

      const cell = document.createElement("div");
      cell.className = `day-cell ${dKey === todayStr ? "today-highlight" : ""}`;
      cell.textContent = hasData || isTodayOrFuture ? String(day) : "";

      const alpha = Math.min(s / MAX_INTENSITY_SECS, 1);
      cell.style.cssText = `aspect-ratio: 1/1; border-radius: ${CELL_RADIUS}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; background: ${s > 0 ? hexToRgba(CONFIG.LOGTIME_CALENDAR_COLOR, alpha) : COLORS.CELL_EMPTY};color: ${s > MAX_INTENSITY_SECS / 2 ? "#fff" : COLORS.TEXT_DARK};`;

      const tt = document.createElement("div");
      tt.className = "day-tooltip";
      tt.textContent = s > 0 ? fmtHours(s) : "0h";
      cell.appendChild(tt);
      grid.appendChild(cell);

      if ((offset + day) % 7 === 0 || day === lastDayDate) {
        if (day === lastDayDate && (offset + day) % 7 !== 0) {
          for (let j = 0; j < 7 - ((offset + day) % 7); j++)
            grid.appendChild(document.createElement("div"));
        }
        const w = document.createElement("div");
        w.textContent = weekSecs > 0 ? fmtHours(weekSecs) : "";
        w.style.cssText = `font-size:14px; font-weight:700; text-align:right; color:${CONFIG.LOGTIME_LABELS_COLOR}; padding-right:4px; display:flex; align-items:center; justify-content:flex-end;`;
        grid.appendChild(w);
        weekSecs = 0;
      }
    }
    return grid;
  }

  function setupModal(): void {
    dbg("setupModal");
    const modal = document.createElement("div");
    modal.id = "logtime-settings-modal";
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: none; align-items: center; justify-content: center; z-index: 10000; font-family: ${INTRA_FONT};`;
    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button id="reset-log-cfg">Reset</button>
        <span class="modal-title">Settings</span>
        <button id="close-modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="field-row">
          <label for="set-goal-val">Goal (hours)</label>
          <input class="field-control" type="number" id="set-goal-val" value="${CONFIG.LOGTIME_GOAL_HOURS}" style="width: 110px;">
        </div>
        <div class="color-grid">
          <div class="color-item">
            <label for="set-color">Highlight</label>
            <input type="color" id="set-color" value="${CONFIG.LOGTIME_CALENDAR_COLOR}">
          </div>
          <div class="color-item">
            <label for="set-color-labels">Labels</label>
            <input type="color" id="set-color-labels" value="${CONFIG.LOGTIME_LABELS_COLOR}">
          </div>
        </div>
        <label class="toggle-row">
          <span>Show average</span>
          <input type="checkbox" id="set-avg" ${CONFIG.LOGTIME_SHOW_AVERAGE ? "checked" : ""}>
        </label>
        <label class="toggle-row">
          <span>Show goal</span>
          <input type="checkbox" id="set-show-goal" ${CONFIG.LOGTIME_SHOW_GOAL ? "checked" : ""}>
        </label>
        <label class="toggle-row">
          <span>Show tacos</span>
          <input type="checkbox" id="set-show-tacos" ${CONFIG.LOGTIME_SHOW_TACOS ? "checked" : ""}>
        </label>
        <div class="field-row">
          <label for="set-show-days-mode">Last active format</label>
          <select id="set-show-days-mode" class="field-control" style="width: 200px;">
            <option value="date" ${CONFIG.LOGTIME_SHOW_DAYS_MODE === "date" ? "selected" : ""}>Date only (17/04)</option>
            <option value="both" ${CONFIG.LOGTIME_SHOW_DAYS_MODE === "both" ? "selected" : ""}>Both (17/04 - 2 days ago)</option>
            <option value="days" ${CONFIG.LOGTIME_SHOW_DAYS_MODE === "days" ? "selected" : ""}>Days ago only (2 days ago)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer"><button id="save-log-cfg">Save & Reload</button></div>
    </div>`;

    document.body.appendChild(modal);

    const saveBtn = document.getElementById(
      "save-log-cfg",
    ) as HTMLButtonElement | null;
    const resetBtn = document.getElementById(
      "reset-log-cfg",
    ) as HTMLButtonElement | null;
    const goalInput = document.getElementById(
      "set-goal-val",
    ) as HTMLInputElement | null;
    const colorInput = document.getElementById(
      "set-color",
    ) as HTMLInputElement | null;
    const labelsInput = document.getElementById(
      "set-color-labels",
    ) as HTMLInputElement | null;
    const avgInput = document.getElementById(
      "set-avg",
    ) as HTMLInputElement | null;
    const goalToggle = document.getElementById(
      "set-show-goal",
    ) as HTMLInputElement | null;
    const tacosToggle = document.getElementById(
      "set-show-tacos",
    ) as HTMLInputElement | null;
    const modeSelect = document.getElementById(
      "set-show-days-mode",
    ) as HTMLSelectElement | null;

    if (
      saveBtn &&
      goalInput &&
      colorInput &&
      labelsInput &&
      avgInput &&
      goalToggle &&
      tacosToggle &&
      modeSelect
    ) {
      saveBtn.onclick = async () => {
        dbg("settings:save:click", {
          goal: goalInput.value,
          calendar: colorInput.value,
          labels: labelsInput.value,
          avg: avgInput.checked,
          goalEnabled: goalToggle.checked,
          tacos: tacosToggle.checked,
          mode: modeSelect.value,
        });

        CONFIG.LOGTIME_GOAL_HOURS = Number.parseFloat(goalInput.value);
        CONFIG.LOGTIME_CALENDAR_COLOR = colorInput.value;
        CONFIG.LOGTIME_LABELS_COLOR = labelsInput.value;
        CONFIG.LOGTIME_SHOW_AVERAGE = avgInput.checked;
        CONFIG.LOGTIME_SHOW_GOAL = goalToggle.checked;
        CONFIG.LOGTIME_SHOW_TACOS = tacosToggle.checked;
        CONFIG.LOGTIME_SHOW_DAYS_MODE = modeSelect.value as ShowDaysMode;

        await saveConfig();
        dbg("settings:save:reload");
        location.reload();
      };
    } else {
      dbg("settings:missing-elements", {
        saveBtn: !!saveBtn,
        goalInput: !!goalInput,
        colorInput: !!colorInput,
        labelsInput: !!labelsInput,
        avgInput: !!avgInput,
        goalToggle: !!goalToggle,
        tacosToggle: !!tacosToggle,
        modeSelect: !!modeSelect,
      });
    }

    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (confirm("Reset all settings to default?")) {
          for (const key of STORABLE_KEYS) {
            await gmDeleteValue(getLogtimeStorageKey(key));
          }
          location.reload();
        }
      };
    }

    const closeModal = () => (modal.style.display = "none");
    const closeBtn = document.getElementById(
      "close-modal",
    ) as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.type = "button";
      closeBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      });
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      });
    }

    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
      modalContent.addEventListener("click", (e) => e.stopPropagation());
    }

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  function findLogtimeMount(): HTMLElement | null {
    dbg("findMount:start");

    const legacyCards = Array.from(
      document.querySelectorAll<HTMLElement>(".bg-white.md\\:h-96"),
    );
    const legacy = legacyCards.find((c) =>
      (c.textContent || "").toUpperCase().includes("LOGTIME"),
    );
    dbg("findMount:legacy", { count: legacyCards.length, found: !!legacy });

    if (legacy?.parentElement) {
      dbg("findMount:legacy-parent-found");
      return legacy.parentElement as HTMLElement;
    }

    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>("main div[class*='grid']"),
    );
    const found =
      candidates.find(
        (el) => el.children.length > 2 && el.offsetParent !== null,
      ) || null;

    dbg("findMount:fallback", {
      candidates: candidates.length,
      found: !!found,
      tag: found?.tagName,
      className: found?.className,
    });

    return found;
  }

  function hideOldLogtime(): void {
    const legacyCards = Array.from(
      document.querySelectorAll<HTMLElement>(".bg-white.md\\:h-96"),
    );
    dbg("hideOldLogtime", { count: legacyCards.length });

    legacyCards.forEach((c, i) => {
      const isLogtime = (c.textContent || "").toUpperCase().includes("LOGTIME");
      dbg("hideOldLogtime:card", {
        i,
        isLogtime,
        text: c.textContent?.slice(0, 80),
      });
      if (isLogtime) c.style.display = "none";
    });
  }

  function render(stats: Record<string, string>): void {
    dbg("render:start", {
      keys: Object.keys(stats).length,
      sample: Object.entries(stats).slice(0, 5),
    });

    if (!stats) {
      dbg("render:skip:no-stats");
      return;
    }

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

    const containerBox = document.createElement("div");
    containerBox.className =
      "bg-white dark:bg-zinc-900 overflow-hidden md:drop-shadow-md md:rounded-lg p-0 mb-4 transition-all lt-box-container";

    const header = document.createElement("div");
    header.className = "flex items-center justify-between p-4";
    const label = document.createElement("div");
    label.className =
      "font-bold text-black dark:text-white uppercase text-sm tracking-tight";
    label.style.cssText =
      "display: inline-flex; align-items: center; width: 100%; gap: 8px;";
    label.innerHTML = `<div class="w-1.5 h-4 bg-legacy-main rounded-full"></div>Logtime`;

    const lastSeenValue = getLastSeenFormatted(
      stats,
      CONFIG.LOGTIME_SHOW_DAYS_MODE,
    );
    if (lastSeenValue && lastSeenValue !== "N/A") {
      const lastSeenSpan = document.createElement("span");
      lastSeenSpan.style.cssText = `font-family: ${INTRA_FONT}; font-size: 12px; color: ${CONFIG.LOGTIME_LABELS_COLOR}; background: #f8fafc; border: 2px solid #e2e8f0; padding: 2px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px; margin-left: 10px; letter-spacing: 0.02em; line-height: 1; height: 30px; text-transform: none;`;
      lastSeenSpan.textContent = `Active ${lastSeenValue}`;
      label.appendChild(lastSeenSpan);
    }

    const btn = document.createElement("button");
    btn.id = "logtime-settings-trigger";
    btn.style.cssText = `font-family: ${INTRA_FONT}; font-size: 12px; color: black; background: #f8fafc; border: 2px solid #e2e8f0; padding: 2px 12px; border-radius: 12px; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.02em; line-height: 1; margin-left: auto; height: 30px; cursor: pointer; transition: all 0.2s ease;`;
    btn.innerHTML = "Settings";
    btn.onmouseover = () => {
      btn.style.borderColor = CONFIG.LOGTIME_LABELS_COLOR;
      btn.style.background = "#fff";
    };
    btn.onmouseout = () => {
      btn.style.borderColor = "#e2e8f0";
      btn.style.background = "#f8fafc";
    };
    btn.onclick = (e) => {
      e.preventDefault();
      const modal = document.getElementById("logtime-settings-modal");
      if (modal) modal.style.display = "flex";
    };
    label.appendChild(btn);

    header.appendChild(label);
    containerBox.appendChild(header);

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "log-slider-fixed";
    const gridContainer = document.createElement("div");
    gridContainer.className = "grid-centering-container";

    const monthKeys = Object.keys(byMonth).sort();
    monthKeys.forEach((ym, index) => {
      gridContainer.appendChild(
        createMonthCard(ym, byMonth[ym], index === monthKeys.length - 1),
      );
    });

    scrollWrapper.appendChild(gridContainer);
    containerBox.appendChild(scrollWrapper);

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    scrollWrapper.addEventListener("mousedown", (e: MouseEvent) => {
      isDown = true;
      scrollWrapper.style.cursor = "grabbing";
      startX = e.pageX - scrollWrapper.offsetLeft;
      scrollLeft = scrollWrapper.scrollLeft;
    });

    scrollWrapper.addEventListener("mouseleave", () => {
      isDown = false;
      scrollWrapper.style.cursor = "grab";
    });

    scrollWrapper.addEventListener("mouseup", () => {
      isDown = false;
      scrollWrapper.style.cursor = "grab";
    });

    scrollWrapper.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollWrapper.offsetLeft;
      scrollWrapper.scrollLeft = scrollLeft - (x - startX) * 2;
    });

    scrollWrapper.addEventListener("wheel", (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollWrapper.scrollLeft += e.deltaY;
      }
    });

    const tryMount = (): boolean => {
      const mount = findLogtimeMount();
      const existing = document.querySelector(".lt-box-container");
      dbg("render:tryMount", { hasMount: !!mount, existing: !!existing });

      if (!mount) return false;
      if (existing) return true;

      hideOldLogtime();
      mount.prepend(containerBox);
      dbg("render:mounted", {
        mountTag: mount.tagName,
        mountClass: mount.className,
      });

      setTimeout(() => {
        dbg("render:scrollTo-end");
        scrollWrapper.scrollTo({
          left: scrollWrapper.scrollWidth,
          behavior: "smooth",
        });
      }, 300);

      return true;
    };

    if (tryMount()) return;

    dbg("render:observer:start");
    const observer = new MutationObserver((mutations, o) => {
      dbg("render:observer:mutation", {
        mutations: mutations.length,
        bodyChildren: document.body?.children.length,
      });
      if (tryMount()) {
        dbg("render:observer:disconnect");
        o.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  await loadConfig();
  dbg("after:loadConfig", { CONFIG: { ...CONFIG } });

  setupStyles();
  setupModal();

  function getFetchUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if (typeof Request !== "undefined" && input instanceof Request)
      return input.url;
    return String(input ?? "");
  }

  function isStringMap(v: unknown): v is Record<string, string> {
    if (!v || typeof v !== "object") return false;
    return Object.values(v as Record<string, unknown>).every(
      (x) => typeof x === "string",
    );
  }

  function extractStats(payload: unknown): Record<string, string> | null {
    dbg("extractStats:start", {
      type: typeof payload,
      isObject: !!payload && typeof payload === "object",
    });

    if (!payload || typeof payload !== "object") return null;

    const p = payload as {
      locations_stats?: unknown;
      data?: { locations_stats?: unknown };
    };

    if (isStringMap(p.locations_stats)) {
      dbg("extractStats:from", "locations_stats");
      return p.locations_stats;
    }
    if (isStringMap(p.data?.locations_stats)) {
      dbg("extractStats:from", "data.locations_stats");
      return p.data.locations_stats;
    }
    if (isStringMap(payload)) {
      dbg("extractStats:from", "direct");
      return payload;
    }

    dbg("extractStats:none");
    return null;
  }

  function isLocationsStatsUrl(url: string): boolean {
    try {
      const u = new URL(url, location.href);
      const result = /^\/users\/[^/]+\/locations_stats\/?$/.test(u.pathname);
      dbg("isLocationsStatsUrl", { url: u.toString(), result });
      return result;
    } catch (e) {
      dbg("isLocationsStatsUrl:error", e);
      return false;
    }
  }

  function isProfileV3TargetPage(): boolean {
    const result =
      location.hostname === "profile-v3.intra.42.fr" &&
      (location.pathname === "/" ||
        /^\/users\/[^/]+\/?$/.test(location.pathname));
    dbg("isProfileV3TargetPage", { href: location.href, result });
    return result;
  }

  const w = window as Window & { __logtimeFetchHookInstalled?: boolean };
  dbg("fetchHook:state", {
    installed: w.__logtimeFetchHookInstalled,
    onTarget: isProfileV3TargetPage(),
  });

  if (isProfileV3TargetPage() && !w.__logtimeFetchHookInstalled) {
    dbg("fetchHook:install");
    const originalFetch = window.fetch.bind(window);

    window.fetch = (
      ...args: Parameters<typeof fetch>
    ): ReturnType<typeof fetch> => {
      const url = getFetchUrl(args[0] as RequestInfo | URL);
      dbg("fetchHook:call", { url, arg0: args[0] });

      const p = originalFetch(...args);

      if (isLocationsStatsUrl(url)) {
        dbg("fetchHook:match", { url });

        p.then(async (r) => {
          dbg("fetchHook:response", { url, status: r.status, ok: r.ok });
          try {
            const text = await r.clone().text();
            dbg("fetchHook:body", text.slice(0, 500));
            const json = JSON.parse(text);
            const stats = extractStats(json);
            dbg("fetchHook:parsed", {
              hasStats: !!stats,
              count: stats ? Object.keys(stats).length : 0,
            });
            if (stats) render(stats);
          } catch (e) {
            dbg("fetchHook:parse-error", e);
          }
        }).catch((e) => dbg("fetchHook:fetch-error", e));
      }

      return p;
    };

    w.__logtimeFetchHookInstalled = true;
    dbg("fetchHook:installed");
  } else {
    dbg("fetchHook:skipped");
  }

  function logResourceHints(): void {
    const resources = performance.getEntriesByType("resource");
    const hits = resources.filter((r) => r.name.includes("/locations_stats"));
    dbg("perf:resources", {
      total: resources.length,
      hits: hits.map((r) => r.name),
    });
  }

  function getLocationsStatsUrls(): string[] {
    return performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((name) => name.includes("/locations_stats"));
  }

  async function renderFromExistingResource(): Promise<boolean> {
    const urls = getLocationsStatsUrls();
    dbg("resourceFallback:urls", urls);

    for (const url of urls) {
      try {
        const res = await fetch(url, { credentials: "include" });
        dbg("resourceFallback:response", {
          url,
          status: res.status,
          ok: res.ok,
        });
        if (!res.ok) continue;

        const json = await res.json();
        const stats = extractStats(json);
        dbg("resourceFallback:parsed", {
          hasStats: !!stats,
          count: stats ? Object.keys(stats).length : 0,
        });

        if (stats) {
          render(stats);
          return true;
        }
      } catch (e) {
        dbg("resourceFallback:error", { url, e });
      }
    }

    return false;
  }

  if (isProfileV3TargetPage()) {
    dbg("startup:direct-render-check");
    setTimeout(() => {
      logResourceHints();
      renderFromExistingResource().catch((e) =>
        dbg("resourceFallback:unhandled-error", e),
      );
    }, 1000);
  }

  dbg("init:done");
  console.log("Logtime loaded!");
}
