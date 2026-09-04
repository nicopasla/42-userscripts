import { getConfig } from "../../config.ts";
import RELOAD_SVG from "../../assets/svg/reload.svg?raw";

const CARD_TITLE = "PENDING EVALUATIONS";

function findNativeCard(root: Document = document): HTMLElement | null {
  const grid =
    root.querySelector(".dash-main") ||
    root.querySelector(".bg-white.md\\:h-96")?.parentElement ||
    root.body;
  const cards = grid.querySelectorAll(".bg-white");
  for (const card of cards) {
    if (card.textContent?.toUpperCase().includes(CARD_TITLE)) {
      return card as HTMLElement;
    }
  }
  return null;
}

let sorted = false;
let refreshing = false;

function ensureRefreshStyle() {
  if (document.getElementById("ft-ev-refresh-style")) return;
  const style = document.createElement("style");
  style.id = "ft-ev-refresh-style";
  style.textContent = [
    "@keyframes ft-ev-spin{to{transform:rotate(360deg)}}",
    ".ft-ev-spinning{animation:ft-ev-spin .8s linear infinite}",
    "@keyframes ft-ev-rotator{0%{transform:rotate(0deg)}100%{transform:rotate(270deg)}}",
    ".ft-ev-wheel{animation:ft-ev-rotator 1.4s linear infinite}",
    "@keyframes ft-ev-dash{0%{stroke-dashoffset:125.6}50%{stroke-dashoffset:31.4;transform:rotate(135deg)}100%{stroke-dashoffset:125.6;transform:rotate(450deg)}}",
    ".ft-ev-wheel-path{stroke-dasharray:125.6;stroke-dashoffset:0;transform-origin:center;animation:ft-ev-dash 1.4s ease-in-out infinite}",
  ].join("");
  document.head.appendChild(style);
}

// The overlay wraps the pending-evaluations content only (title + action
// buttons stay untouched above it) — that's the closest positioned ancestor
// of the rows/content, i.e. the parent of the card's header row.
function findContentArea(nativeCard: HTMLElement): HTMLElement | null {
  const hideBtn = findHideBtn(nativeCard);
  const header = hideBtn?.closest(".mb-2") as HTMLElement | null;
  const wrapper = header?.parentElement;
  return (wrapper?.lastElementChild as HTMLElement | null) ?? null;
}

function showRefreshOverlay(nativeCard: HTMLElement) {
  if (nativeCard.querySelector("#ft-ev-refresh-overlay")) return;
  const target = findContentArea(nativeCard) || nativeCard;
  if (getComputedStyle(target).position === "static") {
    target.dataset.ftEvResetPosition = "1";
    target.style.position = "relative";
  }
  const overlay = document.createElement("div");
  overlay.id = "ft-ev-refresh-overlay";
  overlay.className =
    "absolute inset-0 flex items-center justify-center bg-white/70 z-10 pointer-events-none";
  overlay.innerHTML =
    '<svg class="ft-ev-wheel text-legacy-main" viewBox="0 0 50 50" style="width:32px;height:32px">' +
    '<circle class="ft-ev-wheel-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"></circle>' +
    "</svg>";
  target.appendChild(overlay);
}

function hideRefreshOverlay(nativeCard: HTMLElement) {
  const overlay = nativeCard.querySelector("#ft-ev-refresh-overlay");
  const target = overlay?.parentElement as HTMLElement | undefined;
  overlay?.remove();
  if (target?.dataset.ftEvResetPosition) {
    target.style.position = "";
    delete target.dataset.ftEvResetPosition;
  }
}

function injectRefreshButton(nativeCard: HTMLElement) {
  if (nativeCard.querySelector("#ft-ev-refresh-btn")) return;
  const hideBtn = findHideBtn(nativeCard);
  const row = hideBtn?.parentElement;
  if (!row) return;
  ensureRefreshStyle();

  const btn = document.createElement("button");
  btn.id = "ft-ev-refresh-btn";
  btn.type = "button";
  btn.title = "Refresh";
  btn.className =
    "flex items-center justify-center text-legacy-main bg-transparent border border-legacy-main py-1.5 px-1 cursor-pointer shrink-0";
  btn.innerHTML = `<span id="ft-ev-refresh-icon" style="display:flex;width:12px;height:12px">${RELOAD_SVG}</span>`;
  row.insertBefore(btn, row.firstChild);
}

const MIN_REFRESH_MS = 1000;

async function refreshCard(nativeCard: HTMLElement) {
  if (refreshing) return;
  refreshing = true;
  const startedAt = Date.now();
  const icon = nativeCard.querySelector("#ft-ev-refresh-icon");
  icon?.classList.add("ft-ev-spinning");
  showRefreshOverlay(nativeCard);
  try {
    const res = await fetch(location.href, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const freshCard = findNativeCard(doc);
    if (!freshCard) return;

    nativeCard.innerHTML = freshCard.innerHTML;
    sorted = false;
    injectRefreshButton(nativeCard);

    const show = await getConfig("PROFILE_SHOW_EVALUATIONS");
    if (show) {
      sortRows(nativeCard);
    } else {
      const btn = findHideBtn(nativeCard);
      if (btn) btn.textContent = "Hide";
    }
  } catch (err) {
    console.error("[better-intra] evaluations refresh failed", err);
  } finally {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_REFRESH_MS) {
      await new Promise((r) => setTimeout(r, MIN_REFRESH_MS - elapsed));
    }
    refreshing = false;
    if (icon?.isConnected) icon.classList.remove("ft-ev-spinning");
    hideRefreshOverlay(nativeCard);
  }
}

function sortRows(nativeCard: HTMLElement) {
  const oldWraps = nativeCard.querySelectorAll(
    ".ft-ev-top, .ft-ev-bot, .ft-ev-fdb",
  );
  for (const wrap of oldWraps) {
    const p = wrap.parentElement!;
    while (wrap.firstChild) {
      p.insertBefore(wrap.firstChild, wrap);
    }
    wrap.remove();
  }
  nativeCard.querySelectorAll(".ft-ev-label").forEach((e) => e.remove());

  const rows = Array.from(
    nativeCard.querySelectorAll<HTMLElement>(
      ".flex.justify-between.w-full.items-center, .flex.flex-row.justify-between",
    ),
  );
  if (rows.length === 0) return;

  const parent = rows[0].parentElement!;
  parent.style.cssText = "display:flex;flex-direction:column;height:100%";

  const feedbackRows: HTMLElement[] = [];
  const evaluatorRows: HTMLElement[] = [];
  const evaluatedRows: HTMLElement[] = [];
  for (const row of rows) {
    row.style.fontSize = "0.9375rem";
    const text = row.textContent || "";
    if (text.includes("days left to feedback")) feedbackRows.push(row);
    else if (
      text.includes("You will evaluate") ||
      text.includes("You are ready to evaluate")
    )
      evaluatorRows.push(row);
    else if (text.includes("You will be evaluated by")) evaluatedRows.push(row);
  }

  if (feedbackRows.length > 0) {
    const fdbWrap = document.createElement("div");
    fdbWrap.className = "ft-ev-fdb";
    fdbWrap.style.cssText =
      "flex:1;display:flex;flex-direction:column;padding:0";
    parent.insertBefore(fdbWrap, parent.firstChild);

    const fdbLabel = document.createElement("div");
    fdbLabel.className = "ft-ev-label";
    fdbLabel.style.cssText =
      "font-weight:600;font-size:1rem;color:hsl(var(--foreground));margin:0 0 4px 4px;flex-shrink:0";
    fdbLabel.textContent = `To Feedback (${feedbackRows.length})`;
    fdbWrap.insertBefore(fdbLabel, fdbWrap.firstChild);

    for (const row of feedbackRows) fdbWrap.appendChild(row);
  }

  const topWrap = document.createElement("div");
  topWrap.className = "ft-ev-top";
  topWrap.style.cssText =
    feedbackRows.length > 0
      ? "flex:1;display:flex;flex-direction:column;border-top:1px solid hsl(var(--border));padding:8px 0;margin-top:-1px"
      : "flex:1;display:flex;flex-direction:column;padding:0";
  parent.appendChild(topWrap);

  const botWrap = document.createElement("div");
  botWrap.className = "ft-ev-bot";
  botWrap.style.cssText =
    "flex:1;display:flex;flex-direction:column;border-top:1px solid hsl(var(--border));padding:8px 0;margin-top:-1px";
  parent.appendChild(botWrap);

  for (const row of evaluatorRows) topWrap.appendChild(row);
  for (const row of evaluatedRows) botWrap.appendChild(row);

  const evLabel = document.createElement("div");
  evLabel.className = "ft-ev-label";
  evLabel.style.cssText =
    "font-weight:600;font-size:1rem;color:hsl(var(--foreground));margin:0 0 4px 4px;flex-shrink:0";
  evLabel.textContent = `Evaluator (${evaluatorRows.length})`;
  topWrap.insertBefore(evLabel, topWrap.firstChild);

  const edLabel = document.createElement("div");
  edLabel.className = "ft-ev-label";
  edLabel.style.cssText =
    "font-weight:600;font-size:1rem;color:hsl(var(--foreground));margin:4px 0 4px 4px;flex-shrink:0";
  edLabel.textContent = `Evaluated (${evaluatedRows.length})`;
  botWrap.insertBefore(edLabel, botWrap.firstChild);

  sorted = true;

  nativeCard.querySelectorAll(".lucide-clock5").forEach((svg) => {
    const btn = svg.closest("button");
    if (btn) btn.style.fontSize = "0.80rem";
  });

  const hideBtn = findHideBtn(nativeCard);
  if (hideBtn) hideBtn.textContent = "Show";
}

function unsortRows(nativeCard: HTMLElement) {
  const fdbWrap = nativeCard.querySelector(".ft-ev-fdb");
  const topWrap = nativeCard.querySelector(".ft-ev-top");
  const botWrap = nativeCard.querySelector(".ft-ev-bot");
  if (!fdbWrap && !topWrap && !botWrap) return;

  const contentParent = (fdbWrap || topWrap || botWrap)!.parentElement!;

  if (fdbWrap) {
    while (fdbWrap.firstChild) {
      contentParent.insertBefore(fdbWrap.firstChild, fdbWrap);
    }
    fdbWrap.remove();
  }
  if (topWrap) {
    while (topWrap.firstChild) {
      contentParent.insertBefore(topWrap.firstChild, topWrap);
    }
    topWrap.remove();
  }
  if (botWrap) {
    while (botWrap.firstChild) {
      contentParent.appendChild(botWrap.firstChild);
    }
    botWrap.remove();
  }

  contentParent.querySelectorAll(".ft-ev-label").forEach((l) => l.remove());

  const rows = contentParent.querySelectorAll<HTMLElement>(
    ".flex.justify-between.w-full.items-center, .flex.flex-row.justify-between",
  );
  for (const row of rows) {
    row.style.fontSize = "";
  }

  contentParent.style.cssText = "";

  sorted = false;

  const hideBtn = findHideBtn(nativeCard);
  if (hideBtn) hideBtn.textContent = "Hide";
}

function findHideBtn(nativeCard: HTMLElement): HTMLElement | null {
  const btns = nativeCard.querySelectorAll<HTMLElement>("[class*='uppercase']");
  for (const btn of btns) {
    const t = btn.textContent?.trim().toLowerCase() || "";
    if (t === "hide" || t === "show") return btn;
  }
  return null;
}

function toggleSort(nativeCard: HTMLElement) {
  if (sorted) {
    unsortRows(nativeCard);
    chrome.storage.local.set({ PROFILE_SHOW_EVALUATIONS: false });
  } else {
    sortRows(nativeCard);
    chrome.storage.local.set({ PROFILE_SHOW_EVALUATIONS: true });
  }
}

function hookToggleButton(nativeCard: HTMLElement) {
  nativeCard.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("#ft-ev-refresh-btn")) {
      e.preventDefault();
      e.stopPropagation();
      refreshCard(nativeCard);
      return;
    }
    const t = target.textContent?.trim().toLowerCase() || "";
    if (t === "hide" || t === "show") {
      e.preventDefault();
      e.stopPropagation();
      toggleSort(nativeCard);
    }
  });
}

let evInitialized = false;

export async function initEvaluations() {
  if (evInitialized) return;
  evInitialized = true;

  if (
    location.hostname !== "profile-v3.intra.42.fr" ||
    !(location.pathname === "/" || location.pathname.startsWith("/users"))
  )
    return;

  const show = await getConfig("PROFILE_SHOW_EVALUATIONS");
  let hooked = false;

  const check = () => {
    const native = findNativeCard();
    if (!native) {
      requestAnimationFrame(check);
      return;
    }
    // The refresh button lives in the card header and doesn't depend on
    // pending-evaluation rows being present, so wire it up as soon as the
    // card itself is found instead of waiting on the rows below.
    if (!hooked) {
      injectRefreshButton(native);
      hookToggleButton(native);
      hooked = true;
    }
    const rows = native.querySelectorAll(
      ".flex.justify-between.w-full.items-center, .flex.flex-row.justify-between",
    );
    if (rows.length === 0) {
      requestAnimationFrame(check);
      return;
    }
    if (show) {
      sortRows(native);
    } else {
      const btn = findHideBtn(native);
      if (btn) btn.textContent = "Hide";
    }
  };

  requestAnimationFrame(check);
}
