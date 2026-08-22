import type { DialogState } from "./context";
import { clusterLabel } from "./context";
import { formatCampusClock } from "./helpers";
import { updateTabsOverflow, wireTabs } from "./tabs";

export function rebuildHeader(state: DialogState) {
  const { shadow, clusters, activeCluster } = state;
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
    const options = clusters.some((c) => c.id === "active")
      ? clusters
      : [...clusters, { id: "active", name: "Active" }];
    defSel.replaceChildren(
      ...options.map((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = clusterLabel(c);
        opt.selected = c.id === activeCluster.id;
        return opt;
      }),
    );
  }
  wireTabs(state);
  updateTabsOverflow(state);
}

export function updateDefaultSelect(state: DialogState) {
  const row = state.shadow.getElementById(
    "default-cluster-row",
  ) as HTMLElement | null;
  if (!row) return;
  const ownCampus =
    !state.detectedCampus || state.activeCampusId === state.detectedCampus;
  row.style.display = ownCampus ? "" : "none";
}

export function updateCampusTime(state: DialogState) {
  const el = state.shadow.getElementById("campus-time");
  if (!el) return;
  const tz = state.campusOptions.find(
    (o) => o.id === state.activeCampusId,
  )?.timezone;
  if (!tz) {
    el.style.display = "none";
    return;
  }
  const text = state.shadow.getElementById("campus-time-text");
  if (text) text.textContent = formatCampusClock(tz);
  el.style.display = "flex";
}
