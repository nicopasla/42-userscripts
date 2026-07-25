import { getConfig } from "../../config.ts";
import { lastStats } from "./logtime.ts";

export interface TrackerThresholds {
  days: number;
  hours: number;
  slots: number | null;
}

export interface TrackerState {
  mode: string;
  label: string;
  thresholds: TrackerThresholds;
}

export interface WeekProgress {
  daysDone: number;
  hoursDone: number;
  daysRequired: number;
  hoursRequired: number;
  slotsRequired: number | null;
}

const THRESHOLDS: Record<string, TrackerState> = {
  "phoenix-1": {
    mode: "phoenix-1",
    label: "Phoenix - Phase 1",
    thresholds: { days: 2, hours: 20, slots: null },
  },
  "phoenix-2": {
    mode: "phoenix-2",
    label: "Phoenix - Phase 2",
    thresholds: { days: 3, hours: 25, slots: null },
  },
  "phoenix-3": {
    mode: "phoenix-3",
    label: "Phoenix - Phase 3",
    thresholds: { days: 4, hours: 30, slots: null },
  },
  "phoenix-4": {
    mode: "phoenix-4",
    label: "Phoenix - Phase 4",
    thresholds: { days: 5, hours: 35, slots: null },
  },
  "pegasus-bronze": {
    mode: "pegasus-bronze",
    label: "Pegasus - Bronze",
    thresholds: { days: 4, hours: 30, slots: null },
  },
  "pegasus-silver": {
    mode: "pegasus-silver",
    label: "Pegasus - Silver",
    thresholds: { days: 4, hours: 35, slots: null },
  },
  "pegasus-gold": {
    mode: "pegasus-gold",
    label: "Pegasus - Gold",
    thresholds: { days: 5, hours: 40, slots: null },
  },
  "pegasus-diamond": {
    mode: "pegasus-diamond",
    label: "Pegasus - Diamond",
    thresholds: { days: 5, hours: 45, slots: null },
  },
  "pegasus-vibranium": {
    mode: "pegasus-vibranium",
    label: "Pegasus - Vibranium",
    thresholds: { days: 6, hours: 50, slots: null },
  },
};

const PEGASUS_MAX_HOURS_PER_DAY = 12;

export async function getTrackerState(): Promise<TrackerState | null> {
  const mode = await getConfig("TRACKER_MODE");
  if (mode === "off" || !THRESHOLDS[mode]) return null;
  return THRESHOLDS[mode];
}

export function getLogtimeWeekStart(date: Date = new Date()): Date {
  const day = date.getDay();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceSaturday = day === 0 ? 1 : (day - 6 + 7) % 7;
  start.setDate(start.getDate() - daysSinceSaturday);
  return start;
}

export function getCurrentWeekProgress(
  stats: Record<string, string>,
): { daysDone: number; hoursDone: number } | null {
  const dates = Object.keys(stats).sort();
  if (dates.length === 0) return null;

  const weekStart = getLogtimeWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  let daysDone = 0;
  let hoursDone = 0;

  for (const [dateStr, timeStr] of Object.entries(stats)) {
    const d = new Date(dateStr + "T00:00:00Z");
    if (d < weekStart || d > weekEnd) continue;

    const [h = 0, m = 0, s = 0] = timeStr.split(":").map(Number);
    let dayHours = h + m / 60 + s / 3600;

    if (dayHours > 0) daysDone++;
    if (dayHours > PEGASUS_MAX_HOURS_PER_DAY)
      dayHours = PEGASUS_MAX_HOURS_PER_DAY;
    hoursDone += dayHours;
  }

  return { daysDone, hoursDone };
}

export function computeWeekProgress(
  stats: Record<string, string>,
  state: TrackerState,
): WeekProgress | null {
  const progress = getCurrentWeekProgress(stats);
  if (!progress) return null;
  return {
    ...progress,
    daysRequired: state.thresholds.days,
    hoursRequired: state.thresholds.hours,
    slotsRequired: state.thresholds.slots,
  };
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export async function saveTrackerMode(mode: string): Promise<void> {
  await chrome.storage.local.set({ TRACKER_MODE: mode });
}

export function findTrackerBadgeEl(): {
  type: "phoenix" | "pegasus";
  element: HTMLElement;
} | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[class*="text-primary-foreground"][class*="inline-flex"], .inline-flex.items-center.rounded.border, [class*="badge"]',
  );
  for (const el of candidates) {
    const text = (el.textContent?.trim() ?? "").toLowerCase();
    if (text === "phoenix") return { type: "phoenix", element: el };
    if (text === "pegasus") return { type: "pegasus", element: el };
  }
  return null;
}

export function thresholdsMet(
  progress: WeekProgress,
  state: TrackerState,
): boolean {
  return (
    progress.daysDone >= state.thresholds.days &&
    progress.hoursDone >= state.thresholds.hours
  );
}

export function detectTrackerBadges(): "phoenix" | "pegasus" | null {
  const found = findTrackerBadgeEl();
  return found ? found.type : null;
}

export const TRACKER_MODES = Object.keys(THRESHOLDS);
