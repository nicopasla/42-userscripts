import {
  CLUSTERS_JSON_URL,
  POLL_INTERVAL,
  keyOf,
  clusterLabel,
  type DialogState,
} from "./context";
import {
  renderActiveList,
  renderSeatOverlays,
  sortActiveUsers,
  type OccupancyEntry,
} from "./render";
import { normalizeSeatId } from "./seats";
import { applyActivePresence } from "./helpers";
import { applySeatGlow } from "./glow";
import { rebuildHeader } from "./header";
import { updateTabsOverflow } from "./tabs";
import { loadCluster } from "./map-load";

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

export function applyOccupancy(
  state: DialogState,
  occupancy: Map<string, OccupancyEntry>,
) {
  const { shadow, activeCluster, activeCampusId } = state;
  state.wifiUsers = [];
  const workCopy = new Map(occupancy);
  for (const [host, entry] of workCopy) {
    if (host.startsWith("wifi-")) {
      state.wifiUsers.push(entry);
      workCopy.delete(host);
    }
  }
  state.activeUsers = sortActiveUsers(
    state.activeWifiOnly
      ? state.wifiUsers
      : [...workCopy.values(), ...state.wifiUsers],
    state.activeSortMode,
    state.activeNameDir,
    state.activeSinceDir,
  );
  state.seatedUsers = [...workCopy.values()];
  const activeVisible = state.activeUsers.length > 0;
  let clustersChanged = false;
  const activeChange = applyActivePresence(state.clusters, activeVisible);
  if (activeChange.added || activeChange.removed) {
    state.clusters = activeChange.clusters;
    clustersChanged = true;
  }
  if (clustersChanged) {
    rebuildHeader(state);
    if (activeChange.removed && activeCluster.id === "active") {
      state.activeCluster = state.clusters[0];
      if (state.activeCluster) loadCluster(state, state.activeCluster);
    }
  }
  const positions = state.seatPosCache.get(
    keyOf(activeCampusId, activeCluster.id),
  );
  const viewBox = state.svgViewBoxes.get(
    keyOf(activeCampusId, activeCluster.id),
  );
  if (positions && viewBox) {
    renderSeatOverlays(shadow, workCopy, positions, viewBox);
  }
  if (activeCluster.id === "active") {
    renderActiveList(shadow, state.activeUsers);
  }
  if (state.flashingSeat) {
    applySeatGlow(state, state.flashingSeat);
  }
  const badge = shadow.getElementById("seat-count-badge");
  if (badge) {
    const total = positions?.size ?? 0;
    const taken = positions
      ? [...workCopy.keys()].filter((h) => positions.has(normalizeSeatId(h)))
          .length
      : 0;
    if (total > 0) {
      const free = total - taken;
      badge.textContent = `${taken} / ${total}`;
      badge.title = `${taken} taken, ${free} free · ${total} total`;
    } else {
      badge.textContent = `- / -`;
    }
  }
  const clusterCounts = new Map<string, { taken: number; total: number }>();
  const campusPrefix = `${activeCampusId}:`;
  for (const [key, seats] of state.seatPosCache) {
    if (!key.startsWith(campusPrefix)) continue;
    const clusterId = key.slice(campusPrefix.length);
    const taken = [...workCopy.keys()].filter((h) =>
      seats.has(normalizeSeatId(h)),
    ).length;
    clusterCounts.set(clusterId, { taken, total: seats.size });
  }
  for (const tab of shadow.querySelectorAll<HTMLElement>("[data-cluster-id]")) {
    const id = tab.dataset.clusterId;
    if (!id) continue;
    const cluster = state.clusters.find((c) => c.id === id);
    const name = cluster
      ? clusterLabel(cluster)
      : tab.dataset.clusterName || id.toUpperCase();
    tab.textContent = name;
    if (id === "active") {
      if (state.activeUsers.length > 0) {
        const num = document.createElement("span");
        num.textContent = `${state.activeUsers.length}`;
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
      const cluster = state.clusters.find((c) => c.id === opt.value);
      if (cluster) opt.textContent = clusterLabel(cluster);
    }
  }
  const allCounts = [...clusterCounts.values()];
  const sumTaken = allCounts.reduce((s, c) => s + c.taken, 0);
  const sumTotal = allCounts.reduce((s, c) => s + c.total, 0);
  const totalsBadge = shadow.getElementById("totals-badge");
  if (totalsBadge) {
    if (activeCluster.id === "active") {
      totalsBadge.textContent = `${state.activeUsers.length} active`;
      totalsBadge.title = "Users currently connected";
      totalsBadge.style.display = state.activeUsers.length > 0 ? "" : "none";
    } else {
      totalsBadge.textContent = `${sumTaken} / ${sumTotal}`;
      totalsBadge.title = "Total taken / Total seats";
      if (sumTotal > 0 || sumTaken > 0) {
        totalsBadge.style.display = "";
      } else {
        totalsBadge.style.display = "none";
      }
    }
  }
  startCountdown(state);
  updateTabsOverflow(state);
}

export async function loadOccupancy(state: DialogState, signal?: AbortSignal) {
  const reloadIcon = state.shadow.getElementById("reload-icon");
  if (reloadIcon) reloadIcon.classList.add("spinning");
  try {
    const occupancy = await fetchOccupancy(state.activeCampusId, signal);
    state.occupancyCache = occupancy;
    state.lastUpdated = Date.now();
    applyOccupancy(state, occupancy);
  } finally {
    if (reloadIcon) reloadIcon.classList.remove("spinning");
  }
}

function updateBadge(state: DialogState) {
  const secs = Math.max(
    0,
    Math.ceil((POLL_INTERVAL - (Date.now() - state.lastUpdated)) / 1000),
  );
  const badgeText = state.shadow.getElementById("badge-text");
  if (badgeText) {
    badgeText.textContent = `${secs}s`;
  }
}

function startCountdown(state: DialogState) {
  if (state.timers.countdown) clearInterval(state.timers.countdown);
  const badge = state.shadow.getElementById("updated-badge");
  if (badge) badge.style.display = "";
  updateBadge(state);
  state.timers.countdown = setInterval(() => updateBadge(state), 1000);
}

export function reapplyOccupancy(state: DialogState) {
  if (!state.occupancyCache) return;
  applyOccupancy(state, state.occupancyCache);
}
