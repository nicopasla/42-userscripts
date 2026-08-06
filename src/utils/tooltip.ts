import { render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";

export type TooltipPosition = "top" | "right";

const TOOLTIP_ID = "ft-floating-tooltip";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

let tooltipEl: HTMLElement | null = null;

function ensureTooltip(container: HTMLElement): HTMLElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = TOOLTIP_ID;
  }
  if (tooltipEl.parentElement !== container) {
    container.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function styleTooltip(
  el: HTMLElement,
  isLight: boolean,
  interactive: boolean,
  size?: string,
) {
  el.style.cssText = [
    "position: fixed",
    "z-index: 999999",
    interactive ? "pointer-events: auto" : "pointer-events: none",
    "padding: 6px 10px",
    "border-radius: 8px",
    size ? `font-size: ${size}` : "font-size: 12px",
    "font-weight: 500",
    "font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "line-height: 1.3",
    "white-space: normal",
    "max-width: 260px",
    "box-shadow: 0 4px 14px rgba(0,0,0,0.25)",
    isLight
      ? "background:#ffffff;color:#1a1d24;border:1px solid rgba(0,0,0,0.12)"
      : "background:#181b23;color:#e8eaf0;border:1px solid rgba(255,255,255,0.1)",
    "visibility: hidden",
  ].join(";");
}

function positionTooltip(
  el: HTMLElement,
  target: HTMLElement,
  position: TooltipPosition,
) {
  const rect = target.getBoundingClientRect();
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  const margin = 8;
  let left: number;
  let top: number;
  if (position === "right") {
    left = rect.right + margin;
    if (left + tw > window.innerWidth - margin) {
      left = rect.left - tw - margin;
    }
    top = rect.top + rect.height / 2 - th / 2;
    top = Math.max(margin, Math.min(top, window.innerHeight - th - margin));
  } else {
    left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    top = rect.top - th - margin;
    if (top < margin) top = rect.bottom + margin;
  }
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.visibility = "visible";
}

export function showFloatingTooltip(
  target: HTMLElement,
  text: string,
  isLight: boolean,
  container: HTMLElement,
  position: TooltipPosition = "top",
  size?: string,
): void {
  if (!text) return;
  const el = ensureTooltip(container);
  el.textContent = text;
  styleTooltip(el, isLight, false, size);
  positionTooltip(el, target, position);
}

export function showFloatingTooltipHtml(
  target: HTMLElement,
  html: string,
  isLight: boolean,
  container: HTMLElement,
  position: TooltipPosition = "top",
  size?: string,
): void {
  if (!html) return;
  const el = ensureTooltip(container);
  render(unsafeHTML(html), el);
  styleTooltip(el, isLight, true, size);
  positionTooltip(el, target, position);
}

export function hideFloatingTooltip(): void {
  if (!tooltipEl) return;
  tooltipEl.remove();
  tooltipEl = null;
}

const HIDE_DELAY = 150;

export const TOOLTIP_SHOW_DELAY = 200;

const boundRoots = new WeakSet<EventTarget>();

function isTip(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && (!!el.dataset.tip || !!el.dataset.tipHtml);
}

function findTooltipContainer(tip: Element): HTMLElement {
  let el: Element | null = tip;
  while (el) {
    const dlg = el.closest("dialog");
    if (dlg) return dlg;
    const root = el.getRootNode();
    el = root instanceof ShadowRoot ? root.host : null;
  }
  return document.body;
}

export function bindTooltips(
  root: EventTarget,
  provider: () => boolean | Promise<boolean>,
): void {
  if (boundRoots.has(root)) return;
  boundRoots.add(root);

  let isLightCache: boolean | null = null;
  let hovered: HTMLElement | null = null;
  let hideTimer: number | null = null;
  let showTimer: number | null = null;

  const resolveLight = async (): Promise<boolean> => {
    if (isLightCache === null) {
      try {
        isLightCache = await provider();
      } catch {
        isLightCache = false;
      }
    }
    return isLightCache;
  };

  const cancelHide = () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const cancelShow = () => {
    if (showTimer !== null) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      hovered = null;
      hideFloatingTooltip();
    }, HIDE_DELAY);
  };

  root.addEventListener("mouseover", (e) => {
    const path = e.composedPath() as Element[];
    if (path.some((el) => el instanceof HTMLElement && el.id === TOOLTIP_ID)) {
      cancelHide();
      return;
    }
    const tip = path.find(isTip) ?? null;
    if (!tip) return;
    cancelHide();
    cancelShow();
    hovered = tip;
    const position = tip.dataset.tipPos === "right" ? "right" : "top";
    const size = tip.dataset.tipSize || undefined;
    const container = findTooltipContainer(tip);
    void resolveLight().then((isLight) => {
      if (hovered !== tip) return;
      showTimer = window.setTimeout(() => {
        showTimer = null;
        if (hovered !== tip) return;
        if (tip.dataset.tipHtml) {
          showFloatingTooltipHtml(
            tip,
            tip.dataset.tipHtml,
            isLight,
            container,
            position,
            size,
          );
        } else if (tip.dataset.tip) {
          showFloatingTooltip(
            tip,
            tip.dataset.tip,
            isLight,
            container,
            position,
            size,
          );
        }
      }, TOOLTIP_SHOW_DELAY);
    });
  });
  root.addEventListener("mouseout", (e) => {
    const path = e.composedPath() as Element[];
    if (path.some((el) => el instanceof HTMLElement && el.id === TOOLTIP_ID)) {
      cancelShow();
      scheduleHide();
      return;
    }
    if (path.some(isTip)) {
      cancelShow();
      scheduleHide();
    }
  });
}

let globalTooltipsBound = false;

export function initGlobalTooltips(
  provider: () => boolean | Promise<boolean>,
): void {
  if (globalTooltipsBound) return;
  globalTooltipsBound = true;
  bindTooltips(document, provider);
}
