import { render } from "lit-html";
import type { DialogState } from "./context";
import { renderTemplate } from "./template";

export function cleanupDragSuppress(state: DialogState) {
  if (state.tabsState.dragSuppressClick) {
    document.removeEventListener(
      "click",
      state.tabsState.dragSuppressClick,
      true,
    );
    state.tabsState.dragSuppressClick = null;
  }
  if (state.tabsState.dragSuppressTimer !== null) {
    clearTimeout(state.tabsState.dragSuppressTimer);
    state.tabsState.dragSuppressTimer = null;
  }
}

export function wireTabs(state: DialogState) {
  const { shadow, tabsState } = state;
  const el = shadow.querySelector<HTMLElement>(".tabs-scroll");
  if (!el || tabsState.wired.has(el)) return;
  tabsState.wired.add(el);
  el.addEventListener("scroll", () => {
    const fade = shadow.getElementById("tabs-fade");
    if (!fade) return;
    const hasMore = el.scrollWidth - el.clientWidth - el.scrollLeft > 8;
    fade.style.display = hasMore ? "" : "none";
  });

  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
  });

  el.addEventListener("pointermove", (e) => {
    const dx = e.clientX - startX;
    if (dx === 0 || dragging) return;
    if (!el.hasPointerCapture(e.pointerId)) {
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
    }
    dragging = true;
    el.scrollLeft = startScroll - dx;
  });

  const endDrag = () => {
    el.classList.remove("dragging");
    if (dragging) {
      cleanupDragSuppress(state);
      tabsState.dragSuppressClick = (ce: MouseEvent) => {
        ce.preventDefault();
        ce.stopPropagation();
        cleanupDragSuppress(state);
      };
      document.addEventListener("click", tabsState.dragSuppressClick, true);
      tabsState.dragSuppressTimer = setTimeout(
        () => cleanupDragSuppress(state),
        250,
      );
      dragging = false;
    }
  };

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
}

export function updateTabsOverflow(state: DialogState) {
  requestAnimationFrame(() => {
    const el = state.shadow.querySelector<HTMLElement>(".tabs-scroll");
    const fade = state.shadow.getElementById("tabs-fade");
    if (!el) return;
    const hasMore = el.scrollWidth - el.clientWidth - el.scrollLeft > 8;
    if (fade) fade.style.display = hasMore ? "" : "none";
  });
}

export function rerender(state: DialogState) {
  render(renderTemplate(state), state.shadow);
  wireTabs(state);
  updateTabsOverflow(state);
}
