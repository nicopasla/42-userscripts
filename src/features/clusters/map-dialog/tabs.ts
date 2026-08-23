import { render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { clusterLabel, type DialogState } from "./context";
import { renderTemplate } from "./template";
import { normalizeSeatId } from "./seats";
import CHEVRON_DOWN_SVG from "../../../assets/svg/chevron-down.svg?raw";

const OVERFLOW_TOLERANCE = 1;

function clusterCountLabel(
  state: DialogState,
  clusterId: string,
): string | null {
  const prefix = `${state.activeCampusId}:`;
  if (clusterId === "active") {
    return state.activeUsers.length > 0
      ? String(state.activeUsers.length)
      : null;
  }
  const seats = state.seatPosCache.get(prefix + clusterId);
  if (!seats || seats.size === 0) return null;
  let taken = 0;
  if (state.occupancyCache) {
    for (const host of state.occupancyCache.keys()) {
      if (host.startsWith("wifi-")) continue;
      if (seats.has(normalizeSeatId(host))) taken++;
    }
  }
  return `${taken}/${seats.size}`;
}

function measureTabsOverflow(state: DialogState): boolean {
  const host = state.shadow.querySelector<HTMLElement>(".clusters-tabs-host");
  if (!host || host.clientWidth === 0 || state.clusters.length === 0)
    return false;
  const probe = document.createElement("div");
  probe.className = "tabs tabs-border border-accent";
  probe.style.cssText =
    "position:absolute;top:0;left:-9999px;visibility:hidden;white-space:nowrap;display:flex;width:max-content;";
  for (const c of state.clusters) {
    const item = document.createElement("span");
    item.className = "tab font-bold text-xs px-4 whitespace-nowrap";
    item.textContent = clusterLabel(c);
    const count = clusterCountLabel(state, c.id);
    if (count) {
      const num = document.createElement("span");
      num.textContent = count;
      num.style.cssText =
        "font-weight:400;opacity:0.55;font-size:11px;margin-left:6px;";
      item.appendChild(num);
    }
    probe.appendChild(item);
  }
  host.appendChild(probe);
  const overflows = probe.scrollWidth - host.clientWidth > OVERFLOW_TOLERANCE;
  probe.remove();
  return overflows;
}

export function renderTabsRegion(state: DialogState) {
  const host = state.shadow.querySelector<HTMLElement>(".clusters-tabs-host");
  if (!host) return;
  const { clusters, activeCluster, tabsState } = state;
  host.replaceChildren();
  if (!tabsState.overflowing) {
    const tabs = document.createElement("div");
    tabs.className = "tabs tabs-border border-accent tabs-scroll";
    tabs.style.cssText = "flex:1 1 auto;min-width:0;";
    for (const c of clusters) {
      const btn = document.createElement("button");
      btn.className = `tab font-bold text-xs px-4 whitespace-nowrap${
        c.id === activeCluster.id ? " tab-active" : ""
      }`;
      btn.dataset.clusterId = c.id;
      btn.dataset.clusterName = clusterLabel(c);
      btn.textContent = clusterLabel(c);
      tabs.appendChild(btn);
    }
    host.appendChild(tabs);
    return;
  }
  const details = document.createElement("details");
  details.className = "dropdown dropdown-end";
  const summary = document.createElement("summary");
  summary.className =
    "clusters-nav-summary btn btn-sm btn-ghost gap-1.5 list-none";
  summary.dataset.tip = "Select cluster";
  summary.dataset.tipSize = "14px";
  const label = document.createElement("span");
  label.className =
    "clusters-nav-summary-label text-xs font-semibold uppercase tracking-wide whitespace-nowrap";
  label.textContent = clusterLabel(activeCluster);
  const chevron = document.createElement("span");
  chevron.className =
    "clusters-nav-chevron size-3 flex-shrink-0 flex items-center justify-center";
  render(
    unsafeHTML(CHEVRON_DOWN_SVG.replace("<svg", '<svg width="12" height="12"')),
    chevron,
  );
  summary.appendChild(label);
  summary.appendChild(chevron);
  const list = document.createElement("ul");
  list.className =
    "menu menu-sm dropdown-content z-50 mt-2 max-h-72 overflow-auto rounded-box bg-base-100 p-1 shadow-xl";
  list.style.cssText = "width:max-content;min-width:13rem;max-width:16rem;";
  for (const c of clusters) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `whitespace-nowrap${
      c.id === activeCluster.id ? " menu-active" : ""
    }`;
    btn.dataset.clusterId = c.id;
    btn.dataset.clusterName = clusterLabel(c);
    btn.textContent = clusterLabel(c);
    li.appendChild(btn);
    list.appendChild(li);
  }
  details.appendChild(summary);
  details.appendChild(list);
  host.appendChild(details);
}

export function wireTabs(state: DialogState) {
  const { shadow, tabsState } = state;
  const host = shadow.querySelector<HTMLElement>(".clusters-tabs-host");
  if (!host || tabsState.wired.has(host)) return;
  tabsState.wired.add(host);
  if (tabsState.resizeObserver) {
    tabsState.resizeObserver.disconnect();
    tabsState.resizeObserver = null;
  }
  tabsState.resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      const overflowing = measureTabsOverflow(state);
      if (overflowing === tabsState.overflowing) return;
      tabsState.overflowing = overflowing;
      renderTabsRegion(state);
    });
  });
  tabsState.resizeObserver.observe(host);
}

export function updateTabsOverflow(state: DialogState) {
  requestAnimationFrame(() => {
    const overflowing = measureTabsOverflow(state);
    if (overflowing === state.tabsState.overflowing) return;
    state.tabsState.overflowing = overflowing;
    renderTabsRegion(state);
  });
}

export function rerender(state: DialogState) {
  render(renderTemplate(state), state.shadow);
  wireTabs(state);
  renderTabsRegion(state);
  updateTabsOverflow(state);
}
