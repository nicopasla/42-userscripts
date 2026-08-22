import { render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import type { DialogState } from "./context";
import {
  renderActiveList,
  sortActiveUsers,
  type ActiveSortMode,
} from "./render";
import SORT_AZ_SVG from "../../../assets/svg/sort-az.svg?raw";
import SORT_ZA_SVG from "../../../assets/svg/sort-za.svg?raw";
import CAL_DOWN_SVG from "../../../assets/svg/calendar-arrow-down.svg?raw";
import CAL_UP_SVG from "../../../assets/svg/calendar-arrow-up.svg?raw";

export function persistActiveSort(state: DialogState) {
  chrome.storage.local.set({
    MAP_ACTIVE_SORT: {
      mode: state.activeSortMode,
      nameDir: state.activeNameDir,
      sinceDir: state.activeSinceDir,
    },
  });
}

export function updateActiveSortControls(state: DialogState) {
  const {
    shadow,
    activeSortMode,
    activeNameDir,
    activeSinceDir,
    activeWifiOnly,
  } = state;
  const nameBtn = shadow.getElementById("sort-name");
  const sinceBtn = shadow.getElementById("sort-since");
  if (nameBtn) {
    const icon = nameBtn.querySelector<HTMLElement>(".sort-icon");
    if (icon) {
      render(
        unsafeHTML(
          (activeNameDir === "asc" ? SORT_AZ_SVG : SORT_ZA_SVG).replace(
            "<svg",
            '<svg width="14" height="14"',
          ),
        ),
        icon,
      );
    }
    nameBtn.style.opacity = activeSortMode === "name" ? "1" : "0.45";
    nameBtn.style.fontWeight = activeSortMode === "name" ? "700" : "";
    nameBtn.dataset.tip =
      activeSortMode === "name"
        ? activeNameDir === "asc"
          ? "Name A → Z (click to invert)"
          : "Name Z → A (click to invert)"
        : "Sort by login";
  }
  if (sinceBtn) {
    const icon = sinceBtn.querySelector<HTMLElement>(".sort-icon");
    if (icon) {
      render(
        unsafeHTML(
          (activeSinceDir === "desc" ? CAL_DOWN_SVG : CAL_UP_SVG).replace(
            "<svg",
            '<svg width="14" height="14"',
          ),
        ),
        icon,
      );
    }
    sinceBtn.style.opacity = activeSortMode === "since" ? "1" : "0.45";
    sinceBtn.style.fontWeight = activeSortMode === "since" ? "700" : "";
    sinceBtn.dataset.tip =
      activeSortMode === "since"
        ? activeSinceDir === "desc"
          ? "Newest first (click to invert)"
          : "Oldest first (click to invert)"
        : "Sort by connection time";
  }
  const wifiBtn = shadow.getElementById("active-wifi-toggle");
  if (wifiBtn) {
    wifiBtn.style.opacity = activeWifiOnly ? "1" : "0.45";
    wifiBtn.style.fontWeight = activeWifiOnly ? "700" : "";
    wifiBtn.dataset.tip = activeWifiOnly
      ? "Showing only Wi-Fi users (click to show all)"
      : "Show only Wi-Fi users";
  }
}

export function toggleActiveWifi(state: DialogState) {
  const { shadow, activeCluster } = state;
  state.activeWifiOnly = !state.activeWifiOnly;
  chrome.storage.local.set({
    MAP_ACTIVE_WIFI: state.activeWifiOnly,
  });
  state.activeUsers = sortActiveUsers(
    state.activeWifiOnly
      ? state.wifiUsers
      : [...state.seatedUsers, ...state.wifiUsers],
    state.activeSortMode,
    state.activeNameDir,
    state.activeSinceDir,
  );
  if (activeCluster.id === "active")
    renderActiveList(shadow, state.activeUsers);
  updateActiveSortControls(state);
}

export function toggleActiveSort(state: DialogState, mode: ActiveSortMode) {
  const { shadow, activeCluster } = state;
  if (state.activeSortMode === mode) {
    if (mode === "name") {
      state.activeNameDir = state.activeNameDir === "asc" ? "desc" : "asc";
    } else {
      state.activeSinceDir = state.activeSinceDir === "desc" ? "asc" : "desc";
    }
  } else {
    state.activeSortMode = mode;
  }
  persistActiveSort(state);
  state.activeUsers = sortActiveUsers(
    state.activeUsers,
    state.activeSortMode,
    state.activeNameDir,
    state.activeSinceDir,
  );
  if (activeCluster.id === "active")
    renderActiveList(shadow, state.activeUsers);
  updateActiveSortControls(state);
}
