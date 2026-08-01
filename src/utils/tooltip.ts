let tooltipEl: HTMLElement | null = null;

export function showFloatingTooltip(
  target: HTMLElement,
  text: string,
  isLight: boolean,
  container: HTMLElement,
): void {
  if (!text) return;
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    container.appendChild(tooltipEl);
  }
  tooltipEl.textContent = text;
  tooltipEl.style.cssText = [
    "position: fixed",
    "z-index: 999999",
    "pointer-events: none",
    "padding: 6px 10px",
    "border-radius: 8px",
    "font-size: 12px",
    "font-weight: 500",
    "font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "line-height: 1.3",
    "white-space: nowrap",
    "max-width: 260px",
    "box-shadow: 0 4px 14px rgba(0,0,0,0.25)",
    isLight
      ? "background:#ffffff;color:#1a1d24;border:1px solid rgba(0,0,0,0.12)"
      : "background:#181b23;color:#e8eaf0;border:1px solid rgba(255,255,255,0.1)",
    "visibility: hidden",
  ].join(";");

  const rect = target.getBoundingClientRect();
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  const margin = 8;
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
  let top = rect.top - th - margin;
  if (top < margin) top = rect.bottom + margin;
  tooltipEl.style.left = `${Math.round(left)}px`;
  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.visibility = "visible";
}

export function hideFloatingTooltip(): void {
  if (!tooltipEl) return;
  tooltipEl.remove();
  tooltipEl = null;
}
