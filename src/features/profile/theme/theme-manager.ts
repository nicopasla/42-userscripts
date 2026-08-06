import { getConfig } from "../../../config.ts";
import themev3 from "./theme-dark-v3.css?inline";
import themev2 from "./theme-dark-v2.css?inline";
import themeLightV3 from "./theme-light-default-v3.css?inline";
import themeLightV3Overrides from "./theme-light-v3.css?inline";
import themesJson from "./themes.json";

type ThemeModeVars = {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  popover: string;
  popoverForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
};

type ThemePreset = {
  primary: string;
  primaryForeground: string;
  ring: string;
  dark?: ThemeModeVars;
  light?: ThemeModeVars;
};

export const THEMES: Record<string, ThemePreset> = themesJson;

function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

async function applyThemePreset() {
  const presetKey = await getConfig("PROFILE_THEME_PRESET");
  const isDark = document.documentElement.classList.contains("dark");

  let styleEl = document.getElementById(
    "better-intra-theme-preset",
  ) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "better-intra-theme-preset";
    (document.head || document.documentElement).appendChild(styleEl);
  }

  if (!presetKey || presetKey === "dark" || presetKey === "light") {
    styleEl.textContent = "";
    return;
  }

  const preset = THEMES[presetKey];
  if (!preset) {
    styleEl.textContent = "";
    return;
  }

  const { primary, primaryForeground, ring } = preset;
  let content = "";

  if (isDark && preset.dark) {
    const vars = [
      `--primary: ${primary}`,
      `--primary-foreground: ${primaryForeground}`,
      `--ring: ${ring}`,
    ];
    for (const [key, val] of Object.entries(preset.dark)) {
      vars.push(`--${toKebab(key)}: ${val}`);
    }
    content = `html.dark {\n    ${vars.join(";\n    ")};\n  }`;
  } else if (!isDark && preset.light) {
    const vars = [
      `--primary: ${primary}`,
      `--primary-foreground: ${primaryForeground}`,
      `--ring: ${ring}`,
      `--legacy-main: var(--primary)`,
    ];
    for (const [key, val] of Object.entries(preset.light)) {
      vars.push(`--${toKebab(key)}: ${val}`);
    }
    content = `html:not(.dark) {\n    ${vars.join(";\n    ")};\n  }\n${themeLightV3Overrides}`;
  }

  styleEl.textContent = content;
}

function applyTheme(theme: "dark" | "light") {
  const isDark = theme === "dark";
  const isV3 = window.location.hostname === "profile-v3.intra.42.fr";

  if (!isV3) {
    let styleEl = document.getElementById("better-intra-theme-stylesheet");
    let presetEl = document.getElementById("better-intra-theme-preset");
    if (presetEl) presetEl.remove();
    if (isDark) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "better-intra-theme-stylesheet";
        (document.head || document.documentElement).appendChild(styleEl);
      }
      styleEl.textContent = themev2;
      document.documentElement.classList.add("dark");
    } else {
      if (styleEl) styleEl.remove();
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.removeAttribute("data-theme");
    if (document.body) document.body.classList.toggle("dark", isDark);
    sessionStorage.setItem("intra-theme", theme);
    return;
  }

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", theme);
  if (document.body) {
    document.body.classList.toggle("dark", isDark);
  }

  let styleEl = document.getElementById("better-intra-theme-stylesheet");

  if (isDark) {
    const css = isV3 ? themev3 : themev2;
    if (styleEl) {
      styleEl.textContent = css;
    } else {
      styleEl = document.createElement("style");
      styleEl.id = "better-intra-theme-stylesheet";
      styleEl.textContent = css;
      (document.head || document.documentElement).appendChild(styleEl);
    }
  } else if (isV3) {
    const css = themeLightV3;
    if (styleEl) {
      styleEl.textContent = css;
    } else {
      styleEl = document.createElement("style");
      styleEl.id = "better-intra-theme-stylesheet";
      styleEl.textContent = css;
      (document.head || document.documentElement).appendChild(styleEl);
    }
  } else if (styleEl) {
    styleEl.remove();
  }

  void applyThemePreset();

  sessionStorage.setItem("intra-theme", theme);
}

export async function getEffectiveTheme(): Promise<"dark" | "light"> {
  const savedTheme = await getConfig("BETTER_INTRA_THEME");

  if (savedTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return (savedTheme as "dark" | "light") || "light";
}

export async function getIsLight(): Promise<boolean> {
  return (await getEffectiveTheme()) === "light";
}

let themeManagerInitialized = false;

export async function initThemeManager() {
  const cachedTheme = sessionStorage.getItem("intra-theme") as
    | "dark"
    | "light"
    | null;
  if (cachedTheme) {
    applyTheme(cachedTheme);
  }
  const initialTheme = await getEffectiveTheme();
  if (initialTheme !== cachedTheme) {
    applyTheme(initialTheme);
  }

  if (themeManagerInitialized) return;
  themeManagerInitialized = true;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.BETTER_INTRA_THEME) {
      sessionStorage.removeItem("intra-theme");
      initThemeManager();
    }
    if (area === "local" && changes.PROFILE_THEME_PRESET) {
      void applyThemePreset();
    }
  });
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", async (e) => {
      const savedTheme = await getConfig("BETTER_INTRA_THEME");
      if (savedTheme === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
}
