export const FEATURE_DEFS = [
  {
    id: "logtime",
    name: "Logtime",
    desc: "Redesign the logtime to show weekly and total hours on 42 Intra v3.",
  },
  {
    id: "clusters",
    name: "Clusters",
    desc: "Adds iMac direction markers and a default cluster picker with saved preference.",
  },
  {
    id: "profile",
    name: "Profile",
    desc: "Improves readability and allows local profile/background image customization.",
  },
] as const;

export type FeatureId = (typeof FEATURE_DEFS)[number]["id"];
export const FEATURE_IDS = new Set<FeatureId>(FEATURE_DEFS.map((f) => f.id));

export const STORAGE_KEY = "ACTIVE_SCRIPTS";

export const FEATURE_PAGE_GUARDS: Record<FeatureId, (loc: Location) => boolean> = {
  logtime: (loc) => loc.hostname === "profile-v3.intra.42.fr",
  profile: (loc) => loc.hostname === "profile-v3.intra.42.fr",
  clusters: (loc) =>
    loc.hostname === "meta.intra.42.fr" && loc.pathname.startsWith("/clusters"),
};

export const FEATURE_PAGE_URLS: Record<FeatureId, string> = {
  logtime: "https://profile-v3.intra.42.fr",
  profile: "https://profile-v3.intra.42.fr",
  clusters: "https://meta.intra.42.fr/clusters",
};

export const HUB_INFO = {
  name: "42 Intra Hub",
  version: "1.0.0",
  author: "nicopasla",
  github: "https://github.com/nicopasla/42-userscripts",
  issues: "https://github.com/nicopasla/42-userscripts/issues",
  license: "MIT",
} as const;
