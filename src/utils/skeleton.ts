const STYLE_ID = "ft-skeleton-style";

function ensureSkeletonStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = [
    "@keyframes ft-skeleton-pulse{0%,100%{opacity:.45}50%{opacity:.85}}",
    ".ft-skeleton{display:inline-block;border-radius:6px;",
    "background:currentColor;opacity:.45;animation:ft-skeleton-pulse 1.4s ease-in-out infinite}",
    "@media (prefers-reduced-motion: reduce){.ft-skeleton{animation:none}}",
  ].join("");
  document.head.appendChild(style);
}

export interface SkeletonOptions {
  width: string;
  height: string;
  radius?: string;
}

/**
 * A placeholder bar drawn in the current text color, used to hold the space of
 * a value that is still being fetched.
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
