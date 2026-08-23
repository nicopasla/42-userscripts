import type { ClusterInfo, DialogState } from "./context";
import { WORKER_URL, SEAT_TARGET_PX, keyOf, clusterLabel } from "./context";
import { getClusterData } from "../clusters.data.ts";
import {
  getCachedCluster,
  setCachedCluster,
  scrapeCampusSVGUrls,
} from "./cache";
import { sanitizeAndParseSeats, getSvgTitle, applyMarkers } from "./seats";
import { renderActiveList } from "./render";
import { loadOccupancy, reapplyOccupancy } from "./occupancy";
import { updateActiveSortControls } from "./active-sort";
import { clearSeatGlow } from "./glow";
import { rebuildHeader, updateCampusTime, updateDefaultSelect } from "./header";
import { getCampusFlag } from "../../profile/campus-flags.ts";

export async function buildClusters(campusId: string): Promise<ClusterInfo[]> {
  let repoClusters: { id: string; name: string }[] = [];
  try {
    const data = await getClusterData(campusId);
    repoClusters = data.clusters;
  } catch {
    repoClusters = [];
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
}

export async function ensureClusterData(
  state: DialogState,
  c: ClusterInfo,
  campusId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!c.svg) {
    return null;
  }
  const key = keyOf(campusId, c.id);
  try {
    if (state.seatPosCache.has(key) && state.svgViewBoxes.has(key)) {
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
    if (!state.svgViewBoxes.has(key)) {
      const svgDoc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const seatMap = sanitizeAndParseSeats(svgDoc);
      state.parsedDocs.set(key, svgDoc);
      const title = getSvgTitle(svgDoc);
      if (title && !c.name.trim()) c.name = title;
      const vb = (svgDoc.querySelector("svg")?.getAttribute("viewBox") ?? "")
        .split(/\s+/)
        .map(Number);
      state.svgViewBoxes.set(key, { w: vb[2] || 1200, h: vb[3] || 800 });
      state.seatPosCache.set(key, seatMap);
      setCachedCluster(campusId, c.id, {
        svg: svgText,
        seats: [...seatMap],
        viewBox: state.svgViewBoxes.get(key)!,
        cachedAt: 0,
      }).catch(() => {});
    }
    return svgText;
  } catch {
    return null;
  }
}

export function trimSvgToContent(state: DialogState) {
  const mapArea = state.shadow.getElementById("map-area");
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
}

export function updateZoom(state: DialogState) {
  const mapArea = state.shadow.getElementById("map-area");
  const svg = mapArea?.querySelector("svg") as SVGSVGElement | null;
  if (mapArea && svg) {
    svg.style.width = `${Math.max(
      1,
      Math.round(mapArea.clientWidth * state.zoomLevel),
    )}px`;
    svg.style.height = "auto";
  }
  const pct = state.shadow.querySelector(".zoom-pct") as HTMLElement | null;
  if (pct) pct.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  requestAnimationFrame(() => reapplyOccupancy(state));
}

export async function loadCluster(
  state: DialogState,
  cluster: ClusterInfo,
  signal?: AbortSignal,
) {
  state.activeCluster = cluster;
  state.zoomLevel = 1.0;
  clearSeatGlow(state);
  const isOverview = cluster.id === "active";
  const badge = state.shadow.getElementById("seat-count-badge");
  if (badge) badge.style.display = isOverview ? "none" : "";
  const zoomCtrls = state.shadow.getElementById("zoom-controls");
  if (zoomCtrls) zoomCtrls.style.display = isOverview ? "none" : "";
  const sortCtrls = state.shadow.getElementById("active-sort");
  if (sortCtrls)
    sortCtrls.style.display = cluster.id === "active" ? "" : "none";
  const topBadges = state.shadow.getElementById("top-left-badges");
  topBadges?.classList.toggle("active-tab", cluster.id === "active");
  const id = ++state.loadId;
  state.retryCount = 0;

  state.shadow.querySelectorAll("[data-cluster-id]").forEach((el) => {
    const active = (el as HTMLElement).dataset.clusterId === cluster.id;
    (el as HTMLElement).classList.toggle("tab-active", active);
    (el as HTMLElement).classList.toggle("menu-active", active);
  });

  const summaryLabel = state.shadow.querySelector<HTMLElement>(
    ".clusters-nav-summary-label",
  );
  if (summaryLabel) summaryLabel.textContent = clusterLabel(cluster);

  const tabsRow = state.shadow.querySelector<HTMLElement>(".tabs-scroll");
  const activeTab = tabsRow?.querySelector<HTMLElement>(
    `[data-cluster-id="${CSS.escape(cluster.id)}"]`,
  );
  activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });

  const mapArea = state.shadow.getElementById("map-area");
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
    updateActiveSortControls(state);
    renderActiveList(state.shadow, state.activeUsers);
    return;
  }

  try {
    const svgText = await ensureClusterData(
      state,
      cluster,
      state.activeCampusId,
      signal,
    );
    if (!svgText) {
      if (id !== state.loadId) return;
      mapArea.replaceChildren();
      return;
    }
    if (id !== state.loadId) return;

    const svgDoc =
      state.parsedDocs.get(keyOf(state.activeCampusId, cluster.id)) ||
      new DOMParser().parseFromString(svgText, "image/svg+xml");

    mapArea.style.position = "relative";
    const imported = document.importNode(svgDoc.documentElement, true);
    const centeringWrap = document.createElement("div");
    centeringWrap.style.cssText =
      "display:flex;align-items:flex-start;min-height:100%;padding-top:2rem;";
    centeringWrap.appendChild(imported);
    mapArea.replaceChildren(centeringWrap);
    const svgEl = mapArea.querySelector("svg") as SVGSVGElement | null;
    const zp = state.shadow.querySelector(".zoom-pct") as HTMLElement | null;
    if (zp) zp.textContent = "100%";
    mapArea.scrollTop = 0;
    mapArea.scrollLeft = 0;
    applyMarkers(mapArea, state.showMarkers);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    trimSvgToContent(state);
    mapArea.scrollTop = 0;
    mapArea.scrollLeft = 0;

    const seats = state.seatPosCache.get(
      keyOf(state.activeCampusId, cluster.id),
    );
    if (seats && seats.size > 0 && svgEl) {
      const vb = (svgEl.getAttribute("viewBox") || "").split(/\s+/).map(Number);
      const rect = svgEl.getBoundingClientRect();
      if (rect.width > 0) {
        const scaleX = rect.width / (vb[2] || 1200);
        const ws = [...seats.values()].map((s) => s.w).sort((a, b) => a - b);
        const hs = [...seats.values()].map((s) => s.h).sort((a, b) => a - b);
        const unit = Math.max(
          ws[Math.floor(ws.length / 2)],
          hs[Math.floor(hs.length / 2)],
        );
        state.zoomLevel = Math.min(
          3,
          Math.max(0.4, SEAT_TARGET_PX / (unit * scaleX)),
        );
        state.defaultZoomLevel = state.zoomLevel;
      }
    }
    updateZoom(state);

    if (id !== state.loadId) return;

    reapplyOccupancy(state);
  } catch {
    if (id !== state.loadId) return;
    state.retryCount++;
    if (state.retryCount <= 1) {
      loadCluster(state, state.activeCluster, signal);
    } else {
      state.retryCount = 0;
      const errorDiv = document.createElement("div");
      errorDiv.className =
        "flex items-center justify-center p-12 text-base-content/50";
      errorDiv.textContent = "Failed to load map";
      mapArea.replaceChildren(errorDiv);
    }
  }
}

export async function loadCampus(
  state: DialogState,
  campusId: string,
  signal?: AbortSignal,
) {
  const { shadow } = state;
  state.activeCampusId = campusId;
  state.zoomLevel = 1.0;
  state.loadId++;
  state.clusters = await buildClusters(campusId);
  if (!state.clusters.some((c) => c.svg)) {
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
  state.activeCluster =
    state.defaultId === "active"
      ? { id: "active", name: "Active" }
      : state.clusters.find((c) => c.id === state.defaultId) ||
        state.clusters[0] || { id: "active", name: "Active" };
  const trigger = shadow.getElementById("campus-trigger");
  if (trigger) {
    const name =
      state.campusOptions.find((o) => o.id === campusId)?.name || campusId;
    const flagEl = shadow.getElementById("campus-trigger-flag");
    if (flagEl) flagEl.textContent = getCampusFlag(name);
    const nameEl = shadow.getElementById("campus-trigger-name");
    if (nameEl) nameEl.textContent = name.toUpperCase();
  }
  rebuildHeader(state);
  updateDefaultSelect(state);
  updateCampusTime(state);
  await loadCluster(state, state.activeCluster, signal);
  await loadOccupancy(state, signal);
  (async () => {
    const rest = state.clusters.filter(
      (c) => c.id !== state.activeCluster.id && c.svg,
    );
    for (const c of rest) {
      await ensureClusterData(state, c, campusId, signal);
    }
    reapplyOccupancy(state);
  })();
}
