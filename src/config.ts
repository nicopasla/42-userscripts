/**
 * Manages all configuration for the Better Intra extension.
 * This file serves as the single source of truth for configuration keys,
 * their types, default values, and the logic for retrieving them from storage.
 */

/**
 * Defines the complete shape and types for all configuration options.
 * Using a strict interface ensures type safety across the application
 * and provides excellent autocompletion in the IDE.
 */
export interface BetterIntraConfig {
  // General Settings
  ACTIVE_SCRIPTS: string[];
  BETTER_INTRA_THEME: "dark" | "light" | "system";
  DISABLE_ANIMATIONS: boolean;

  // Cloud Sync Settings
  CLOUD_SYNC_ENABLED: boolean;
  LAST_CLOUD_SYNC: number | null;
  CLOUD_TOKEN: string;
  CLOUD_LOGIN: string;
  CLOUD_AUTH_FAILED: boolean;
  ACCOUNT: object | null; // Stores user account info from 42 API

  // Logtime Feature Settings
  LOGTIME_GOAL_HOURS: number;
  LOGTIME_SHOW_AVERAGE: boolean;
  LOGTIME_SHOW_GOAL: boolean;
  LOGTIME_SHOW_TACOS: boolean;
  LOGTIME_EMOJI: string;
  LOGTIME_EMOJI_DIVISOR: number;
  LOGTIME_EMOJI_RATE: number;
  LOGTIME_MAX_EARNINGS: number;
  LOGTIME_SHOW_DAYS_MODE: "date" | "days" | "both";
  LOGTIME_CALENDAR_COLOR: string;
  LOGTIME_LABELS_COLOR: string;
  LOGTIME_CALENDAR_VIEW: string;

  // Clusters Feature Settings
  CLUSTERS_SHOW_MARKERS: boolean;
  CLUSTERS_DEFAULT_ID: string;
  CLUSTERS_OPEN_NEW_TAB: boolean;

  // Profile Feature Settings
  PROFILE_EVENT_TYPE_FILTER: string;
  CLUSTERS_CAMPUS: string;
  PROFILE_IMAGE_URL: string;
  PROFILE_BANNER_URL: string;
  PROFILE_BANNER_MODE: "fill" | "fit";
  PROFILE_BANNER_COLOR: string;
  PROFILE_BACKGROUND_URL: string;
  PROFILE_BACKGROUND_MODE: "fill" | "fit";
  PROFILE_BACKGROUND_COLOR: string;
  PROFILE_CARD_ORDER: string[];
  PROFILE_USE_CUSTOM_COLOR: boolean;
  PROFILE_THEME_PRESET: string;
  PROFILE_SHOW_MARKS: boolean;
  PROFILE_SHOW_ROULETTE: boolean;
  PROFILE_SHOW_ROULETTE_HISTORY: boolean;
  PROFILE_MARKS_SORT_ORDER: "newest_first" | "oldest_first";
  PROFILE_PROJECTS_SORT: boolean;
  PROFILE_MARKS_SHOW_REAL_DATE: boolean;
  PROFILE_SHOW_ACHIEVEMENTS: boolean;
  PROFILE_SHOW_EVALUATIONS: boolean;
  PROFILE_USE_MODERN_INFO_CARD: boolean;
  PROFILE_AVATAR_BG: string;
  PROFILE_DECORATION: string;
  PROFILE_AVATAR_POSITION_X: number;
  PROFILE_AVATAR_POSITION_Y: number;
  PROFILE_AVATAR_SCALE: number;
  PROFILE_IMAGE_HISTORY: string[];
  PROFILE_BANNER_HISTORY: string[];
  PROFILE_BACKGROUND_HISTORY: string[];

  // Shortcuts Feature Settings
  SHORTCUTS_LINKS: { name: string; url: string }[];
  SHORTCUTS_HIDE_IMPORTANT_LINKS: boolean;
  SHORTCUTS_ALIGNMENT: "left" | "center" | "right";

  FRIENDS_LIST: string[];
  FRIENDS_SORT_MODE: "online" | "name" | "level" | "wallet" | "correction";
  SHOW_FRIENDS_WIDGET: boolean;
  SHOW_CUSTOM_AVATARS_IN_FRIENDS: boolean;
  FRIENDS_DATA_CACHE: { data: unknown[]; timestamp: number } | null;
  TRACKER_MODE:
    | "off"
    | "phoenix-1"
    | "phoenix-2"
    | "phoenix-3"
    | "phoenix-4"
    | "pegasus-bronze"
    | "pegasus-silver"
    | "pegasus-gold"
    | "pegasus-diamond"
    | "pegasus-vibranium";

  DISCORD_ENABLED: boolean;
  DISCORD_ID: string;
  DISCORD_USERNAME: string;
  DISCORD_QUIET_ENABLED: boolean;
  DISCORD_QUIET_START: string;
  DISCORD_QUIET_END: string;

  // Calendar Sync
  CALENDAR_SYNC_TOKEN: string;
  CALENDAR_EVENTS_HASH: string;
  ADVANCED_OPEN_LINKS_NEW_TAB: boolean;
}

/**
 * Provides the default values for every configuration key.
 * This object is used as a fallback if a value is not found in chrome.storage.local.
 * It must implement the BetterIntraConfig interface to ensure all keys have a default.
 */
export const CONFIG_DEFAULT: BetterIntraConfig = {
  ACTIVE_SCRIPTS: ["logtime", "clusters", "profile", "shortcuts"],
  CLOUD_SYNC_ENABLED: false,
  LAST_CLOUD_SYNC: null,
  CLOUD_TOKEN: "",
  CLOUD_LOGIN: "",
  CLOUD_AUTH_FAILED: false,
  ACCOUNT: null,

  LOGTIME_GOAL_HOURS: 140,
  LOGTIME_SHOW_AVERAGE: true,
  LOGTIME_SHOW_GOAL: true,
  DISABLE_ANIMATIONS: false,
  LOGTIME_SHOW_TACOS: false,
  LOGTIME_EMOJI: "🌮",
  LOGTIME_EMOJI_DIVISOR: 8.7,
  LOGTIME_EMOJI_RATE: 2,
  LOGTIME_MAX_EARNINGS: 500,
  LOGTIME_SHOW_DAYS_MODE: "date",
  LOGTIME_CALENDAR_COLOR: "#00BCBA",
  LOGTIME_LABELS_COLOR: "#26a641",
  LOGTIME_CALENDAR_VIEW: "normal",

  CLUSTERS_SHOW_MARKERS: true,
  CLUSTERS_DEFAULT_ID: "",
  CLUSTERS_OPEN_NEW_TAB: false,

  PROFILE_EVENT_TYPE_FILTER: "all",
  CLUSTERS_CAMPUS: "",
  PROFILE_IMAGE_URL: "",
  PROFILE_BANNER_URL: "",
  PROFILE_BANNER_MODE: "fill",
  PROFILE_BANNER_COLOR: "",
  PROFILE_BACKGROUND_URL: "",
  PROFILE_BACKGROUND_MODE: "fill",
  PROFILE_BACKGROUND_COLOR: "",
  PROFILE_CARD_ORDER: [
    "AGENDA",
    "EVALUATIONS",
    "LOGTIME",
    "ACHIEVEMENTS",
    "PROJECTS",
    "THURSDAY ROULETTE",
  ],
  PROFILE_USE_CUSTOM_COLOR: true,
  PROFILE_THEME_PRESET: "dark",
  PROFILE_SHOW_MARKS: true,
  PROFILE_SHOW_ROULETTE: true,
  PROFILE_SHOW_ROULETTE_HISTORY: true,
  PROFILE_MARKS_SORT_ORDER: "newest_first",
  PROFILE_PROJECTS_SORT: true,
  PROFILE_MARKS_SHOW_REAL_DATE: false,
  PROFILE_SHOW_ACHIEVEMENTS: true,
  PROFILE_SHOW_EVALUATIONS: false,
  PROFILE_USE_MODERN_INFO_CARD: true,
  PROFILE_AVATAR_BG: "transparent",
  PROFILE_DECORATION: "none",
  PROFILE_AVATAR_POSITION_X: 50,
  PROFILE_AVATAR_POSITION_Y: 50,
  PROFILE_AVATAR_SCALE: 100,
  PROFILE_IMAGE_HISTORY: [],
  PROFILE_BANNER_HISTORY: [],
  PROFILE_BACKGROUND_HISTORY: [],

  BETTER_INTRA_THEME: "dark",
  SHORTCUTS_LINKS: [],
  SHORTCUTS_HIDE_IMPORTANT_LINKS: false,
  SHORTCUTS_ALIGNMENT: "left",

  FRIENDS_LIST: [],
  FRIENDS_SORT_MODE: "level",
  SHOW_FRIENDS_WIDGET: true,
  SHOW_CUSTOM_AVATARS_IN_FRIENDS: true,
  FRIENDS_DATA_CACHE: null,
  TRACKER_MODE: "off",

  DISCORD_ENABLED: false,
  DISCORD_ID: "",
  DISCORD_USERNAME: "",
  DISCORD_QUIET_ENABLED: false,
  DISCORD_QUIET_START: "22:00",
  DISCORD_QUIET_END: "08:00",

  CALENDAR_SYNC_TOKEN: "",
  CALENDAR_EVENTS_HASH: "",
  ADVANCED_OPEN_LINKS_NEW_TAB: true,
};

/**
 * A type representing all possible configuration keys, derived directly
 * from the BetterIntraConfig interface to prevent any mismatches.
 */
export type ConfigKey = keyof BetterIntraConfig;

export const CLOUD_SYNC_KEYS: ConfigKey[] = [
  "ACTIVE_SCRIPTS",
  "BETTER_INTRA_THEME",
  "DISABLE_ANIMATIONS",
  "LOGTIME_GOAL_HOURS",
  "LOGTIME_SHOW_AVERAGE",
  "LOGTIME_SHOW_GOAL",
  "LOGTIME_SHOW_TACOS",
  "LOGTIME_EMOJI",
  "LOGTIME_EMOJI_DIVISOR",
  "LOGTIME_EMOJI_RATE",
  "LOGTIME_MAX_EARNINGS",
  "LOGTIME_SHOW_DAYS_MODE",
  "LOGTIME_CALENDAR_COLOR",
  "LOGTIME_LABELS_COLOR",
  "LOGTIME_CALENDAR_VIEW",
  "CLUSTERS_SHOW_MARKERS",
  "CLUSTERS_DEFAULT_ID",
  "CLUSTERS_OPEN_NEW_TAB",
  "PROFILE_EVENT_TYPE_FILTER",
  "CLUSTERS_CAMPUS",
  "PROFILE_IMAGE_URL",
  "PROFILE_BANNER_URL",
  "PROFILE_BANNER_MODE",
  "PROFILE_BANNER_COLOR",
  "PROFILE_BACKGROUND_URL",
  "PROFILE_BACKGROUND_MODE",
  "PROFILE_BACKGROUND_COLOR",
  "PROFILE_CARD_ORDER",
  "PROFILE_USE_CUSTOM_COLOR",
  "PROFILE_THEME_PRESET",
  "PROFILE_SHOW_MARKS",
  "PROFILE_SHOW_ROULETTE",
  "PROFILE_SHOW_ROULETTE_HISTORY",
  "PROFILE_MARKS_SORT_ORDER",
  "PROFILE_PROJECTS_SORT",
  "PROFILE_MARKS_SHOW_REAL_DATE",
  "PROFILE_SHOW_ACHIEVEMENTS",
  "PROFILE_SHOW_EVALUATIONS",
  "PROFILE_USE_MODERN_INFO_CARD",
  "PROFILE_AVATAR_BG",
  "PROFILE_DECORATION",
  "PROFILE_AVATAR_POSITION_X",
  "PROFILE_AVATAR_POSITION_Y",
  "PROFILE_AVATAR_SCALE",
  "PROFILE_IMAGE_HISTORY",
  "PROFILE_BANNER_HISTORY",
  "PROFILE_BACKGROUND_HISTORY",
  "SHORTCUTS_LINKS",
  "SHORTCUTS_HIDE_IMPORTANT_LINKS",
  "SHORTCUTS_ALIGNMENT",
  "FRIENDS_LIST",
  "FRIENDS_SORT_MODE",
  "SHOW_FRIENDS_WIDGET",
  "SHOW_CUSTOM_AVATARS_IN_FRIENDS",
  "DISCORD_ENABLED",
  "DISCORD_ID",
  "DISCORD_USERNAME",
  "DISCORD_QUIET_ENABLED",
  "DISCORD_QUIET_START",
  "DISCORD_QUIET_END",
  "CALENDAR_SYNC_TOKEN",
  "CALENDAR_EVENTS_HASH",
  "ADVANCED_OPEN_LINKS_NEW_TAB",
  "CLOUD_SYNC_ENABLED",
  "TRACKER_MODE",
];

export const VISUAL_CLOUD_KEYS: ConfigKey[] = [
  "PROFILE_IMAGE_URL",
  "PROFILE_BANNER_URL",
  "PROFILE_BANNER_MODE",
  "PROFILE_BANNER_COLOR",
  "PROFILE_BACKGROUND_URL",
  "PROFILE_BACKGROUND_MODE",
  "PROFILE_BACKGROUND_COLOR",
  "PROFILE_AVATAR_BG",
  "PROFILE_DECORATION",
  "PROFILE_AVATAR_POSITION_X",
  "PROFILE_AVATAR_POSITION_Y",
  "PROFILE_AVATAR_SCALE",
  "PROFILE_IMAGE_HISTORY",
  "PROFILE_BANNER_HISTORY",
  "PROFILE_BACKGROUND_HISTORY",
];

/**
 * Asynchronously retrieves a configuration value from storage.
 *
 * This generic function is the primary way to access configuration throughout the extension.
 * It fetches the value for the given `key` from `chrome.storage.local`.
 * If the value is not found in storage, it returns the corresponding default value
 * from the `CONFIG_DEFAULT` object.
 *
 * It also includes a helpful feature to automatically parse stringified JSON
 * for values that are objects or arrays.
 *
 * @param key The configuration key to retrieve.
 * @returns A promise that resolves to the value of the requested configuration key,
 *          with the correct type inferred from the BetterIntraConfig interface.
 */
export const getConfig = async <T extends ConfigKey>(
  key: T,
): Promise<BetterIntraConfig[T]> => {
  const res = await chrome.storage.local.get(key);
  let value = res && res[key] !== undefined ? res[key] : CONFIG_DEFAULT[key];

  // Some legacy callers serialize arrays/objects as JSON strings (e.g. hub settings).
  // Parse those back so consumers get the declared type.
  if (
    typeof value === "string" &&
    (value.startsWith("[") || value.startsWith("{"))
  ) {
    try {
      value = JSON.parse(value);
    } catch {
      /* keep string */
    }
  }

  if (key === "PROFILE_CARD_ORDER" && Array.isArray(value)) {
    const stored = value as string[];
    const defaults = CONFIG_DEFAULT.PROFILE_CARD_ORDER;
    const storedSet = new Set(
      stored.map((s) => s.replace(/^-/, "").toUpperCase()),
    );
    for (const def of defaults) {
      if (!storedSet.has(def.toUpperCase())) {
        stored.push(def);
      }
    }
  }

  return value as BetterIntraConfig[T];
};
