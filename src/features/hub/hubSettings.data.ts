import CLOCK from "../../assets/svg/clock.svg?raw";
import CALENDAR from "../../assets/svg/calendar.svg?raw";
import CLUSTERS from "../../assets/svg/clusters.svg?raw";
import USER from "../../assets/svg/user.svg?raw";
import SHORTCUT from "../../assets/svg/shortcut.svg?raw";
import ABOUT from "../../assets/svg/about.svg?raw";
import DISCORD_SVG from "../../assets/svg/discord.svg?raw";
import ADVANCED_SVG from "../../assets/svg/advanced.svg?raw";
import GRID_SVG from "../../assets/svg/grid.svg?raw";
import { CONFIG_DEFAULT, ConfigKey } from "../../config.ts";
import { CLUSTERS as CLUSTER_OPTIONS } from "../clusters/clusters.data.ts";

export const HUB_INFO = {
  name: "Better Intra",
  version: __APP_VERSION__,
  author: "https://github.com/nicopasla",
  github: "https://github.com/nicopasla/better-intra",
  issues: "https://github.com/nicopasla/better-intra/issues",
  license: "MIT",
} as const;

export const FEATURE_DEFS = [
  {
    id: "profile",
    name: "Profile",
    icon: USER,
    desc: "Improves readability and allows local profile/background image customization.",
    cols: 2,
  },
  {
    id: "clusters",
    name: "Clusters",
    icon: CLUSTERS,
    desc: "Adds 'chair' direction markers and a default cluster picker with saved preference.",
    cols: 2,
  },
  {
    id: "logtime",
    name: "Logtime",
    icon: CLOCK,
    desc: "Redesign the logtime to show weekly and total hours.",
    cols: 3,
  },
  {
    id: "shortcuts",
    name: "Shortcuts",
    icon: SHORTCUT,
    desc: "Manage custom navigation links.",
    cols: 3,
  },
  {
    id: "discord",
    name: "Discord",
    icon: DISCORD_SVG,
    desc: "Get evaluation reminders via Discord DM.",
  },
  {
    id: "plugins",
    name: "Plugins",
    icon: GRID_SVG,
    desc: "Enable or disable optional add-ons. More can be added later.",
    cols: 3,
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: CALENDAR,
    desc: "Subscribe to your 42 events in Google Calendar, Apple Calendar, or any calendar app.",
  },
  {
    id: "advanced",
    name: "Advanced",
    icon: ADVANCED_SVG,
    desc: "General behavior settings.",
    cols: 2,
  },
  {
    id: "about",
    name: "About",
    icon: ABOUT,
    desc: "Information about Better Intra and its technical stack.",
  },
] as const;

export type FeatureId = (typeof FEATURE_DEFS)[number]["id"];
export const FEATURE_IDS = new Set<FeatureId>(FEATURE_DEFS.map((f) => f.id));

export const STORAGE_KEY = "ACTIVE_SCRIPTS";

export type SettingKind =
  | "toggle"
  | "number"
  | "text"
  | "url"
  | "select"
  | "color"
  | "radio-group"
  | "divider"
  | "shortcuts"
  | "emoji"
  | "about"
  | "card-order"
  | "action"
  | "discord-panel"
  | "calendar-panel"
  | "theme-preset"
  | "campus-info"
  | "feature-cards";

export { INTRA_FONT } from "../logtime/constants.ts";

export type HubSettingDef = {
  feature: FeatureId;
  label: string;
  key?: ConfigKey;
  desc?: string;
  kind: SettingKind;
  nullable?: boolean;
  defaultValue?: unknown;
  options?: readonly {
    label?: string;
    value?: string;
    color?: string;
    desc?: string;
    divider?: boolean;
  }[];
  grid?: boolean;
  colSpan?: number;
  fullWidth?: boolean;
  dependsOn?: ConfigKey;
  requiresCloud?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  actionLabel?: string;
  actionType?: "export" | "import" | "reset" | "backup";
};

export const HUB_SETTING_DEFS: Record<FeatureId, readonly HubSettingDef[]> = {
  logtime: [
    {
      feature: "logtime",
      key: "LOGTIME_GOAL_HOURS",
      label: "Monthly goal",
      desc: "Sets the target number of hour.",
      kind: "number",
      min: 0,
      step: 1,
      defaultValue: CONFIG_DEFAULT.LOGTIME_GOAL_HOURS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_SHOW_AVERAGE",
      label: "Show average",
      desc: "Displays average hours per active day.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.LOGTIME_SHOW_AVERAGE,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_SHOW_GOAL",
      label: "Show goal",
      desc: "Shows the goal indicator.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.LOGTIME_SHOW_GOAL,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_SHOW_DAYS_MODE",
      label: "Day labels mode",
      desc: "Chooses how the day labels are displayed.",
      kind: "radio-group",
      defaultValue: CONFIG_DEFAULT.LOGTIME_SHOW_DAYS_MODE,
      options: [
        { label: "17/04", value: "date" },
        { label: "17/04 (2 days ago)", value: "both" },
        { label: "2 days ago", value: "days" },
      ],
      grid: false,
    },

    { feature: "logtime", label: "Emoji & Earnings", kind: "divider" },

    {
      feature: "logtime",
      key: "LOGTIME_SHOW_TACOS",
      label: "Show emoji",
      desc: "Enables the emoji visual markers.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.LOGTIME_SHOW_TACOS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_EMOJI",
      label: "Custom Emoji",
      desc: "Replace 🌮 with your favorite emoji.",
      kind: "emoji",
      placeholder: "🌮🌮🌮",
      defaultValue: CONFIG_DEFAULT.LOGTIME_EMOJI,
      grid: true,
      colSpan: 1,
      dependsOn: "LOGTIME_SHOW_TACOS",
    },
    {
      feature: "logtime",
      key: "LOGTIME_EMOJI_DIVISOR",
      label: "Emoji Value",
      desc: "Value of the emoji.",
      kind: "number",
      defaultValue: CONFIG_DEFAULT.LOGTIME_EMOJI_DIVISOR,
      grid: true,
      colSpan: 1,
      dependsOn: "LOGTIME_SHOW_TACOS",
    },
    {
      feature: "logtime",
      key: "LOGTIME_EMOJI_RATE",
      label: "Hourly Earning",
      desc: "How much you earn per hour.",
      kind: "number",
      defaultValue: CONFIG_DEFAULT.LOGTIME_EMOJI_RATE,
      grid: true,
      colSpan: 1,
      dependsOn: "LOGTIME_SHOW_TACOS",
    },
    {
      feature: "logtime",
      key: "LOGTIME_MAX_EARNINGS",
      label: "Max Earnings",
      desc: "Cap on total earnings per month.",
      kind: "number",
      defaultValue: CONFIG_DEFAULT.LOGTIME_MAX_EARNINGS,
      grid: true,
      colSpan: 1,
      dependsOn: "LOGTIME_SHOW_TACOS",
    },

    { feature: "logtime", label: "Appearance", kind: "divider" },

    {
      feature: "logtime",
      key: "LOGTIME_CALENDAR_COLOR",
      label: "Calendar color",
      desc: "Accent color used for the calendar.",
      kind: "color",
      placeholder: "#00BCBA",
      defaultValue: CONFIG_DEFAULT.LOGTIME_CALENDAR_COLOR,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_LABELS_COLOR",
      label: "Labels color",
      desc: "Accent color used for labels and totals.",
      kind: "color",
      placeholder: "#26a641",
      defaultValue: CONFIG_DEFAULT.LOGTIME_LABELS_COLOR,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "logtime",
      key: "LOGTIME_CALENDAR_VIEW",
      label: "Calendar view",
      desc: "Choose how months are displayed in the logtime card.",
      kind: "select",
      defaultValue: CONFIG_DEFAULT.LOGTIME_CALENDAR_VIEW,
      options: [
        { label: "Normal", value: "normal" },
        { label: "Compact", value: "compact" },
        { label: "Heatmap", value: "heatmap" },
      ],
      grid: true,
      colSpan: 1,
    },
  ],
  clusters: [
    {
      feature: "clusters",
      key: "CLUSTERS_SHOW_MARKERS",
      label: "Show markers",
      desc: "Shows the direction markers on the cluster screen.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.CLUSTERS_SHOW_MARKERS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "clusters",
      key: "CLUSTERS_OPEN_NEW_TAB",
      label: "Open profiles in new tab",
      desc: "When clicking a user on the clusters map, opens their profile in a new tab.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.CLUSTERS_OPEN_NEW_TAB,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "clusters",
      key: "CLUSTERS_DEFAULT_ID",
      label: "Default cluster",
      desc: "Prefills a cluster page when the page opens.",
      kind: "select",
      defaultValue: String(CONFIG_DEFAULT.CLUSTERS_DEFAULT_ID),
      options: CLUSTER_OPTIONS.map((c) => ({
        label: c.name.toUpperCase(),
        value: c.id,
      })),
      grid: true,
      colSpan: 1,
    },
  ],
  profile: [
    {
      feature: "profile",
      label: "Appearance",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_THEME_PRESET",
      label: "Theme accent",
      desc: "Change the accent color used across the intranet.",
      kind: "theme-preset",
      fullWidth: true,
      defaultValue: CONFIG_DEFAULT.PROFILE_THEME_PRESET,
      options: [
        { label: "Dark" },
        { label: "Default Dark", value: "dark", color: "199 89% 48%" },
        { label: "Neon", value: "neon", color: "324 100% 50%" },
        { label: "Synthwave", value: "synthwave", color: "327 92% 68%" },
        { label: "Forest", value: "forest", color: "141 71% 42%" },
        { label: "Halloween", value: "halloween", color: "34 100% 50%" },
        { label: "Dracula", value: "dracula", color: "326 100% 74%" },
        { label: "Night", value: "night", color: "199 93% 60%" },
        { label: "Sunset", value: "sunset", color: "16 100% 68%" },
        { label: "Luxury", value: "luxury", color: "0 0% 100%" },
        { label: "Cyberpunk", value: "cyberpunk", color: "341 100% 70%" },
        { label: "Arthur", value: "dim", color: "108 66% 73%" },
        { label: "Black", value: "black", color: "0 0% 23%" },
        { label: "Coffee", value: "coffee", color: "30 66% 58%" },
        { label: "Aqua", value: "aqua", color: "182 90% 51%" },
        { divider: true },
        { label: "Light" },
        { label: "Default Light", value: "light", color: "181 100% 37%" },
        { label: "Cupcake", value: "cupcake", color: "183 47% 59%" },
        { label: "Bumblebee", value: "bumblebee", color: "45 100% 44%" },
        { label: "Emerald", value: "emerald", color: "141 50% 60%" },
        { label: "Corporate", value: "corporate", color: "223 49% 53%" },
        { label: "Retro", value: "retro", color: "10 70% 62%" },
        { label: "Valentine", value: "valentine", color: "346 79% 65%" },
        { label: "Garden", value: "garden", color: "0 65% 54%" },
        { label: "Lofi", value: "lofi", color: "0 0% 16%" },
        { label: "Pastel", value: "pastel", color: "295 47% 82%" },
        { label: "Fantasy", value: "fantasy", color: "285 60% 40%" },
        { label: "Wireframe", value: "wireframe", color: "0 0% 87%" },
        { label: "Cmyk", value: "cmyk", color: "220 62% 55%" },
        { label: "Autumn", value: "autumn", color: "11 56% 35%" },
        { label: "Acid", value: "acid", color: "319 57% 51%" },
        { label: "Lemonade", value: "lemonade", color: "106 50% 42%" },
        { label: "Winter", value: "winter", color: "226 59% 52%" },
        { label: "Nord", value: "nord", color: "211 37% 54%" },
        { label: "Caramellatte", value: "caramellatte", color: "0 0% 0%" },
        { label: "Silk", value: "silk", color: "230 21% 23%" },
        { label: "Soap", value: "soap", color: "4 68% 66%" },
        { label: "Citrus", value: "citrus", color: "51 100% 50%" },
      ],
    },
    {
      feature: "profile",
      key: "PROFILE_CARD_ORDER",
      label: "Dashboard Cards Order",
      desc: "Drag and drop the colored cards to prioritize your dashboard sections.",
      kind: "card-order",
      fullWidth: true,
      defaultValue: CONFIG_DEFAULT.PROFILE_CARD_ORDER,
    },
    {
      feature: "profile",
      key: "PROFILE_USE_CUSTOM_COLOR",
      label: "Use custom color on card",
      desc: "Applies the logtime calendar color to the profile card.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_USE_CUSTOM_COLOR,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      key: "PROFILE_USE_MODERN_INFO_CARD",
      label: "Modern info card",
      desc: "Replace the native stats bar with sleek info badges.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_USE_MODERN_INFO_CARD,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      label: "Achievements",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_SHOW_ACHIEVEMENTS",
      label: "Show all achievements",
      desc: "Replaces the native achievements card with a scrollable list of all achievements.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_SHOW_ACHIEVEMENTS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      label: "Projects",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_SHOW_MARKS",
      label: "Show past marks",
      desc: "Adds a list of completed project marks in the Projects card.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_SHOW_MARKS,
      grid: true,
      colSpan: 1,
      requiresCloud: true,
    },
    {
      feature: "profile",
      key: "PROFILE_MARKS_SORT_ORDER",
      label: "Marks sort order",
      desc: "Sort completed projects by date.",
      kind: "select",
      defaultValue: CONFIG_DEFAULT.PROFILE_MARKS_SORT_ORDER,
      options: [
        { label: "Newest first", value: "newest_first" },
        { label: "Oldest first", value: "oldest_first" },
      ],
      grid: true,
      colSpan: 1,
      dependsOn: "PROFILE_SHOW_MARKS",
      requiresCloud: true,
    },
    {
      feature: "profile",
      key: "PROFILE_PROJECTS_SORT",
      label: "Projects sort",
      desc: "Adds a sort dropdown to the Marks list on user profiles.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_PROJECTS_SORT,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      key: "PROFILE_MARKS_SHOW_REAL_DATE",
      label: "Enhance marks display",
      desc: `Replaces relative dates with absolute dates (e.g. "19/06/26 11:13") on other users' profiles.`,
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_MARKS_SHOW_REAL_DATE,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      label: "Thursday Roulette",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_SHOW_ROULETTE",
      label: "Show Thursday Roulette card",
      desc: "Adds a card with roulette wins, points, and next draw countdown.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_SHOW_ROULETTE,
      grid: true,
      colSpan: 1,
      requiresCloud: true,
    },
    {
      feature: "profile",
      key: "PROFILE_SHOW_ROULETTE_HISTORY",
      label: "Show roulette history",
      desc: "Displays the full timeline of past roulette wins inside the card.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_SHOW_ROULETTE_HISTORY,
      grid: true,
      colSpan: 1,
      dependsOn: "PROFILE_SHOW_ROULETTE",
      requiresCloud: true,
    },
    {
      feature: "profile",
      label: "Pending Evaluations",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_SHOW_EVALUATIONS",
      label: "Sort pending evaluations",
      desc: "Organizes the pending evaluations card into Evaluator and Evaluated sections.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.PROFILE_SHOW_EVALUATIONS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      label: "Events",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "PROFILE_EVENT_TYPE_FILTER",
      label: "Event visibility",
      desc: "Choose which types of events you want to see.",
      kind: "radio-group",
      defaultValue: CONFIG_DEFAULT.PROFILE_EVENT_TYPE_FILTER,
      options: [],
    },
    {
      feature: "profile",
      label: "Friends",
      kind: "divider",
    },
    {
      feature: "profile",
      key: "SHOW_FRIENDS_WIDGET",
      label: "Show friends widget",
      desc: "Hides the friends button and widget entirely from the profile page.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.SHOW_FRIENDS_WIDGET,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "profile",
      key: "SHOW_CUSTOM_AVATARS_IN_FRIENDS",
      label: "Show custom avatars in friends",
      desc: "When available, displays friends' custom profile pictures instead of 42-generated avatars.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.SHOW_CUSTOM_AVATARS_IN_FRIENDS,
      grid: true,
      colSpan: 1,
      dependsOn: "SHOW_FRIENDS_WIDGET",
    },
  ],
  shortcuts: [
    {
      feature: "shortcuts",
      key: "SHORTCUTS_LINKS",
      label: "",
      kind: "shortcuts",
      fullWidth: true,
    },
    {
      feature: "shortcuts",
      key: "SHORTCUTS_HIDE_IMPORTANT_LINKS",
      label: "Hide important links",
      desc: "Hides the default Intra important links on the profile to give shortcuts the full width.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.SHORTCUTS_HIDE_IMPORTANT_LINKS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "shortcuts",
      key: "SHORTCUTS_ALIGNMENT",
      label: "Shortcuts alignment",
      desc: "Aligns shortcuts left, center, or right when important links are hidden.",
      kind: "select",
      defaultValue: CONFIG_DEFAULT.SHORTCUTS_ALIGNMENT,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ] as const,
      dependsOn: "SHORTCUTS_HIDE_IMPORTANT_LINKS",
      grid: true,
      colSpan: 2,
    },
  ],
  discord: [
    {
      feature: "discord",
      label: "Discord",
      desc: "Notifications and account connection.",
      kind: "discord-panel",
      fullWidth: true,
    },
  ],
  plugins: [
    {
      feature: "plugins",
      label: "",
      kind: "feature-cards",
      fullWidth: true,
      options: [
        {
          label: "Subject tracker",
          value: "SUBJECT_TRACKER_ENABLED",
          color: "warning",
          desc: "Shows a badge on project pages when a subject has been updated, comparing the subject link with the shared registry.",
        },
      ],
    },
  ],
  calendar: [
    {
      feature: "calendar",
      label: "Calendar Sync",
      desc: "Subscribe to your 42 events in your calendar app.",
      kind: "calendar-panel",
      fullWidth: true,
    },
  ],
  about: [
    {
      feature: "about",
      label: "",
      kind: "about",
      fullWidth: true,
    },
  ],
  advanced: [
    {
      feature: "advanced",
      key: "ADVANCED_OPEN_LINKS_NEW_TAB",
      label: "Open links in new tab",
      desc: "External links from Better Intra open in a new tab instead of the current one.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.ADVANCED_OPEN_LINKS_NEW_TAB,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "advanced",
      key: "DISABLE_ANIMATIONS",
      label: "Disable animations",
      desc: "Removes transition effects across all Better Intra features.",
      kind: "toggle",
      defaultValue: CONFIG_DEFAULT.DISABLE_ANIMATIONS,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "advanced",
      label: "Auto-detected campus",
      desc: "Your campus, detected automatically via the 42 API.",
      kind: "campus-info",
      fullWidth: false,
      grid: true,
      colSpan: 1,
    },
    {
      feature: "advanced",
      label: "Backup & Restore",
      desc: "Export or import your Better Intra settings as a JSON file.",
      kind: "action",
      actionType: "backup",
      actionLabel: "Backup",
      grid: true,
      colSpan: 1,
    },
    { feature: "advanced", label: "Reset", kind: "divider" },
    {
      feature: "advanced",
      label: "Reset all data",
      desc: "Clear all Better Intra settings and start fresh. This cannot be undone.",
      kind: "action",
      actionType: "reset",
      actionLabel: "Reset",
    },
  ],
};
