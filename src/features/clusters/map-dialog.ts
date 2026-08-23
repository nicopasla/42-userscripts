import { getConfig } from "../../config.ts";
import { fetchCampusList } from "./clusters.data.ts";
import {
  getEffectiveTheme,
  getIsLight,
} from "../profile/theme/theme-manager.ts";
import { bindTooltips } from "../../utils/tooltip.ts";
import { makeResizable } from "../../utils/resizable-dialog.ts";
import {
  ACTIVE_SORT_DEFAULT,
  type ActiveSortMode,
} from "./map-dialog/render.ts";
import type { DialogState } from "./map-dialog/context.ts";
import {
  buildClusters,
  ensureClusterData,
  loadCluster,
  loadCampus,
  updateZoom,
} from "./map-dialog/map-load.ts";
import { loadOccupancy, reapplyOccupancy } from "./map-dialog/occupancy.ts";
import {
  toggleActiveSort,
  toggleActiveWifi,
} from "./map-dialog/active-sort.ts";
import { flashSeat } from "./map-dialog/glow.ts";
import { rerender } from "./map-dialog/tabs.ts";
import { updateCampusTime, updateDefaultSelect } from "./map-dialog/header.ts";
import { findClusterForSeat } from "./map-dialog/helpers.ts";

export {
  applyPseudoCluster,
  applyActivePresence,
  formatCampusClock,
  findClusterForSeat,
} from "./map-dialog/helpers.ts";

export async function openClusterDialog(opts?: { seatId?: string }) {
  if (document.getElementById("cluster-map-dialog")) return;

  const detectedCampus = (await getConfig("CLUSTERS_CAMPUS")) || "";

  const [presetKeyRaw, defaultId, showMarkersVal] = await Promise.all([
    getConfig("PROFILE_THEME_PRESET"),
    getConfig("CLUSTERS_DEFAULT_ID"),
    getConfig("CLUSTERS_SHOW_MARKERS"),
  ]);
  const presetKey = (presetKeyRaw as string) || "dark";

  let activeSortMode: ActiveSortMode = ACTIVE_SORT_DEFAULT.mode;
  let activeNameDir: "asc" | "desc" = ACTIVE_SORT_DEFAULT.nameDir;
  let activeSinceDir: "asc" | "desc" = ACTIVE_SORT_DEFAULT.sinceDir;
  let activeWifiOnly = false;

  const savedActiveSort = (await chrome.storage.local.get(
    "MAP_ACTIVE_SORT",
  )) as {
    MAP_ACTIVE_SORT?: {
      mode?: "name" | "since";
      nameDir?: "asc" | "desc";
      sinceDir?: "asc" | "desc";
    };
  };
  const savedActiveSortData = savedActiveSort.MAP_ACTIVE_SORT;
  if (savedActiveSortData) {
    if (
      savedActiveSortData.mode === "name" ||
      savedActiveSortData.mode === "since"
    )
      activeSortMode = savedActiveSortData.mode;
    if (
      savedActiveSortData.nameDir === "asc" ||
      savedActiveSortData.nameDir === "desc"
    )
      activeNameDir = savedActiveSortData.nameDir;
    if (
      savedActiveSortData.sinceDir === "asc" ||
      savedActiveSortData.sinceDir === "desc"
    )
      activeSinceDir = savedActiveSortData.sinceDir;
  }

  const savedActiveWifi = (await chrome.storage.local.get(
    "MAP_ACTIVE_WIFI",
  )) as { MAP_ACTIVE_WIFI?: boolean };
  if (typeof savedActiveWifi.MAP_ACTIVE_WIFI === "boolean") {
    activeWifiOnly = savedActiveWifi.MAP_ACTIVE_WIFI;
  }

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

  let clusters = await buildClusters(activeCampusId);

  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : await getEffectiveTheme();
  const targetSeat = opts?.seatId?.toLowerCase();
  const targetCluster = targetSeat
    ? findClusterForSeat(clusters, targetSeat)
    : undefined;
  let activeCluster = targetCluster ||
    (defaultId === "active"
      ? { id: "active", name: "Active" }
      : clusters.find((c) => c.id === defaultId)) ||
    clusters[0] || { id: "active", name: "Active" };

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

  const state: DialogState = {
    shadow,
    dialog,
    tabsState: {
      wired: new WeakSet(),
      overflowing: false,
      resizeObserver: null,
    },
    timers: { poll: null, clock: null, countdown: null },
    campusOptions,
    activeCampusId,
    detectedCampus,
    currentTheme,
    clusters,
    activeCluster,
    defaultId,
    zoomLevel: 1.0,
    defaultZoomLevel: 1.0,
    showMarkers: showMarkersVal,
    seatPosCache: new Map(),
    svgViewBoxes: new Map(),
    parsedDocs: new Map(),
    loadId: 0,
    retryCount: 0,
    lastUpdated: 0,
    occupancyCache: null,
    wifiUsers: [],
    seatedUsers: [],
    activeUsers: [],
    flashingSeat: null,
    activeSortMode,
    activeNameDir,
    activeSinceDir,
    activeWifiOnly,
  };

  let isMaximized = false;

  const applyMaximizeIcon = (maximized: boolean) => {
    const btn = shadow.getElementById("maximize-btn");
    if (btn) btn.classList.toggle("is-maximized", maximized);
  };

  const cleanupResize = makeResizable(dialog, {
    minWidth: 640,
    minHeight: 480,
    onResizeStart: () => {
      if (isMaximized) {
        isMaximized = false;
        dialog.style.margin = "1.5rem auto auto auto";
        const btn = shadow.getElementById("maximize-btn");
        if (btn) {
          applyMaximizeIcon(false);
          btn.dataset.tip = "Maximize";
        }
      }
    },
  });

  bindTooltips(shadow, getIsLight);

  const abortController = new AbortController();

  const cleanup = () => {
    if (state.timers.poll) clearInterval(state.timers.poll);
    if (state.timers.countdown) clearInterval(state.timers.countdown);
    if (state.timers.clock) clearInterval(state.timers.clock);
    if (state.tabsState.resizeObserver) {
      state.tabsState.resizeObserver.disconnect();
      state.tabsState.resizeObserver = null;
    }
    abortController.abort();
  };

  let resizeObserver: ResizeObserver | null = null;

  dialog.addEventListener("close", () => {
    cleanup();
    if (resizeObserver) resizeObserver.disconnect();
    cleanupResize();
    dialog.remove();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  shadow.addEventListener("click", (e) => {
    const path = e.composedPath();
    const campusMenu = shadow.getElementById(
      "campus-menu",
    ) as HTMLElement | null;
    const campusTrigger = shadow.getElementById(
      "campus-trigger",
    ) as HTMLElement | null;
    const settingsMenu = shadow.getElementById(
      "settings-menu",
    ) as HTMLElement | null;
    const settingsBtn = shadow.getElementById(
      "settings-btn",
    ) as HTMLElement | null;

    const campusOption = path.find(
      (el) => el instanceof HTMLElement && el.hasAttribute("data-campus-id"),
    ) as HTMLElement | undefined;
    if (campusOption && campusOption.dataset.campusId) {
      if (campusMenu) campusMenu.style.display = "none";
      if (settingsMenu) settingsMenu.style.display = "none";
      loadCampus(state, campusOption.dataset.campusId, abortController.signal);
      return;
    }
    if (campusTrigger && path.includes(campusTrigger)) {
      if (campusMenu) {
        campusMenu.style.display =
          campusMenu.style.display === "none" ? "block" : "none";
      }
      if (settingsMenu) settingsMenu.style.display = "none";
      return;
    }
    if (settingsBtn && path.includes(settingsBtn)) {
      if (settingsMenu) {
        settingsMenu.style.display =
          settingsMenu.style.display === "none" ? "block" : "none";
      }
      if (campusMenu) campusMenu.style.display = "none";
      return;
    }
    if (
      campusMenu &&
      campusMenu.style.display !== "none" &&
      !path.includes(campusMenu)
    ) {
      campusMenu.style.display = "none";
    }
    if (
      settingsMenu &&
      settingsMenu.style.display !== "none" &&
      !path.includes(settingsMenu)
    ) {
      settingsMenu.style.display = "none";
    }
    const btn = path.find(
      (el) => el instanceof HTMLElement && el.hasAttribute("data-cluster-id"),
    ) as HTMLElement | undefined;
    if (btn) {
      const id = btn.dataset.clusterId;
      const cluster = state.clusters.find((c) => c.id === id);
      if (cluster) loadCluster(state, cluster, abortController.signal);
      if (settingsMenu) settingsMenu.style.display = "none";
      const dd = btn.closest<HTMLDetailsElement>("details.dropdown");
      if (dd) dd.open = false;
      return;
    }
    const reloadBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "updated-badge",
    );
    if (reloadBtn) {
      loadOccupancy(state, abortController.signal);
      return;
    }
    const markersBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "markers-btn",
    );
    if (markersBtn) {
      state.showMarkers = !state.showMarkers;
      chrome.storage.local.set({ CLUSTERS_SHOW_MARKERS: state.showMarkers });
      const mBtn = shadow.getElementById("markers-btn");
      if (mBtn) {
        mBtn.classList.toggle("btn-accent", state.showMarkers);
        mBtn.classList.toggle("btn-ghost", !state.showMarkers);
        mBtn.style.borderColor = state.showMarkers ? "var(--color-accent)" : "";
        const stateEl = mBtn.lastElementChild as HTMLElement | null;
        if (stateEl) stateEl.textContent = state.showMarkers ? "ON" : "OFF";
      }
      const mapEl = shadow.getElementById("map-area");
      if (mapEl) {
        mapEl.querySelectorAll<SVGElement>(".custom-screen").forEach((el) => {
          el.style.display = state.showMarkers ? "" : "none";
        });
      }
      return;
    }
    const zoomIn = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-in",
    );
    if (zoomIn) {
      state.zoomLevel = Math.min(3.0, state.zoomLevel + 0.1);
      updateZoom(state);
      return;
    }
    const zoomOut = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-out",
    );
    if (zoomOut) {
      state.zoomLevel = Math.max(0.3, state.zoomLevel - 0.1);
      updateZoom(state);
      return;
    }
    const zoomReset = path.find(
      (el) => el instanceof HTMLElement && el.id === "zoom-reset",
    );
    if (zoomReset) {
      state.zoomLevel = state.defaultZoomLevel;
      updateZoom(state);
      return;
    }
    const sortName = path.find(
      (el) => el instanceof HTMLElement && el.id === "sort-name",
    );
    if (sortName) {
      toggleActiveSort(state, "name");
      return;
    }
    const sortSince = path.find(
      (el) => el instanceof HTMLElement && el.id === "sort-since",
    );
    if (sortSince) {
      toggleActiveSort(state, "since");
      return;
    }
    const wifiToggle = path.find(
      (el) => el instanceof HTMLElement && el.id === "active-wifi-toggle",
    );
    if (wifiToggle) {
      toggleActiveWifi(state);
      return;
    }
    const maximizeBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "maximize-btn",
    ) as HTMLElement | undefined;
    if (maximizeBtn) {
      isMaximized = !isMaximized;
      if (isMaximized) {
        dialog.dataset.prevWidth = dialog.style.width;
        dialog.dataset.prevHeight = dialog.style.height;
        dialog.dataset.prevMargin = dialog.style.margin;
        dialog.style.width = "calc(100dvw - 2rem)";
        dialog.style.height = "calc(100dvh - 2rem)";
        dialog.style.margin = "1rem auto";
      } else {
        dialog.style.width = dialog.dataset.prevWidth || "";
        dialog.style.height = dialog.dataset.prevHeight || "";
        dialog.style.margin = dialog.dataset.prevMargin || "";
      }
      maximizeBtn.dataset.tip = isMaximized ? "Restore size" : "Maximize";
      applyMaximizeIcon(isMaximized);
      return;
    }
    const closeBtn = path.find(
      (el) => el instanceof HTMLElement && el.id === "close-btn",
    );
    if (closeBtn) dialog.close();
    const inDropdown = path.some(
      (el) =>
        el instanceof HTMLElement &&
        el.tagName === "DETAILS" &&
        el.classList.contains("dropdown"),
    );
    const openDropdown = shadow.querySelector<HTMLDetailsElement>(
      "details.dropdown[open]",
    );
    if (openDropdown && !inDropdown) openDropdown.open = false;
  });

  shadow.addEventListener("change", (e) => {
    const select = (e.target as HTMLElement).closest(
      "#default-cluster-select",
    ) as HTMLSelectElement | null;
    if (select) {
      chrome.storage.local.set({ CLUSTERS_DEFAULT_ID: select.value });
    }
  });

  rerender(state);
  updateDefaultSelect(state);
  updateCampusTime(state);
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
    ensureClusterData(
      state,
      activeCluster,
      activeCampusId,
      abortController.signal,
    ),
    loadOccupancy(state, abortController.signal),
  ]);
  if (targetSeat) {
    await loadCluster(state, activeCluster, abortController.signal);
    flashSeat(state, targetSeat);
  } else {
    loadCluster(state, activeCluster, abortController.signal);
  }
  state.timers.poll = setInterval(
    () => loadOccupancy(state, abortController.signal),
    60_000,
  );
  state.timers.clock = setInterval(() => updateCampusTime(state), 30_000);
  (async () => {
    const rest = state.clusters.filter(
      (c) => c.id !== state.activeCluster.id && c.svg,
    );
    for (const c of rest) {
      await ensureClusterData(state, c, activeCampusId, abortController.signal);
    }
    reapplyOccupancy(state);
  })();
  const mapAreaEl = shadow.getElementById("map-area");
  if (mapAreaEl) {
    let resizeScheduled = false;
    resizeObserver = new ResizeObserver(() => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resizeScheduled = false;
        reapplyOccupancy(state);
      });
    });
    resizeObserver.observe(mapAreaEl);
  }
}
