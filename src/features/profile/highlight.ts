import { CLUSTERS, getClusterData } from "../clusters/clusters.data.ts";
import { openClusterDialog } from "../clusters/map-dialog.ts";
import { getConfig } from "../../config.ts";

/** The unique ID for the injected stylesheet. */
const GLOW_STYLE_ID = "ft-glow-styles";
/** The CSS class applied to a highlighted seat. */
const GLOWING_CLASS = "ft-glowing-seat";
/** A data attribute to mark an element as highlighted. */
const HIGHLIGHT_ATTR = "data-highlighted";
/** The URL query parameter used to specify a seat to highlight. */
const SEAT_PARAM = "seat";
/** The path for the cluster map pages. */
const CLUSTERS_PATH = "/clusters";
/** The scale factor to apply to a highlighted seat. */
const HIGHLIGHT_SCALE = 1.4;

/**
 * Injects the CSS styles for the seat highlight animation into the document head.
 * The styles are only injected once.
 */
function injectHighlightStyles() {
  if (document.getElementById(GLOW_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = GLOW_STYLE_ID;
  style.textContent = `
    @keyframes ft-pulsate {
      0%, 100% {
        filter: drop-shadow(0 0 2px #ff0055) drop-shadow(0 0 5px #ff0055);
      }
      50% {
        filter: drop-shadow(0 0 8px #ff0055) drop-shadow(0 0 15px #ff0055);
      }
    }
    .${GLOWING_CLASS} {
      animation: ft-pulsate 2s infinite ease-in-out !important;
    }
  `;
  const target = document.head || document.documentElement;
  target.appendChild(style);
}

/**
 * Finds and removes all active highlight effects from any seat on the page.
 */
function clearExistingHighlight() {
  document.querySelectorAll(`[${HIGHLIGHT_ATTR}='true']`).forEach((el) => {
    el.removeAttribute(HIGHLIGHT_ATTR);
    el.removeAttribute("transform");
    el.classList.remove(GLOWING_CLASS);
  });
}

/**
 * Retrieves the SVG elements corresponding to a given seat identifier.
 * It checks for both standard and alternative (`shi-`) prefixes.
 * @param seatId The seat identifier (e.g., "e1r1p1").
 * @returns A NodeListOf<SVGGraphicsElement> containing the found elements.
 */
function getSeatElements(seatId: string): NodeListOf<SVGGraphicsElement> {
  let elements = document.querySelectorAll<SVGGraphicsElement>(
    `[id="${seatId}"]`,
  );
  if (elements.length === 0) {
    elements = document.querySelectorAll<SVGGraphicsElement>(
      `[id="shi-${seatId}"]`,
    );
  }
  return elements;
}

/**
 * Reads the 'seat' URL parameter and applies the highlight effect to the corresponding seat.
 * If no parameter is found, it clears any existing highlight.
 */
export function highlightSeatFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetSeat = urlParams.get(SEAT_PARAM)?.toLowerCase();

  if (!targetSeat) {
    clearExistingHighlight();
    return;
  }

  const elements = getSeatElements(targetSeat);
  if (elements.length === 0) return;

  const firstEl = elements[0];
  if (firstEl.classList.contains(GLOWING_CLASS)) return;

  clearExistingHighlight();

  const x = parseFloat(firstEl.getAttribute("x") || "0");
  const y = parseFloat(firstEl.getAttribute("y") || "0");
  const w = parseFloat(firstEl.getAttribute("width") || "30");
  const h = parseFloat(firstEl.getAttribute("height") || "30");

  const transX = (x + w / 2) * (1 - HIGHLIGHT_SCALE);
  const transY = (y + h / 2) * (1 - HIGHLIGHT_SCALE);
  const transformString = `translate(${transX}, ${transY}) scale(${HIGHLIGHT_SCALE})`;

  elements.forEach((el) => {
    el.setAttribute(HIGHLIGHT_ATTR, "true");
    el.setAttribute("transform", transformString);
    el.classList.add(GLOWING_CLASS);
    el.parentNode?.appendChild(el); // Bring to front
  });

  setTimeout(() => {
    firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 200);
}

/**
 * Removes the 'seat' parameter from the URL in the browser's history.
 */
function cleanUrlParam() {
  const url = new URL(window.location.href);
  if (url.searchParams.has(SEAT_PARAM)) {
    url.searchParams.delete(SEAT_PARAM);
    window.history.replaceState({}, document.title, url.toString());
  }
}

/**
 * Checks if the current page is a cluster map and triggers the highlight logic.
 * It also polls for a short duration to handle dynamically loaded map elements.
 */
function checkRouteAndHighlight() {
  if (!window.location.pathname.includes(CLUSTERS_PATH)) {
    clearExistingHighlight();
    return;
  }

  highlightSeatFromURL();

  // Poll for dynamically loaded seats
  let attempts = 0;
  const interval = setInterval(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetSeat = urlParams.get(SEAT_PARAM)?.toLowerCase();

    if (!targetSeat || attempts++ > 30) {
      clearInterval(interval);
      return;
    }

    if (getSeatElements(targetSeat).length > 0) {
      highlightSeatFromURL();
      clearInterval(interval);
    }
  }, 500);
}

/** A WeakSet to keep track of labels that have already been processed. */
const processedLabels = new WeakSet<HTMLElement>();

const isSeatLike = (t: string) =>
  !!t &&
  t !== "unavailable" &&
  (CLUSTERS.some((c) => c.name && t.startsWith(c.name.toLowerCase())) ||
    /^[a-z0-9]+-\w+/.test(t));

/**
 * Intercepts clicks on the profile seat badge (and any link to the native
 * clusters page carrying a `?seat=` param) and opens the cluster map dialog
 * instead, preventing the default new-tab navigation.
 */
let seatClickGuardInstalled = false;
function installSeatClickGuard() {
  if (seatClickGuardInstalled) return;
  seatClickGuardInstalled = true;

  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const path = e.composedPath();
      for (const node of path) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.classList.contains("value")) {
          const t = node.textContent?.trim().toLowerCase() || "";
          if (isSeatLike(t)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openClusterDialog({ seatId: t });
            return;
          }
        }

        if (node.tagName === "A") {
          const href = (node as HTMLAnchorElement).href || "";
          if (href.includes("/clusters") && href.includes("seat=")) {
            try {
              const seat = new URLSearchParams(new URL(href).search).get("seat");
              if (seat) {
                e.preventDefault();
                e.stopImmediatePropagation();
                openClusterDialog({ seatId: seat.toLowerCase() });
                return;
              }
            } catch {}
          }
        }
      }
    },
    true,
  );
}

/**
 * Enhances the user profile page by making the seat location label a clickable
 * link that opens the cluster map dialog on the matching cluster.
 */
export async function handleProfileRedirect() {
  const label =
    Array.from(document.querySelectorAll<HTMLElement>(".value")).find((el) =>
      isSeatLike(el.textContent?.trim().toLowerCase() || ""),
    ) ||
    document.querySelector<HTMLElement>(
      ".absolute.px-2.py-1.border.rounded-full.border-neutral-600.bg-ft-gray.top-2.right-4",
    );

  if (!label || processedLabels.has(label)) return;

  const seatText = label.textContent?.trim().toLowerCase();
  if (!seatText || seatText === "unavailable") return;

  processedLabels.add(label);

  const onLabelClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openClusterDialog({ seatId: seatText });
  };

  label.style.cursor = "pointer";
  label.addEventListener("mouseenter", () => {
    label.style.textDecoration = "underline";
  });
  label.addEventListener("mouseleave", () => {
    label.style.textDecoration = "";
  });
  label.addEventListener("click", onLabelClick);
}

/**
 * Initializes all features related to seat highlighting and profile redirection.
 * Sets up event listeners to handle navigation and dynamic content.
 */
async function init() {
  if (CLUSTERS.length === 0) {
    try {
      const campus = await getConfig("CLUSTERS_CAMPUS");
      await getClusterData(campus);
    } catch {}
  }

  injectHighlightStyles();
  installSeatClickGuard();

  if (
    window.location.pathname.includes(CLUSTERS_PATH) &&
    window.location.search.includes(`${SEAT_PARAM}=`)
  ) {
    setTimeout(cleanUrlParam, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkRouteAndHighlight);
  } else {
    checkRouteAndHighlight();
  }

  window.addEventListener("popstate", checkRouteAndHighlight);
  window.addEventListener("hashchange", checkRouteAndHighlight);
  document.addEventListener(
    "click",
    () => setTimeout(checkRouteAndHighlight, 100),
    true,
  );
}

void init();
