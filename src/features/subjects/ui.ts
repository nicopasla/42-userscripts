import { html, render } from "lit-html";
import { sharedCSS } from "../../assets/shared-styles.ts";

const BADGE_ID = "ft-subject-update-host";

export function renderSubjectBadge(
  button: HTMLElement,
  label: string,
  when: string,
  tone: "warning" | "ghost" | "error" = "warning",
): void {
  const existing = document.getElementById(BADGE_ID);
  if (existing) existing.remove();

  const host = document.createElement("div");
  host.id = BADGE_ID;
  host.style.cssText = "width:100%; min-width:100%; box-sizing:border-box;";

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = sharedCSS;

  const wrap = document.createElement("div");
  wrap.setAttribute(
    "data-theme",
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  wrap.style.cssText =
    "margin-top: 0.75rem; width: 100%; box-sizing: border-box;";

  const isDark = document.documentElement.classList.contains("dark");
  const useError = tone === "error";
  const useWarning = tone === "warning";
  let badgeBg: string;
  let badgeFg: string;
  if (useError) {
    badgeBg = "var(--color-error, #ef4444)";
    badgeFg = "var(--color-error-content, #fff)";
  } else if (useWarning) {
    badgeBg = "var(--color-warning, #f59e0b)";
    badgeFg = "var(--color-warning-content, #fff)";
  } else {
    badgeBg = isDark
      ? "var(--color-base-200, #27272a)"
      : "var(--color-base-200, #e5e7eb)";
    badgeFg = "var(--color-base-content, #1f2937)";
  }
  const borderColor = isDark
    ? "var(--color-base-300, #3f3f46)"
    : "var(--color-base-300, #d1d5db)";

  render(
    html`<div
      class="border-t"
      style="border-color: ${borderColor}; padding-top: 0.75rem;"
    >
      <span
        style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; width: 100%; padding: 1rem 1.8rem; border-radius: 0.5rem; border: 1px solid ${borderColor}; background: ${badgeBg}; color: ${badgeFg}; white-space: normal;"
      >
        <span
          style="font-size: 1.15rem; font-weight: 700; line-height: 1; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.9;"
          >${label}</span
        >
        <span
          style="font-size: 1.6rem; font-weight: 800; line-height: 1; white-space: nowrap;"
          >${when}</span
        >
      </span>
    </div>`,
    wrap,
  );

  shadow.appendChild(style);
  shadow.appendChild(wrap);

  const summary = button.closest(".project-summary");
  if (summary) {
    summary.appendChild(host);
  } else {
    button.insertAdjacentElement("afterend", host);
  }
}
