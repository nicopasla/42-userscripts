import { getConfig } from "../config.ts";

const STYLE_ID = "ft-skeleton-style";

/**
 * Placeholders are drawn from `currentColor`, so they pick up the surrounding
 * text color: a soft grey on the light theme, a soft light tint on the dark
 * one, and the accent color inside colored pills. Only a small percentage of
 * that color is used, so the bar reads as an empty slot, never as a solid
 * block.
 */
function ensureSkeletonStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "@keyframes ft-skeleton-sweep{from{transform:translateX(-100%)}to{transform:translateX(100%)}}",
    ".ft-skeleton{position:relative;display:inline-block;overflow:hidden;",
    "border-radius:6px;vertical-align:middle;",
    "background:color-mix(in srgb, currentColor 11%, transparent)}",
    ".ft-skeleton::after{content:'';position:absolute;inset:0;",
    "background:linear-gradient(90deg, transparent, ",
    "color-mix(in srgb, currentColor 13%, transparent), transparent);",
    "animation:ft-skeleton-sweep 1.6s ease-in-out infinite}",
    "@media (prefers-reduced-motion: reduce){.ft-skeleton::after{display:none}}",
    ".ft-skeleton-static .ft-skeleton::after,",
    ".ft-skeleton-static.ft-skeleton::after{display:none}",
  ].join("");
  document.head.appendChild(style);

  // The sweep follows the extension-wide animation switch.
  void getConfig("DISABLE_ANIMATIONS").then((disabled) => {
    if (disabled) document.documentElement.classList.add("ft-skeleton-static");
  });
}

export interface SkeletonOptions {
  width: string;
  height: string;
  radius?: string;
}

/**
 * A placeholder bar holding the space of a value that is still being fetched.
 */
export function createSkeleton(options: SkeletonOptions): HTMLElement {
  ensureSkeletonStyle();
  const bar = document.createElement("span");
  bar.className = "ft-skeleton";
  bar.style.width = options.width;
  bar.style.height = options.height;
  if (options.radius) bar.style.borderRadius = options.radius;
  return bar;
}

/** Stack of skeleton bars, for a list or a table that is still loading. */
export function createSkeletonLines(
  count: number,
  options: SkeletonOptions & { gap?: string },
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = `display: flex; flex-direction: column; gap: ${
    options.gap ?? "8px"
  };`;
  for (let i = 0; i < count; i++) {
    wrap.appendChild(createSkeleton(options));
  }
  return wrap;
}
