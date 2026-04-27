export type ShowDaysMode = "date" | "both" | "days";

export type LogtimeConfig = {
  LOGTIME_GOAL_HOURS: number;
  LOGTIME_SHOW_AVERAGE: boolean;
  LOGTIME_SHOW_GOAL: boolean;
  LOGTIME_SHOW_TACOS: boolean;
  LOGTIME_SHOW_DAYS_MODE: ShowDaysMode;
  LOGTIME_CALENDAR_COLOR: string;
  LOGTIME_LABELS_COLOR: string;
};

export const DEFAULT_LOGTIME_CONFIG: LogtimeConfig = {
  LOGTIME_GOAL_HOURS: 140,
  LOGTIME_SHOW_AVERAGE: true,
  LOGTIME_SHOW_GOAL: true,
  LOGTIME_SHOW_TACOS: false,
  LOGTIME_SHOW_DAYS_MODE: "date",
  LOGTIME_CALENDAR_COLOR: "#00BCBA",
  LOGTIME_LABELS_COLOR: "#26a641",
};

export const LOGTIME_CONFIG_KEYS = Object.keys(
  DEFAULT_LOGTIME_CONFIG,
) as (keyof LogtimeConfig)[];

export function getLogtimeStorageKey(key: keyof LogtimeConfig): string {
  return key;
}
