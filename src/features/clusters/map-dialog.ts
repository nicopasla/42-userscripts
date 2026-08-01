import { html, render, TemplateResult } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { getConfig } from "../../config.ts";
import { CLUSTERS } from "./clusters.data.ts";
import { getEffectiveTheme } from "../profile/theme/theme-manager.ts";
import RELOAD_SVG from "../../assets/svg/reload.svg?raw";
import { cropSvgViewBox, SeatPos } from "./map-dialog/crop.ts";
import { sanitizeAndParseSeats, applyMarkers } from "./map-dialog/seats.ts";
import {
  getCachedCluster,
  setCachedCluster,
  fetchClusterSVGs,
} from "./map-dialog/cache.ts";
import {
  renderSeatOverlays,
  renderWifiList,
  OccupancyEntry,
} from "./map-dialog/render.ts";

interface ClusterInfo {
  id: string;
  name: string;
  svg?: string;
}

const WORKER_URL = "https://api.betterintra.com";
const CLUSTERS_JSON_URL = "https://meta.intra.42.fr/clusters.json";
const POLL_INTERVAL = 60_000;

export async function openClusterDialog() {
  if (document.getElementById("cluster-map-dialog")) return;

  const campusId = await getConfig("CLUSTERS_CAMPUS");
  if (campusId !== "12") {
    window.open("https://meta.intra.42.fr/clusters", "_blank");
    return;
  }

  const [presetKeyRaw, defaultId, showMarkersVal, svgs] = await Promise.all([
    getConfig("PROFILE_THEME_PRESET"),
    getConfig("CLUSTERS_DEFAULT_ID"),
    getConfig("CLUSTERS_SHOW_MARKERS"),
    fetchClusterSVGs(),
  ]);
  const presetKey = (presetKeyRaw as string) || "dark";

  const clusters: ClusterInfo[] = [
    ...CLUSTERS.map((c) => ({
      id: c.id,
      name: c.name,
      svg: svgs[c.id],
    })).filter((c) => c.svg),
    { id: "wifi", name: "Wi-Fi" },
  ];

  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : await getEffectiveTheme();
  let activeCluster = clusters.find((c) => c.id === defaultId) || clusters[0];
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const seatPosCache = new Map<string, Map<string, SeatPos>>();
  const svgViewBoxes = new Map<string, { w: number; h: number }>();
  const parsedDocs = new Map<string, Document>();
  let loadId = 0;
  let lastUpdated = 0;
  let showMarkers = showMarkersVal;
  let wifiUsers: OccupancyEntry[] = [];
  let zoomLevel = 1.0;
  const clusterCounts = new Map<string, { taken: number; total: number }>();

  const updateZoom = () => {
    const wrap = shadow.getElementById("map-area")
      ?.firstElementChild as HTMLElement | null;
    if (wrap) {
      wrap.style.transform = `scale(${zoomLevel})`;
      wrap.style.transformOrigin = "center center";
    }
    const pct = shadow.querySelector(".zoom-pct") as HTMLElement | null;
    if (pct) pct.textContent = `${Math.round(zoomLevel * 100)}%`;
    requestAnimationFrame(() => reapplyOccupancy());
  };

  const ensureClusterData = async (
    c: ClusterInfo,
    signal?: AbortSignal,
  ): Promise<string | null> => {
    if (!c.svg) return null;
    try {
      if (seatPosCache.has(c.id) && svgViewBoxes.has(c.id)) {
        return "cached";
      }
      let cached = await getCachedCluster(c.id);
      let svgText = cached?.svg;
      if (!svgText) {
        const url = `${WORKER_URL}/api/v1/cluster/svg?url=${encodeURIComponent(c.svg)}`;
        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        svgText = await res.text();
      }
      if (!svgViewBoxes.has(c.id)) {
        const svgDoc = new DOMParser().parseFromString(
          svgText,
          "image/svg+xml",
        );
        const seatMap = sanitizeAndParseSeats(svgDoc);
        parsedDocs.set(c.id, svgDoc);
        const vb = (svgDoc.querySelector("svg")?.getAttribute("viewBox") ?? "")
          .split(/\s+/)
          .map(Number);
        svgViewBoxes.set(c.id, { w: vb[2] || 1200, h: vb[3] || 800 });
        seatPosCache.set(c.id, seatMap);
        setCachedCluster(c.id, {
          svg: svgText,
          seats: [...seatMap],
          viewBox: svgViewBoxes.get(c.id)!,
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
    margin: "2rem auto auto auto",
    width: "min(960px, calc(100dvw - 2rem))",
    height: "min(88dvh, 1100px)",
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

  const abortController = new AbortController();

  const cleanup = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
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
          margin: auto;
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
        .seat-tip {
          display: none;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.88);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          white-space: nowrap;
          z-index: 99999;
          pointer-events: none;
        }
        .seat-link:hover .seat-tip {
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
      </style>
      <div
        data-theme="${currentTheme}"
        class="flex flex-col bg-base-100 h-full overflow-hidden"
      >
        <div
          class="flex items-center justify-between shrink-0 p-3 pb-0 sticky top-0 z-10 bg-base-100 rounded-t-xl"
        >
          <div class="tabs tabs-border border-accent">
            ${clusters.map(
              (c) =>
                html`<button
                  class="tab font-bold text-xs px-4 ${c.id === cluster.id
                    ? "tab-active"
                    : ""}"
                  data-cluster-id="${c.id}"
                  data-cluster-name="${c.name.toUpperCase()}"
                >
                  ${c.name.toUpperCase()}
                </button>`,
            )}
          </div>
          <div class="flex items-center gap-2">
            <span
              id="totals-badge"
              class="badge badge-sm h-8"
              style="white-space:nowrap;border-radius:var(--radius-field)"
              title="Total taken / Total seats"
              >- / -</span
            >
            <select
              class="select select-accent select-sm"
              id="default-cluster-select"
              title="Default cluster"
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
              title="Toggle screen markers"
            >
              Show Markers
            </button>
            <button
              id="updated-badge"
              class="btn btn-accent btn-sm border border-base-content/20"
              style="display:none;width:80px;justify-content:flex-start"
              title="Reload occupancy"
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
            id="seat-count-badge"
            class="absolute top-2 left-2 z-20 text-xs tabular-nums font-medium bg-base-100/80 backdrop-blur rounded-lg px-2 py-1 border border-base-300 text-base-content/70"
          >
            - / -
          </div>
          <div
            id="zoom-controls"
            class="absolute top-2 right-2 z-20 flex items-center gap-1 bg-base-100/80 backdrop-blur rounded-lg px-1 py-0.5 border border-base-300"
          >
            <button
              class="btn btn-ghost btn-xs text-xs"
              id="zoom-out"
              title="Zoom out"
            >
              −
            </button>
            <span class="zoom-pct text-xs tabular-nums w-10 text-center"
              >100%</span
            >
            <button
              class="btn btn-ghost btn-xs text-xs"
              id="zoom-in"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const rerender = () => {
    render(renderTemplate(activeCluster), shadow);
  };
  shadow.addEventListener("click", (e) => {
    const path = e.composedPath();
    const btn = path.find(
      (el) => el instanceof HTMLElement && el.hasAttribute("data-cluster-id"),
    ) as HTMLElement | undefined;
    if (btn) {
      const id = btn.dataset.clusterId;
      const cluster = clusters.find((c) => c.id === id);
      if (cluster) loadCluster(cluster);
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

  const applyOccupancy = (occupancy: Map<string, OccupancyEntry>) => {
    wifiUsers = [];
    const workCopy = new Map(occupancy);
    for (const [host, entry] of workCopy) {
      if (host.startsWith("wifi-")) {
        wifiUsers.push(entry);
        workCopy.delete(host);
      }
    }
    const positions = seatPosCache.get(activeCluster.id);
    const viewBox = svgViewBoxes.get(activeCluster.id);
    if (positions && viewBox) {
      renderSeatOverlays(shadow, workCopy, positions, viewBox);
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
    for (const [clusterId, seats] of seatPosCache) {
      const taken = [...workCopy.keys()].filter((h) => seats.has(h)).length;
      clusterCounts.set(clusterId, { taken, total: seats.size });
    }
    for (const tab of shadow.querySelectorAll<HTMLElement>(
      "[data-cluster-id]",
    )) {
      const id = tab.dataset.clusterId;
      const name = tab.dataset.clusterName || id?.toUpperCase() || "";
      if (!id) continue;
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
      const count = clusterCounts.get(id);
      tab.textContent = name;
      if (count && count.total > 0) {
        const num = document.createElement("span");
        num.textContent = `${count.taken}/${count.total}`;
        num.style.cssText =
          "font-weight:400;opacity:0.55;font-size:11px;margin-left:6px;";
        tab.appendChild(num);
      }
    }
    const allCounts = [...clusterCounts.values()];
    const sumTaken = allCounts.reduce((s, c) => s + c.taken, 0);
    const sumTotal = allCounts.reduce((s, c) => s + c.total, 0);
    const totalsBadge = shadow.getElementById("totals-badge");
    if (totalsBadge) totalsBadge.textContent = `${sumTaken} / ${sumTotal}`;
    startCountdown();
  };

  const loadOccupancy = async () => {
    const reloadIcon = shadow.getElementById("reload-icon");
    if (reloadIcon) reloadIcon.classList.add("spinning");
    try {
      const occupancy = await fetchOccupancy(abortController.signal);
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
    const isWifi = cluster.id === "wifi";
    const badge = shadow.getElementById("seat-count-badge");
    if (badge) badge.style.display = isWifi ? "none" : "";
    const zoomCtrls = shadow.getElementById("zoom-controls");
    if (zoomCtrls) zoomCtrls.style.display = isWifi ? "none" : "";
    const id = ++loadId;
    retryCount = 0;

    shadow.querySelectorAll("[data-cluster-id]").forEach((el) => {
      (el as HTMLElement).classList.toggle(
        "tab-active",
        (el as HTMLElement).dataset.clusterId === cluster.id,
      );
    });

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

    if (cluster.id === "wifi") {
      renderWifiList(shadow, wifiUsers);
      return;
    }

    try {
      const svgText = await ensureClusterData(cluster, abortController.signal);
      if (!svgText) {
        if (id !== loadId) return;
        mapArea.replaceChildren();
        return;
      }
      if (id !== loadId) return;

      const svgDoc =
        parsedDocs.get(cluster.id) ||
        new DOMParser().parseFromString(svgText, "image/svg+xml");

      mapArea.style.position = "relative";
      const imported = document.importNode(svgDoc.documentElement, true);
      const centeringWrap = document.createElement("div");
      centeringWrap.style.cssText =
        "display:flex;align-items:center;justify-content:center;min-height:100%;transform:scale(1);transform-origin:center center;";
      centeringWrap.appendChild(imported);
      mapArea.replaceChildren(centeringWrap);
      const zp = shadow.querySelector(".zoom-pct") as HTMLElement | null;
      if (zp) zp.textContent = "100%";
      mapArea.scrollTop = 0;
      mapArea.scrollLeft = 0;
      applyMarkers(mapArea, showMarkers);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const newVB = cropSvgViewBox(mapArea, seatPosCache.get(cluster.id));
      if (newVB) {
        svgViewBoxes.set(cluster.id, newVB);
        void (mapArea.querySelector("svg") as SVGSVGElement)?.getBBox();
      }

      if (id !== loadId) return;

      reapplyOccupancy();
    } catch (e) {
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
  rerender();
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
    ensureClusterData(activeCluster, abortController.signal),
    loadOccupancy(),
  ]);
  loadCluster(activeCluster);
  pollTimer = setInterval(loadOccupancy, POLL_INTERVAL);
  (async () => {
    const rest = clusters.filter((c) => c.id !== activeCluster.id && c.svg);
    for (const c of rest) {
      await ensureClusterData(c, abortController.signal);
    }
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
  signal?: AbortSignal,
): Promise<Map<string, OccupancyEntry>> {
  try {
    const res = await fetch(CLUSTERS_JSON_URL, {
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
