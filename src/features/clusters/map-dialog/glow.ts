import type { DialogState } from "./context";
import { normalizeSeatId } from "./seats";

export function getSeatGlowTarget(
  state: DialogState,
  seatId: string,
): Element | null {
  const { shadow } = state;
  const key = normalizeSeatId(seatId);
  const overlayLink = Array.from(
    shadow.querySelectorAll<HTMLElement>("#seat-overlay .seat-link"),
  ).find((el) => normalizeSeatId(el.dataset.host || "") === key);
  if (overlayLink) return overlayLink;
  const mapArea = shadow.getElementById("map-area");
  const svg = mapArea?.querySelector("svg");
  if (!svg) return null;
  for (const el of svg.querySelectorAll<Element>("[id]")) {
    if (normalizeSeatId(el.getAttribute("id") || "") === key) return el;
  }
  return null;
}

export function clearSeatGlow(state: DialogState) {
  state.flashingSeat = null;
  state.shadow
    .querySelectorAll(".ft-dialog-seat-glow")
    .forEach((n) => n.classList.remove("ft-dialog-seat-glow"));
}

export function applySeatGlow(state: DialogState, seatId: string): boolean {
  const target = getSeatGlowTarget(state, seatId);
  if (!target) return false;
  target.classList.add("ft-dialog-seat-glow");
  return true;
}

export function flashSeat(state: DialogState, seatId: string) {
  const mapArea = state.shadow.getElementById("map-area");
  if (!mapArea) return;
  const svg = mapArea.querySelector("svg");
  if (!svg) return;
  clearSeatGlow(state);
  state.flashingSeat = seatId;
  if (!applySeatGlow(state, seatId)) {
    state.flashingSeat = null;
    return;
  }
  const key = normalizeSeatId(seatId);
  const overlayLink =
    Array.from(
      state.shadow.querySelectorAll<HTMLElement>("#seat-overlay .seat-link"),
    ).find((el) => normalizeSeatId(el.dataset.host || "") === key) || null;
  let scrollTarget: Element | null = overlayLink;
  if (!scrollTarget) {
    for (const el of svg.querySelectorAll<Element>("[id]")) {
      if (normalizeSeatId(el.getAttribute("id") || "") === key) {
        scrollTarget = el;
        break;
      }
    }
  }
  scrollTarget?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
  });
}
