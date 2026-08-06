import { SeatPos } from "./crop";

const PROFILE_BASE = "https://profile.intra.42.fr/users";

export interface OccupancyEntry {
  host: string;
  login: string;
  cdn_uri: string;
  begin_at: string;
  end_at: string | null;
}

export function renderWifiList(shadow: ShadowRoot, users: OccupancyEntry[]) {
  const mapArea = shadow.getElementById("map-area");
  if (!mapArea) return;
  mapArea.style.position = "";

  if (users.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className =
      "flex items-center justify-center p-12 text-base-content/50";
    emptyDiv.textContent = "No one on Wi-Fi";
    mapArea.replaceChildren(emptyDiv);
    return;
  }

  const list = document.createElement("div");
  list.style.cssText =
    "display:flex;flex-direction:column;gap:4px;padding:12px;";
  mapArea.replaceChildren(list);

  for (const user of users) {
    const since = new Date(user.begin_at);
    const timeStr = since.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;cursor:pointer;";
    row.addEventListener("click", () => {
      window.open(`${PROFILE_BASE}/${user.login}`, "_blank");
    });
    row.addEventListener("mouseenter", () => {
      row.style.background = "var(--color-base-200)";
    });
    row.addEventListener("mouseleave", () => {
      row.style.background = "";
    });

    const avatar = Object.assign(document.createElement("img"), {
      src: user.cdn_uri,
      alt: user.login,
    });
    avatar.style.cssText =
      "width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;";

    const info = document.createElement("div");
    info.style.cssText = "display:flex;flex-direction:column;min-width:0;";

    const name = document.createElement("span");
    name.textContent = user.login;
    name.style.cssText =
      "font-size:14px;font-weight:600;color:var(--color-base-content);";

    const time = document.createElement("span");
    time.textContent = `since ${timeStr}`;
    time.style.cssText = "font-size:12px;opacity:0.6;";

    info.appendChild(name);
    info.appendChild(time);
    row.appendChild(avatar);
    row.appendChild(info);
    list.appendChild(row);
  }
}

export function renderSeatOverlays(
  shadow: ShadowRoot,
  occupancy: Map<string, OccupancyEntry>,
  seatPosCache: Map<string, SeatPos>,
  svgViewBox: { w: number; h: number },
) {
  const mapArea = shadow.getElementById("map-area");
  if (!mapArea) return;
  const svgEl = mapArea.querySelector("svg");
  if (!svgEl) return;

  const oldOverlay = shadow.getElementById("seat-overlay");
  if (oldOverlay) oldOverlay.remove();

  const svgRect = svgEl.getBoundingClientRect();
  if (svgRect.width === 0 || svgRect.height === 0) return;
  const mapRect = mapArea.getBoundingClientRect();
  const scrollLeft = mapArea.scrollLeft;
  const scrollTop = mapArea.scrollTop;

  const vb = (svgEl.getAttribute("viewBox") || "0 0 1200 800")
    .split(/\s+/)
    .map(Number);
  const vbW = vb[2] || svgRect.width;
  const vbH = vb[3] || svgRect.height;
  const offsetX = vb[0] || 0;
  const offsetY = vb[1] || 0;
  const scaleX = svgRect.width / vbW;
  const scaleY = svgRect.height / vbH;

  const svgById = new Map<string, Element>();
  for (const el of svgEl.querySelectorAll("[id]")) {
    svgById.set(el.getAttribute("id")!, el);
  }

  interface OverlayEntry {
    host: string;
    seat: OccupancyEntry;
    left: number;
    top: number;
    width: number;
    height: number;
    rotationDeg: number;
  }
  const entries: OverlayEntry[] = [];

  for (const [host, seat] of occupancy) {
    const pos = seatPosCache.get(host);
    if (!pos) continue;

    let left: number, top: number, width: number, height: number;
    let rotationDeg = 0;
    const svgSeat = svgById.get(host);
    if (svgSeat) {
      const rect = svgSeat.getBoundingClientRect();
      const w = pos.w * scaleX;
      const h = pos.h * scaleY;
      left = rect.left + rect.width / 2 - mapRect.left - w / 2 + scrollLeft;
      top = rect.top + rect.height / 2 - mapRect.top - h / 2 + scrollTop;
      width = w;
      height = h;
      let netRotation = 0;
      let el: Element | null = svgSeat;
      while (el && el !== svgEl) {
        const tr = el.getAttribute("transform");
        if (tr) {
          const m = tr.match(/rotate\(\s*([\d.-]+)/);
          if (m) netRotation += parseFloat(m[1]) || 0;
        }
        el = el.parentElement;
      }
      rotationDeg = netRotation;
    } else {
      left = (pos.x - offsetX) * scaleX;
      top = (pos.y - offsetY) * scaleY;
      width = pos.w * scaleX;
      height = pos.h * scaleY;
    }
    entries.push({ host, seat, left, top, width, height, rotationDeg });
  }

  const overlay = document.createElement("div");
  overlay.id = "seat-overlay";
  overlay.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";

  const frag = document.createDocumentFragment();
  for (const { host, seat, left, top, width, height, rotationDeg } of entries) {
    const since = new Date(seat.begin_at);
    const timeStr = since.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const a = Object.assign(document.createElement("a"), {
      href: `${PROFILE_BASE}/${seat.login}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "seat-link",
    });
    a.dataset.host = host;
    a.style.cssText = [
      "pointer-events:auto;",
      `left:${left}px;top:${top}px;`,
      `width:${width}px;height:${height}px;`,
      rotationDeg !== 0 ? `transform:rotate(${rotationDeg}deg);` : "",
    ].join("");
    a.setAttribute("data-tip", `${seat.login} - since ${timeStr}`);
    a.setAttribute("data-tip-size", "15px");

    const avatar = Object.assign(document.createElement("img"), {
      src: seat.cdn_uri,
      alt: seat.login,
    });
    a.appendChild(avatar);
    frag.appendChild(a);
  }
  overlay.appendChild(frag);
  mapArea.appendChild(overlay);
}

export function formatTimeAgo(ts: number): string {
  const secs = (Date.now() - ts) / 1000;
  if (secs < 3) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}
