import { html, render, TemplateResult } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { getConfig } from "../../config.ts";
import {
  getClusterData,
  fetchCampusList,
  clearClusterData,
} from "./clusters.data.ts";
import {
  getEffectiveTheme,
  getIsLight,
} from "../profile/theme/theme-manager.ts";
import { getCampusFlag } from "../profile/campus-flags.ts";
import { bindTooltips } from "../../utils/tooltip.ts";
import RELOAD_SVG from "../../assets/svg/reload.svg?raw";
import CLOCK_SVG from "../../assets/svg/clock.svg?raw";
import RESET_SVG from "../../assets/svg/reset.svg?raw";
import { SeatPos } from "./map-dialog/crop.ts";
import {
  sanitizeAndParseSeats,
  applyMarkers,
  getSvgTitle,
} from "./map-dialog/seats.ts";
import {
  getCachedCluster,
  setCachedCluster,
  scrapeCampusSVGUrls,
  getSvgSlug,
} from "./map-dialog/cache.ts";
import {
  renderSeatOverlays,
  renderWifiList,
  renderActiveList,
  OccupancyEntry,
} from "./map-dialog/render.ts";

interface ClusterInfo {
  id: string;
  name: string;
  svg?: string;
}

export interface PseudoClusterChange {
  clusters: ClusterInfo[];
  added: boolean;
  removed: boolean;
}

export function applyPseudoCluster(
  clusters: ClusterInfo[],
  id: string,
  name: string,
  present: boolean,
): PseudoClusterChange {
  const hasCluster = clusters.some((c) => c.id === id);
  if (present && !hasCluster) {
    return {
      clusters: [...clusters, { id, name }],
      added: true,
      removed: false,
    };
  }
  if (!present && hasCluster) {
    return {
      clusters: clusters.filter((c) => c.id !== id),
      added: false,
      removed: true,
    };
  }
  return { clusters, added: false, removed: false };
}

export const applyWifiPresence = (clusters: ClusterInfo[], hasWifi: boolean) =>
  applyPseudoCluster(clusters, "wifi", "Wi-Fi", hasWifi);

export const applyActivePresence = (
  clusters: ClusterInfo[],
  hasActive: boolean,
) => applyPseudoCluster(clusters, "active", "Active", hasActive);

const WORKER_URL = "https://api.betterintra.com";
const CLUSTERS_JSON_URL = "https://meta.intra.42.fr/clusters.json";
const POLL_INTERVAL = 60_000;

export function formatCampusClock(timezone?: string): string {
  if (!timezone) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "";
  }
}

export function findClusterForSeat(
  clusters: { id: string; name: string }[],
  seatId: string,
): { id: string; name: string } | undefined {
  const seat = seatId.toLowerCase();
  return clusters.find(
    (c) => c.name.trim() && seat.startsWith(c.name.trim().toLowerCase()),
  );
}

export async function openClusterDialog(opts?: { seatId?: string }) {
  if (document.getElementById("cluster-map-dialog")) return;

  const detectedCampus = (await getConfig("CLUSTERS_CAMPUS")) || "";

  const [presetKeyRaw, defaultId, showMarkersVal] = await Promise.all([
    getConfig("PROFILE_THEME_PRESET"),
    getConfig("CLUSTERS_DEFAULT_ID"),
    getConfig("CLUSTERS_SHOW_MARKERS"),
  ]);
  const presetKey = (presetKeyRaw as string) || "dark";

  let campusOptions: { id: string; name: string; timezone?: string }[] = [];
  try {
    const manifest = await fetchCampusList();
    for (const c of manifest.campuses) {
      campusOptions.push({ id: c.id, name: c.name, timezone: c.timezone });
    }
    campusOptions.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  } catch {}
  let activeCampusId = detectedCampus;
  if (activeCampusId && !campusOptions.some((c) => c.id === activeCampusId)) {
    activeCampusId = "";
  }
  if (!activeCampusId && campusOptions.length > 0) {
    activeCampusId = campusOptions[0].id;
  }

  const buildClusters = async (campusId: string): Promise<ClusterInfo[]> => {
    let repoClusters: { id: string; name: string }[] = [];
    try {
      const data = await getClusterData(campusId);
      repoClusters = data.clusters;
    } catch {
      clearClusterData();
    }
    const svgs = await scrapeCampusSVGUrls(campusId);
    const list: ClusterInfo[] = [];
    for (const c of repoClusters) {
      const svg = svgs[c.id];
      if (svg) list.push({ id: c.id, name: c.name || "", svg });
    }
    for (const [id, svg] of Object.entries(svgs)) {
      if (!list.some((c) => c.id === id)) list.push({ id, name: "", svg });
    }
    return list;
  };

  let clusters = await buildClusters(activeCampusId);

  const keyOf = (campusId: string, clusterId: string) =>
    `${campusId}:${clusterId}`;
  const clusterLabel = (c: ClusterInfo) =>
    (
      c.name.trim() ||
      (c.svg ? getSvgSlug(c.svg) : "") ||
      `Cluster ${c.id}`
    ).toUpperCase();

  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : await getEffectiveTheme();
  const targetSeat = opts?.seatId?.toLowerCase();
  const targetCluster = targetSeat
    ? findClusterForSeat(clusters, targetSeat)
    : undefined;
  let activeCluster = targetCluster ||
    clusters.find((c) => c.id === defaultId) ||
    clusters[0] || { id: "wifi", name: "Wi-Fi" };
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let clockTimer: ReturnType<typeof setInterval> | null = null;
  const seatPosCache = new Map<string, Map<string, SeatPos>>();
  const svgViewBoxes = new Map<string, { w: number; h: number }>();
  const parsedDocs = new Map<string, Document>();
  let loadId = 0;
  let lastUpdated = 0;
  let showMarkers = showMarkersVal;
  let wifiUsers: OccupancyEntry[] = [];
  let activeUsers: OccupancyEntry[] = [];
  let zoomLevel = 1.0;
  let defaultZoomLevel = 1.0;
  const SEAT_TARGET_PX = 60;
  const clusterCounts = new Map<string, { taken: number; total: number }>();

  const trimSvgToContent = () => {
    const mapArea = shadow.getElementById("map-area");
    const svg = mapArea?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    try {
      const bbox = svg.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 10;
        const minX = bbox.x - pad;
        const minY = bbox.y - pad;
        const maxX = bbox.x + bbox.width + pad;
        const maxY = bbox.y + bbox.height + pad;
        svg.setAttribute(
          "viewBox",
          `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
        );
      }
    } catch {}
  };

  const updateZoom = () => {
    const mapArea = shadow.getElementById("map-area");
    const svg = mapArea?.querySelector("svg") as SVGSVGElement | null;
    if (mapArea && svg) {
      svg.style.width = `${Math.max(
        1,
        Math.round(mapArea.clientWidth * zoomLevel),
      )}px`;
      svg.style.height = "auto";
    }
    const pct = shadow.querySelector(".zoom-pct") as HTMLElement | null;
    if (pct) pct.textContent = `${Math.round(zoomLevel * 100)}%`;
    requestAnimationFrame(() => reapplyOccupancy());
  };

  const ensureClusterData = async (
    c: ClusterInfo,
    campusId: string,
    signal?: AbortSignal,
  ): Promise<string | null> => {
    if (!c.svg) {
      return null;
    }
    const key = keyOf(campusId, c.id);
    try {
      if (seatPosCache.has(key) && svgViewBoxes.has(key)) {
        return "cached";
      }
      let cached = await getCachedCluster(campusId, c.id);
      let svgText = cached?.svg;
      if (!svgText) {
        const url = `${WORKER_URL}/api/v1/cluster/svg?url=${encodeURIComponent(c.svg)}`;
        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        svgText = await res.text();
      }
      if (!svgViewBoxes.has(key)) {
        const svgDoc = new DOMParser().parseFromString(
          svgText,
          "image/svg+xml",
        );
        const seatMap = sanitizeAndParseSeats(svgDoc);
        parsedDocs.set(key, svgDoc);
        const title = getSvgTitle(svgDoc);
        if (title && !c.name.trim()) c.name = title;
        const vb = (svgDoc.querySelector("svg")?.getAttribute("viewBox") ?? "")
          .split(/\s+/)
          .map(Number);
        svgViewBoxes.set(key, { w: vb[2] || 1200, h: vb[3] || 800 });
        seatPosCache.set(key, seatMap);
        setCachedCluster(campusId, c.id, {
          svg: svgText,
          seats: [...seatMap],
          viewBox: svgViewBoxes.get(key)!,
          cachedAt: 0,
        }).catch(() => {});
      }
      return svgText;
    } catch {
      return null;
    }
  };

  const dialog = Object.assign(document.createElement("dialog"), {
    id: "cluster-map-dialog",
    className: "bg-transparent backdrop:bg-black/60",
  });
  Object.assign(dialog.style, {
    margin: "1.5rem auto auto auto",
    width: "min(1200px, calc(100dvw - 2rem))",
    height: "min(94dvh, 1400px)",
    borderRadius: "1rem",
    padding: "0",
    border: "none",
    background: "transparent",
  });

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;height:100%;overflow:hidden;";
  dialog.appendChild(wrapper);

  const shadow = wrapper.attachShadow({ mode: "closed" });

  bindTooltips(shadow, getIsLight);

  const abortController = new AbortController();

  const cleanup = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    if (clockTimer) clearInterval(clockTimer);
    abortController.abort();
  };

  dialog.addEventListener("close", () => {
    cleanup();
    if (resizeObserver) resizeObserver.disconnect();
    dialog.remove();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  function renderTemplate(cluster: ClusterInfo): TemplateResult {
    return html`
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }
        ${sharedCSS} #map-area {
          position: relative;
          background: var(--color-base-300);
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        #map-area::-webkit-scrollbar {
          width: 6px;
        }
        #map-area::-webkit-scrollbar-thumb {
          background: var(--color-base-content, #888);
          border-radius: 3px;
        }
        #map-area svg {
          width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .seat-link {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          overflow: hidden;
          background: #222;
        }
        .seat-link:hover {
          overflow: visible !important;
        }
        .seat-link img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .posts rect:not(.custom-screen),
        .posts polygon:not(.custom-screen),
        rect:not(.custom-screen) {
          fill: var(--color-base-200) !important;
        }
        #map-area svg text,
        #map-area svg tspan {
          fill: var(--color-base-content) !important;
        }
        .spinning {
          animation: btn-spin 0.8s linear infinite;
        }
        @keyframes btn-spin {
          to {
            transform: rotate(360deg);
          }
        }
        .campus-option {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          text-align: left;
          font-size: 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
          white-space: nowrap;
        }
        .campus-option:hover {
          background: color-mix(
            in oklch,
            var(--color-base-200) 80%,
            transparent
          );
        }
        .campus-option.active {
          color: var(--color-accent);
        }
        .campus-option-flag {
          font-size: 16px;
          line-height: 1;
        }
        .campus-option-name {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        #campus-time svg {
          width: 12px;
          height: 12px;
          display: block;
          flex-shrink: 0;
          fill: currentColor;
        }
        @keyframes ft-dialog-pulsate {
          0%,
          100% {
            box-shadow:
              0 0 0 2px #ff0055,
              0 0 5px 2px #ff0055,
              0 0 10px 4px #ff0055;
          }
          50% {
            box-shadow:
              0 0 0 3px #ff0055,
              0 0 8px 3px #ff0055,
              0 0 15px 6px #ff0055;
          }
        }
        .ft-dialog-seat-glow {
          animation: ft-dialog-pulsate 1.6s ease-in-out infinite !important;
        }
        .seat-link.ft-dialog-seat-glow {
          overflow: visible !important;
          z-index: 10;
        }
        .tabs-scroll {
          flex: 1 1 auto;
          min-width: 0;
          overflow-x: auto;
          flex-wrap: nowrap;
          scrollbar-width: none;
        }
        .tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .tabs-scroll .tab {
          white-space: nowrap;
          flex-shrink: 0;
        }
      </style>
      <div
        data-theme="${currentTheme}"
        class="bg-base-100 h-full"
        style="display:flex;flex-direction:column;height:100%;overflow:hidden;"
      >
        <div
          class="flex items-center justify-between shrink-0 p-3 pb-0 sticky top-0 z-30 bg-base-100 rounded-t-xl"
        >
          <div
            class="flex items-center gap-2"
            style="flex:1 1 auto;min-width:0;"
          >
            <div style="position:relative;">
              <button
                type="button"
                id="campus-trigger"
                class="btn btn-sm btn-ghost gap-1.5 px-2"
                data-tip="Campus"
                data-tip-size="14px"
              >
                <span class="text-base leading-none" id="campus-trigger-flag"
                  >${getCampusFlag(
                    campusOptions.find((o) => o.id === activeCampusId)?.name ||
                      activeCampusId,
                  )}</span
                >
                <span
                  class="text-xs font-semibold uppercase tracking-wide"
                  id="campus-trigger-name"
                  >${(
                    campusOptions.find((o) => o.id === activeCampusId)?.name ||
                    activeCampusId
                  ).toUpperCase()}</span
                >
              </button>
              <div
                id="campus-menu"
                style="display:none;position:absolute;left:0;top:calc(100% + 4px);z-index:50;width:13rem;max-height:min(18rem,60vh);overflow:auto;border-radius:8px;background:var(--color-base-100);border:1px solid var(--color-base-300);box-shadow:0 6px 16px rgba(0,0,0,.28);padding:4px;"
              >
                ${campusOptions.map(
                  (o) =>
                    html`<button
                      type="button"
                      data-campus-id="${o.id}"
                      class="campus-option ${o.id === activeCampusId
                        ? "active"
                        : ""}"
                    >
                      <span class="campus-option-flag"
                        >${getCampusFlag(o.name)}</span
                      >
                      <span class="campus-option-name"
                        >${o.name.toUpperCase()}</span
                      >
                    </button>`,
                )}
              </div>
            </div>
            <div
              style="position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center;"
            >
              <div
                class="tabs tabs-border border-accent tabs-scroll"
                style="flex:1 1 auto;min-width:0;"
              >
                ${clusters.map(
                  (c) =>
                    html`<button
                      class="tab font-bold text-xs px-4 whitespace-nowrap ${c.id ===
                      cluster.id
                        ? "tab-active"
                        : ""}"
                      data-cluster-id="${c.id}"
                      data-cluster-name="${clusterLabel(c)}"
                    >
                      ${clusterLabel(c)}
                    </button>`,
                )}
              </div>
              <div
                id="tabs-fade"
                style="display:none;position:absolute;top:0;right:0;bottom:0;width:2rem;pointer-events:none;background:linear-gradient(to left, var(--color-base-100), transparent);"
              ></div>
            </div>
            <details
              class="dropdown dropdown-end"
              id="more-tabs-dropdown"
              style="display:none;flex-shrink:0;"
            >
              <summary
                class="btn btn-sm btn-ghost"
                id="more-tabs-btn"
                data-tip="More clusters"
                data-tip-size="14px"
              >
                ⋯
              </summary>
              <ul
                id="more-tabs-menu"
                class="menu dropdown-content bg-base-100 rounded-box z-50 max-h-72 w-96 overflow-y-auto p-2 shadow"
                style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px;"
              >
                ${clusters.map(
                  (c) =>
                    html`<li>
                      <a
                        class="flex justify-between gap-2 whitespace-nowrap ${c.id ===
                        cluster.id
                          ? "menu-active"
                          : ""}"
                        data-cluster-id="${c.id}"
                        data-cluster-name="${clusterLabel(c)}"
                      >
                        ${clusterLabel(c)}
                      </a>
                    </li>`,
                )}
              </ul>
            </details>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div
              id="totals-badge"
              class="flex items-center gap-1 whitespace-nowrap text-xs tabular-nums font-medium bg-accent text-accent-content rounded-lg px-2 h-8 border border-accent"
              data-tip="Total taken / Total seats"
              data-tip-size="14px"
            >
              - / -
            </div>
            <select
              class="select select-accent select-sm max-w-32"
              id="default-cluster-select"
              data-tip="Default cluster"
              data-tip-size="14px"
            >
              ${clusters.map(
                (c) =>
                  html`<option
                    value="${c.id}"
                    ?selected="${c.id === defaultId}"
                  >
                    ${c.name.toUpperCase()}
                  </option>`,
              )}
            </select>
            <button
              class="btn btn-sm ${showMarkers ? "btn-accent" : "btn-ghost"}"
              style="${showMarkers ? "border-color: var(--color-accent)" : ""}"
              id="markers-btn"
              data-tip="Toggle screen markers"
              data-tip-size="14px"
            >
              Show Markers
            </button>
            <button
              id="updated-badge"
              class="btn btn-accent btn-sm border border-base-content/20"
              style="display:none;width:80px;justify-content:flex-start"
              data-tip="Reload occupancy"
              data-tip-size="14px"
            >
              <span
                id="reload-icon"
                class="size-4 flex items-center justify-center"
                >${unsafeHTML(RELOAD_SVG)}</span
              >
              <span id="badge-text" style="flex:1;text-align:center"></span>
            </button>
            <button
              class="btn btn-circle btn-ghost btn-sm text-xl"
              id="close-btn"
            >
              ✕
            </button>
          </div>
        </div>
        <div class="relative flex-1 min-h-0 mx-3 mb-3 mt-2">
          <div id="map-area" class="rounded-lg h-full"></div>
          <div
            id="top-left-badges"
            class="absolute top-2 left-2 z-20 flex items-center gap-2"
          >
            <div
              id="seat-count-badge"
              class="text-xs tabular-nums font-medium bg-accent text-accent-content rounded-lg px-2 py-1 border border-accent"
            >
              - / -
            </div>
            <div
              id="campus-time"
              class="flex items-center gap-1 whitespace-nowrap text-xs tabular-nums font-medium bg-accent text-accent-content rounded-lg px-2 py-1 border border-accent"
              style="display:none"
            >
              <span
                id="campus-time-icon"
                class="size-3 flex items-center justify-center"
                >${unsafeHTML(CLOCK_SVG)}</span
              >
              <span id="campus-time-text"></span>
            </div>
          </div>
          <div
            id="zoom-controls"
            class="absolute top-2 right-6 z-20 flex items-center gap-1 bg-accent text-accent-content rounded-lg px-1 py-0.5 border border-accent"
          >
            <button
              class="btn btn-ghost btn-xs text-xs text-accent-content"
              id="zoom-reset"
              data-tip="Reset zoom"
              data-tip-size="14px"
            >
              <span class="size-3 flex items-center justify-center"
                >${unsafeHTML(RESET_SVG)}</span
              >
            </button>
            <button
              class="btn btn-ghost btn-xs text-xs text-accent-content"
              id="zoom-out"
              data-tip="Zoom out"
              data-tip-size="14px"
            >
              −
            </button>
            <span class="zoom-pct text-xs tabular-nums w-10 text-center"
              >100%</span
            >
            <button
              class="btn btn-ghost btn-xs text-xs text-accent-content"
              id="zoom-in"
              data-tip="Zoom in"
              data-tip-size="14px"
            >
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const wiredTabs = new WeakSet<Element>();

  const wireTabs = () => {
    const el = shadow.querySelector<HTMLElement>(".tabs-scroll");
    if (!el || wiredTabs.has(el)) return;
    wiredTabs.add(el);
    el.addEventListener("scroll", () => {
      const fade = shadow.getElementById("tabs-fade");
      if (!fade) return;
      const hasMore = el.scrollWidth - el.clientWidth - el.scrollLeft > 8;
      fade.style.display = hasMore ? "" : "none";
    });
  };

  const updateTabsOverflow = () => {
    requestAnimationFrame(() => {
      const el = shadow.querySelector<HTMLElement>(".tabs-scroll");
      const fade = shadow.getElementById("tabs-fade");
      const more = shadow.getElementById(
        "more-tabs-dropdown",
      ) as HTMLElement | null;
      if (!el) return;
      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      const hasMore = el.scrollWidth - el.clientWidth - el.scrollLeft > 8;
      if (fade) fade.style.display = hasMore ? "" : "none";
      if (more) more.style.display = hasOverflow ? "" : "none";
    });
  };

  const rerender = () => {
    render(renderTemplate(activeCluster), shadow);
    wireTabs();
    updateTabsOverflow();
  };
  shadow.addEventListener("click", (e) => {
    const path = e.composedPath();
    const campusMenu = shadow.getElementById(
      "campus-menu",
    ) as HTMLElement | null;
    const campusTrigger = shadow.getElementById(
      "campus-trigger",
    ) as HTMLElement | null;

    const campusOption = path.find(
      (el) => el instanceof HTMLElement && el.hasAttribute("data-campus-id"),
    ) as HTMLElement | undefined;
    if (campusOption && campusOption.dataset.campusId) {
      if (campusMenu) campusMenu.style.display = "none";
      loadCampus(campusOption.dataset.campusId);
      return;
    }
    if (campusTrigger && path.includes(campusTrigger)) {
      if (campusMenu) {
        campusMenu.style.display =
          campusMenu.style.display === "none" ? "block" : "none";
      }
      return;
    }
    if (
      campusMenu &&
      campusMenu.style.display !== "none" &&
      !path.includes(campusMenu)
    ) {
      campusMenu.style.display = "none";
    }
    const btn = path.find(
      (el) => el instanceof HTMLElement && el.hasAttribute("data-cluster-id"),
    ) as HTMLElement | undefined;
    if (btn) {
      const id = btn.dataset.clusterId;
      const cluster = clusters.find((c) => c.id === id);
      if (cluster) loadCluster(cluster);
      const moreDetails = shadow.getElementById(
        "more-tabs-dropdown",
      ) as HTMLDetailsElement | null;
      if (moreDetails) moreDetails.removeAttribute("open");
      return;
    }
    const reloadBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "updated-badge",
    );
    if (reloadBtn) {
      loadOccupancy();
      return;
    }
    const markersBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "markers-btn",
    );
    if (markersBtn) {
      showMarkers = !showMarkers;
      chrome.storage.local.set({ CLUSTERS_SHOW_MARKERS: showMarkers });
      const mBtn = shadow.getElementById("markers-btn");
      if (mBtn) {
        mBtn.classList.toggle("btn-accent", showMarkers);
        mBtn.classList.toggle("btn-ghost", !showMarkers);
        mBtn.style.borderColor = showMarkers ? "var(--color-accent)" : "";
      }
      const mapEl = shadow.getElementById("map-area");
      if (mapEl) {
        mapEl.querySelectorAll<SVGElement>(".custom-screen").forEach((el) => {
          el.style.display = showMarkers ? "" : "none";
        });
      }
      return;
    }
    const zoomIn = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-in",
    );
    if (zoomIn) {
      zoomLevel = Math.min(3.0, zoomLevel + 0.1);
      updateZoom();
      return;
    }
    const zoomOut = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-out",
    );
    if (zoomOut) {
      zoomLevel = Math.max(0.3, zoomLevel - 0.1);
      updateZoom();
      return;
    }
    const zoomReset = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-reset",
    );
    if (zoomReset) {
      zoomLevel = defaultZoomLevel;
      updateZoom();
      return;
    }
    const closeBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "close-btn",
    );
    if (closeBtn) dialog.close();
  });

  shadow.addEventListener("change", (e) => {
    const select = (e.target as HTMLElement).closest(
      "#default-cluster-select",
    ) as HTMLSelectElement | null;
    if (select) {
      chrome.storage.local.set({ CLUSTERS_DEFAULT_ID: select.value });
    }
  });

  let occupancyCache: Map<string, OccupancyEntry> | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let flashingSeat: string | null = null;

  const applyOccupancy = (occupancy: Map<string, OccupancyEntry>) => {
    wifiUsers = [];
    const workCopy = new Map(occupancy);
    for (const [host, entry] of workCopy) {
      if (host.startsWith("wifi-")) {
        wifiUsers.push(entry);
        workCopy.delete(host);
      }
    }
    activeUsers = [...workCopy.values()].sort((a, b) =>
      a.login.localeCompare(b.login),
    );
    const wifiVisible = wifiUsers.length > 0;
    const activeVisible = workCopy.size > 0;
    let clustersChanged = false;
    const wifiChange = applyWifiPresence(clusters, wifiVisible);
    if (wifiChange.added || wifiChange.removed) {
      clusters = wifiChange.clusters;
      clustersChanged = true;
    }
    const activeChange = applyActivePresence(clusters, activeVisible);
    if (activeChange.added || activeChange.removed) {
      clusters = activeChange.clusters;
      clustersChanged = true;
    }
    if (clustersChanged) {
      rebuildHeader();
      if (
        (wifiChange.removed && activeCluster.id === "wifi") ||
        (activeChange.removed && activeCluster.id === "active")
      ) {
        activeCluster = clusters[0];
        if (activeCluster) loadCluster(activeCluster);
      }
    }
    const positions = seatPosCache.get(keyOf(activeCampusId, activeCluster.id));
    const viewBox = svgViewBoxes.get(keyOf(activeCampusId, activeCluster.id));
    if (positions && viewBox) {
      renderSeatOverlays(shadow, workCopy, positions, viewBox);
    }
    if (activeCluster.id === "active") {
      renderActiveList(shadow, activeUsers);
    }
    if (flashingSeat) {
      applySeatGlow(flashingSeat);
    }
    const badge = shadow.getElementById("seat-count-badge");
    if (badge) {
      const total = positions?.size ?? 0;
      const taken = positions
        ? [...workCopy.keys()].filter((h) => positions.has(h)).length
        : 0;
      if (total > 0) {
        const free = total - taken;
        badge.textContent = `${taken} / ${total}`;
        badge.title = `${taken} taken, ${free} free · ${total} total`;
      } else {
        badge.textContent = `- / -`;
      }
    }
    clusterCounts.clear();
    const campusPrefix = `${activeCampusId}:`;
    for (const [key, seats] of seatPosCache) {
      if (!key.startsWith(campusPrefix)) continue;
      const clusterId = key.slice(campusPrefix.length);
      const taken = [...workCopy.keys()].filter((h) => seats.has(h)).length;
      clusterCounts.set(clusterId, { taken, total: seats.size });
    }
    for (const tab of shadow.querySelectorAll<HTMLElement>(
      "[data-cluster-id]",
    )) {
      const id = tab.dataset.clusterId;
      if (!id) continue;
      const cluster = clusters.find((c) => c.id === id);
      const name = cluster
        ? clusterLabel(cluster)
        : tab.dataset.clusterName || id.toUpperCase();
      tab.textContent = name;
      if (id === "wifi") {
        if (wifiUsers.length > 0) {
          const num = document.createElement("span");
          num.textContent = `${wifiUsers.length}`;
          num.style.cssText =
            "font-weight:400;opacity:0.55;font-size:11px;margin-left:6px;";
          tab.appendChild(num);
        }
        continue;
      }
      if (id === "active") {
        if (activeUsers.length > 0) {
          const num = document.createElement("span");
          num.textContent = `${activeUsers.length}`;
          num.style.cssText =
            "font-weight:400;opacity:0.55;font-size:11px;margin-left:6px;";
          tab.appendChild(num);
        }
        continue;
      }
      const count = clusterCounts.get(id);
      if (count && count.total > 0) {
        const num = document.createElement("span");
        num.textContent = `${count.taken}/${count.total}`;
        num.style.cssText =
          "font-weight:400;opacity:0.55;font-size:11px;margin-left:6px;";
        tab.appendChild(num);
      }
    }
    const clusterSelect = shadow.getElementById(
      "default-cluster-select",
    ) as HTMLSelectElement | null;
    if (clusterSelect) {
      for (const opt of clusterSelect.querySelectorAll("option")) {
        const cluster = clusters.find((c) => c.id === opt.value);
        if (cluster) opt.textContent = clusterLabel(cluster);
      }
    }
    const allCounts = [...clusterCounts.values()];
    const sumTaken = allCounts.reduce((s, c) => s + c.taken, 0);
    const sumTotal = allCounts.reduce((s, c) => s + c.total, 0);
    const totalsBadge = shadow.getElementById("totals-badge");
    if (totalsBadge) {
      if (activeCluster.id === "active") {
        totalsBadge.textContent = `${activeUsers.length} active`;
        totalsBadge.title = "Users currently connected";
      } else {
        totalsBadge.textContent = `${sumTaken} / ${sumTotal}`;
        totalsBadge.title = "Total taken / Total seats";
      }
    }
    startCountdown();
    updateTabsOverflow();
  };

  const loadOccupancy = async () => {
    const reloadIcon = shadow.getElementById("reload-icon");
    if (reloadIcon) reloadIcon.classList.add("spinning");
    try {
      const occupancy = await fetchOccupancy(
        activeCampusId,
        abortController.signal,
      );
      occupancyCache = occupancy;
      lastUpdated = Date.now();
      applyOccupancy(occupancy);
    } finally {
      if (reloadIcon) reloadIcon.classList.remove("spinning");
    }
  };

  const updateBadge = () => {
    const secs = Math.max(
      0,
      Math.ceil((POLL_INTERVAL - (Date.now() - lastUpdated)) / 1000),
    );
    const badgeText = shadow.getElementById("badge-text");
    if (badgeText) {
      badgeText.textContent = `${secs}s`;
    }
  };

  const startCountdown = () => {
    if (countdownTimer) clearInterval(countdownTimer);
    const badge = shadow.getElementById("updated-badge");
    if (badge) badge.style.display = "";
    updateBadge();
    countdownTimer = setInterval(updateBadge, 1000);
  };

  const reapplyOccupancy = () => {
    if (!occupancyCache) return;
    applyOccupancy(occupancyCache);
  };

  let retryCount = 0;
  let resizeObserver: ResizeObserver | null = null;

  const loadCluster = async (cluster: ClusterInfo) => {
    activeCluster = cluster;
    zoomLevel = 1.0;
    clearSeatGlow();
    const isOverview = cluster.id === "wifi" || cluster.id === "active";
    const badge = shadow.getElementById("seat-count-badge");
    if (badge) badge.style.display = isOverview ? "none" : "";
    const zoomCtrls = shadow.getElementById("zoom-controls");
    if (zoomCtrls) zoomCtrls.style.display = isOverview ? "none" : "";
    const id = ++loadId;
    retryCount = 0;

    shadow.querySelectorAll("[data-cluster-id]").forEach((el) => {
      const active = (el as HTMLElement).dataset.clusterId === cluster.id;
      (el as HTMLElement).classList.toggle("tab-active", active);
      (el as HTMLElement).classList.toggle("menu-active", active);
    });

    const tabsRow = shadow.querySelector<HTMLElement>(".tabs-scroll");
    const activeTab = tabsRow?.querySelector<HTMLElement>(
      `[data-cluster-id="${CSS.escape(cluster.id)}"]`,
    );
    activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });

    const mapArea = shadow.getElementById("map-area");
    if (!mapArea) return;

    {
      const spinnerContainer = document.createElement("div");
      spinnerContainer.className = "flex items-center justify-center p-12";
      const spinner = document.createElement("span");
      spinner.className = "loading loading-spinner loading-lg";
      spinnerContainer.appendChild(spinner);
      mapArea.replaceChildren(spinnerContainer);
    }

    if (cluster.id === "active") {
      renderActiveList(shadow, activeUsers);
      return;
    }

    if (cluster.id === "wifi") {
      renderWifiList(shadow, wifiUsers);
      return;
    }

    try {
      const svgText = await ensureClusterData(
        cluster,
        activeCampusId,
        abortController.signal,
      );
      if (!svgText) {
        if (id !== loadId) return;
        mapArea.replaceChildren();
        return;
      }
      if (id !== loadId) return;

      const svgDoc =
        parsedDocs.get(keyOf(activeCampusId, cluster.id)) ||
        new DOMParser().parseFromString(svgText, "image/svg+xml");

      mapArea.style.position = "relative";
      const imported = document.importNode(svgDoc.documentElement, true);
      const centeringWrap = document.createElement("div");
      centeringWrap.style.cssText =
        "display:flex;align-items:flex-start;min-height:100%;padding-top:2rem;";
      centeringWrap.appendChild(imported);
      mapArea.replaceChildren(centeringWrap);
      const svgEl = mapArea.querySelector("svg") as SVGSVGElement | null;
      const zp = shadow.querySelector(".zoom-pct") as HTMLElement | null;
      if (zp) zp.textContent = "100%";
      mapArea.scrollTop = 0;
      mapArea.scrollLeft = 0;
      applyMarkers(mapArea, showMarkers);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      trimSvgToContent();
      mapArea.scrollTop = 0;
      mapArea.scrollLeft = 0;

      const seats = seatPosCache.get(keyOf(activeCampusId, cluster.id));
      if (seats && seats.size > 0 && svgEl) {
        const vb = (svgEl.getAttribute("viewBox") || "")
          .split(/\s+/)
          .map(Number);
        const rect = svgEl.getBoundingClientRect();
        if (rect.width > 0) {
          const scaleX = rect.width / (vb[2] || 1200);
          const ws = [...seats.values()].map((s) => s.w).sort((a, b) => a - b);
          const hs = [...seats.values()].map((s) => s.h).sort((a, b) => a - b);
          const unit = Math.max(
            ws[Math.floor(ws.length / 2)],
            hs[Math.floor(hs.length / 2)],
          );
          zoomLevel = Math.min(
            3,
            Math.max(0.4, SEAT_TARGET_PX / (unit * scaleX)),
          );
          defaultZoomLevel = zoomLevel;
        }
      }
      updateZoom();

      if (id !== loadId) return;

      reapplyOccupancy();
    } catch {
      if (id !== loadId) return;
      retryCount++;
      if (retryCount <= 1) {
        loadCluster(activeCluster);
      } else {
        retryCount = 0;
        const errorDiv = document.createElement("div");
        errorDiv.className =
          "flex items-center justify-center p-12 text-base-content/50";
        errorDiv.textContent = "Failed to load map";
        mapArea.replaceChildren(errorDiv);
      }
    }
  };

  const rebuildHeader = () => {
    const tabsHost = shadow.querySelector(".tabs");
    if (tabsHost) {
      tabsHost.replaceChildren(
        ...clusters.map((c) => {
          const btn = document.createElement("button");
          btn.className = `tab font-bold text-xs px-4 whitespace-nowrap ${
            c.id === activeCluster.id ? "tab-active" : ""
          }`;
          btn.dataset.clusterId = c.id;
          btn.dataset.clusterName = clusterLabel(c);
          btn.textContent = clusterLabel(c);
          return btn;
        }),
      );
    }
    const defSel = shadow.getElementById(
      "default-cluster-select",
    ) as HTMLSelectElement | null;
    if (defSel) {
      defSel.replaceChildren(
        ...clusters.map((c) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = clusterLabel(c);
          opt.selected = c.id === activeCluster.id;
          return opt;
        }),
      );
    }
    const menu = shadow.getElementById("more-tabs-menu");
    if (menu) {
      menu.replaceChildren(
        ...clusters.map((c) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.className = `flex justify-between gap-2 whitespace-nowrap ${
            c.id === activeCluster.id ? "menu-active" : ""
          }`;
          a.dataset.clusterId = c.id;
          a.dataset.clusterName = clusterLabel(c);
          a.textContent = clusterLabel(c);
          li.appendChild(a);
          return li;
        }),
      );
    }
    wireTabs();
    updateTabsOverflow();
  };

  const updateDefaultSelect = () => {
    const sel = shadow.getElementById(
      "default-cluster-select",
    ) as HTMLElement | null;
    if (!sel) return;
    const ownCampus = !detectedCampus || activeCampusId === detectedCampus;
    sel.style.display = ownCampus ? "" : "none";
  };

  const updateCampusTime = () => {
    const el = shadow.getElementById("campus-time");
    if (!el) return;
    const tz = campusOptions.find((o) => o.id === activeCampusId)?.timezone;
    if (!tz) {
      el.style.display = "none";
      return;
    }
    const text = shadow.getElementById("campus-time-text");
    if (text) text.textContent = formatCampusClock(tz);
    el.style.display = "flex";
  };

  const getSeatGlowTarget = (seatId: string): Element | null => {
    const overlayLink = shadow.querySelector<HTMLElement>(
      `#seat-overlay .seat-link[data-host="${CSS.escape(seatId)}"]`,
    );
    if (overlayLink) return overlayLink;
    const mapArea = shadow.getElementById("map-area");
    const svg = mapArea?.querySelector("svg");
    if (!svg) return null;
    const matches = svg.querySelectorAll(
      `[id="${CSS.escape(seatId)}"], [id="shi-${CSS.escape(seatId)}"]`,
    );
    return matches.length > 0 ? matches[0] : null;
  };

  const clearSeatGlow = () => {
    flashingSeat = null;
    shadow
      .querySelectorAll(".ft-dialog-seat-glow")
      .forEach((n) => n.classList.remove("ft-dialog-seat-glow"));
  };

  const applySeatGlow = (seatId: string) => {
    const target = getSeatGlowTarget(seatId);
    if (!target) return false;
    target.classList.add("ft-dialog-seat-glow");
    return true;
  };

  const flashSeat = (seatId: string) => {
    const mapArea = shadow.getElementById("map-area");
    if (!mapArea) return;
    const svg = mapArea.querySelector("svg");
    if (!svg) return;
    clearSeatGlow();
    flashingSeat = seatId;
    if (!applySeatGlow(seatId)) {
      flashingSeat = null;
      return;
    }
    const overlayLink = shadow.querySelector<HTMLElement>(
      `#seat-overlay .seat-link[data-host="${CSS.escape(seatId)}"]`,
    );
    const scrollTarget =
      overlayLink ||
      svg.querySelector(
        `[id="${CSS.escape(seatId)}"], [id="shi-${CSS.escape(seatId)}"]`,
      );
    scrollTarget?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  };

  const loadCampus = async (campusId: string) => {
    activeCampusId = campusId;
    zoomLevel = 1.0;
    loadId++;
    clusters = await buildClusters(campusId);
    if (!clusters.some((c) => c.svg)) {
      const mapArea = shadow.getElementById("map-area");
      if (mapArea) {
        const div = document.createElement("div");
        div.className =
          "flex items-center justify-center p-12 text-base-content/50";
        div.textContent = "No cluster data for this campus";
        mapArea.replaceChildren(div);
      }
      return;
    }
    activeCluster = clusters.find((c) => c.id === defaultId) ||
      clusters[0] || { id: "wifi", name: "Wi-Fi" };
    const trigger = shadow.getElementById("campus-trigger");
    if (trigger) {
      const name =
        campusOptions.find((o) => o.id === campusId)?.name || campusId;
      const flagEl = shadow.getElementById("campus-trigger-flag");
      if (flagEl) flagEl.textContent = getCampusFlag(name);
      const nameEl = shadow.getElementById("campus-trigger-name");
      if (nameEl) nameEl.textContent = name.toUpperCase();
    }
    rebuildHeader();
    updateDefaultSelect();
    updateCampusTime();
    await loadCluster(activeCluster);
    await loadOccupancy();
    (async () => {
      const rest = clusters.filter((c) => c.id !== activeCluster.id && c.svg);
      for (const c of rest) {
        await ensureClusterData(c, campusId, abortController.signal);
      }
      reapplyOccupancy();
    })();
  };

  rerender();
  updateDefaultSelect();
  updateCampusTime();
  {
    const mapArea = shadow.getElementById("map-area");
    if (mapArea) {
      const spinnerContainer = document.createElement("div");
      spinnerContainer.className = "flex items-center justify-center p-12";
      const spinner = document.createElement("span");
      spinner.className = "loading loading-spinner loading-lg";
      spinnerContainer.appendChild(spinner);
      mapArea.replaceChildren(spinnerContainer);
    }
  }
  document.body.appendChild(dialog);
  dialog.showModal();
  await Promise.all([
    ensureClusterData(activeCluster, activeCampusId, abortController.signal),
    loadOccupancy(),
  ]);
  if (targetSeat) {
    await loadCluster(activeCluster);
    flashSeat(targetSeat);
  } else {
    loadCluster(activeCluster);
  }
  pollTimer = setInterval(loadOccupancy, POLL_INTERVAL);
  clockTimer = setInterval(updateCampusTime, 30_000);
  (async () => {
    const rest = clusters.filter((c) => c.id !== activeCluster.id && c.svg);
    for (const c of rest) {
      await ensureClusterData(c, activeCampusId, abortController.signal);
    }
    reapplyOccupancy();
  })();
  const mapAreaEl = shadow.getElementById("map-area");
  if (mapAreaEl) {
    let resizeScheduled = false;
    resizeObserver = new ResizeObserver(() => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resizeScheduled = false;
        reapplyOccupancy();
      });
    });
    resizeObserver.observe(mapAreaEl);
  }
}

async function fetchOccupancy(
  campusId: string,
  signal?: AbortSignal,
): Promise<Map<string, OccupancyEntry>> {
  const url = campusId
    ? `https://meta.intra.42.fr/campus/${campusId}/clusters.json`
    : CLUSTERS_JSON_URL;
  try {
    const res = await fetch(url, {
      credentials: "include",
      signal,
    });
    if (!res.ok) return new Map();
    const data = (await res.json()) as Record<string, OccupancyEntry>;
    const map = new Map<string, OccupancyEntry>();
    for (const [, entry] of Object.entries(data)) {
      if (entry.host && entry.login) {
        map.set(entry.host, entry);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}
