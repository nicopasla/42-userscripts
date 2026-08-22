import { SeatPos } from "./crop";
import { SCREENS } from "../clusters.data.ts";

const SEAT_ID_PATTERN = /[a-z]\d+[-_ ]?[ps]\d+$/i;
const DANGEROUS_ATTR = /^on/i;

export function normalizeSeatId(id: string): string {
  return id.toLowerCase().replace(/[-\s_]/g, "");
}

export function getSvgTitle(svgDoc: Document): string {
  return svgDoc.querySelector("svg > title")?.textContent?.trim() || "";
}

export function sanitizeAndParseSeats(svgDoc: Document): Map<string, SeatPos> {
  for (const el of svgDoc.querySelectorAll("*")) {
    const tagName = el.tagName.toLowerCase();
    if (tagName === "script") {
      el.remove();
      continue;
    }
    if (tagName === "use") {
      const href =
        el.getAttribute("href") || el.getAttribute("xlink:href") || "";
      if (!href.startsWith("#")) {
        el.remove();
        continue;
      }
    }
    for (const attr of [...el.attributes]) {
      if (DANGEROUS_ATTR.test(attr.name)) el.removeAttribute(attr.name);
      if (
        (attr.name === "href" || attr.name === "xlink:href") &&
        /^\s*javascript:/i.test(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }

  const seatIds = new Set<string>();
  for (const img of svgDoc.querySelectorAll("image[id]")) {
    seatIds.add(normalizeSeatId(img.getAttribute("id")!));
  }

  const seatMap = new Map<string, SeatPos>();
  for (const el of svgDoc.querySelectorAll("[id]")) {
    const id = el.getAttribute("id")!;
    if (!seatIds.has(normalizeSeatId(id)) && !SEAT_ID_PATTERN.test(id)) {
      continue;
    }
    const key = normalizeSeatId(id);
    if (seatMap.has(key)) continue;
    seatMap.set(key, {
      x: parseFloat(el.getAttribute("x") || "0"),
      y: parseFloat(el.getAttribute("y") || "0"),
      w: parseFloat(el.getAttribute("width") || "30"),
      h: parseFloat(el.getAttribute("height") || "30"),
    });
  }
  return seatMap;
}

export function applyMarkers(container: HTMLElement, visible: boolean) {
  const byNormalizedId = new Map<string, Element>();
  for (const el of container.querySelectorAll("[id]")) {
    const key = normalizeSeatId(el.getAttribute("id")!);
    if (!byNormalizedId.has(key)) byNormalizedId.set(key, el);
  }

  for (const [id, dir] of Object.entries(SCREENS)) {
    const el = byNormalizedId.get(normalizeSeatId(id));
    if (!el?.parentNode) continue;
    if (el.parentNode.querySelector(`.custom-screen[data-for="${id}"]`))
      continue;

    const x = Number(el.getAttribute("x"));
    const y = Number(el.getAttribute("y"));
    const w = Number(el.getAttribute("width")) || 30;
    const h = Number(el.getAttribute("height")) || 30;
    const dirStr = String(dir).toUpperCase();
    if (Number.isNaN(x) || Number.isNaN(y) || dirStr === "NONE") continue;

    const chair = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    chair.setAttribute("class", "custom-screen");
    chair.dataset.for = id;

    const cw = 22,
      ch = 4;
    let cx: number, cy: number, fw: number, fh: number;
    if (dirStr === "UP" || dirStr === "DOWN") {
      fw = cw;
      fh = ch;
      cx = x + w / 2 - cw / 2;
      cy = dirStr === "DOWN" ? y - ch : y + h;
    } else {
      fw = ch;
      fh = cw;
      cx = dirStr === "RIGHT" ? x - ch : x + w;
      cy = y + h / 2 - cw / 2;
    }
    chair.setAttribute("width", String(fw));
    chair.setAttribute("height", String(fh));
    chair.setAttribute("x", String(cx));
    chair.setAttribute("y", String(cy));
    chair.setAttribute("rx", "1");
    Object.assign(chair.style, {
      fill: "var(--color-accent)",
      opacity: "0.9",
      pointerEvents: "none",
      display: visible ? "" : "none",
    });
    const t = el.getAttribute("transform");
    if (t) chair.setAttribute("transform", t);
    el.parentNode.appendChild(chair);
  }
}
