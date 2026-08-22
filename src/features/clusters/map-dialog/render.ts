import { SeatPos } from "./crop";
import { normalizeSeatId } from "./seats";

const PROFILE_BASE = "https://profile.intra.42.fr/users";

export interface OccupancyEntry {
  host: string;
  login: string;
  cdn_uri: string;
  begin_at: string;
  end_at: string | null;
}

export type ActiveSortMode = "name" | "since";

export const ACTIVE_SORT_DEFAULT = {
  mode: "name",
  nameDir: "asc",
  sinceDir: "desc",
} as const;

export function sortActiveUsers(
  list: OccupancyEntry[],
  mode: ActiveSortMode,
  nameDir: "asc" | "desc",
  sinceDir: "asc" | "desc",
): OccupancyEntry[] {
  return [...list].sort((a, b) => {
    if (mode === "since") {
      const at = new Date(a.begin_at).getTime();
      const bt = new Date(b.begin_at).getTime();
      const diff = at - bt;
      const result = sinceDir === "asc" ? diff : -diff;
      return result || a.login.localeCompare(b.login);
    }
    const cmp = a.login.localeCompare(b.login);
    return nameDir === "asc" ? cmp : -cmp;
  });
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
    const key = normalizeSeatId(el.getAttribute("id")!);
    if (!svgById.has(key)) svgById.set(key, el);
  }

  interface OverlayEntry {
    host: string;
    seat: OccupancyEntry;
    left: number;
    top: number;
    width: number;
    height: number;
    rotationDeg: number;
    round: boolean;
  }
  const entries: OverlayEntry[] = [];

  for (const [host, seat] of occupancy) {
    const hostKey = normalizeSeatId(host);
    const pos = seatPosCache.get(hostKey);
    if (!pos) continue;

    let left: number, top: number, width: number, height: number;
    let rotationDeg = 0;
    let round = false;
    const svgSeat = svgById.get(hostKey);
    if (svgSeat) {
      round =
        svgSeat.tagName.toLowerCase() === "circle" ||
        (svgSeat.getAttribute("clip-path") || "").includes("circle");
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
    entries.push({
      host: hostKey,
      seat,
      left,
      top,
      width,
      height,
      rotationDeg,
      round,
    });
  }

  const overlay = document.createElement("div");
  overlay.id = "seat-overlay";
  overlay.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";

  const frag = document.createDocumentFragment();
  for (const {
    host,
    seat,
    left,
    top,
    width,
    height,
    rotationDeg,
    round,
  } of entries) {
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
    a.style.cssText = [
      "pointer-events:auto;",
      `left:${left}px;top:${top}px;`,
      `width:${width}px;height:${height}px;`,
      rotationDeg !== 0 ? `transform:rotate(${rotationDeg}deg);` : "",
      round ? "border-radius:50%;" : "",
    ].join("");
    if (round) a.dataset.round = "true";
    a.dataset.host = host;
    a.setAttribute("data-tip", `${seat.login} - since ${timeStr}`);
    a.setAttribute("data-tip-size", "15px");

    const avatar = Object.assign(document.createElement("img"), {
      src: seat.cdn_uri,
      alt: seat.login,
    });
    if (round) avatar.style.borderRadius = "50%";
    a.appendChild(avatar);
    frag.appendChild(a);
  }
  overlay.appendChild(frag);
  mapArea.appendChild(overlay);
}

export function renderActiveList(shadow: ShadowRoot, users: OccupancyEntry[]) {
  const mapArea = shadow.getElementById("map-area");
  if (!mapArea) return;
  mapArea.style.position = "";

  if (users.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className =
      "flex items-center justify-center p-12 text-base-content/50";
    emptyDiv.textContent = "No one connected";
    mapArea.replaceChildren(emptyDiv);
    return;
  }

  const grid = document.createElement("div");
  grid.style.cssText = [
    "display:grid;",
    "grid-template-columns:repeat(auto-fill,minmax(120px,1fr));",
    "gap:8px;",
    "padding:72px 16px 16px;",
    "align-content:start;",
  ].join("");

  for (const user of users) {
    const card = Object.assign(document.createElement("a"), {
      href: `${PROFILE_BASE}/${user.login}`,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    card.style.cssText = [
      "display:flex;",
      "flex-direction:column;",
      "align-items:center;",
      "gap:4px;",
      "padding:10px 8px;",
      "border-radius:10px;",
      "background:var(--color-base-200);",
      "text-align:center;",
      "text-decoration:none;",
      "min-width:0;",
    ].join("");
    card.addEventListener("mouseenter", () => {
      card.style.background = "var(--color-base-300)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.background = "var(--color-base-200)";
    });

    const avatar = Object.assign(document.createElement("img"), {
      src: user.cdn_uri,
      alt: user.login,
    });
    avatar.style.cssText =
      "width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;";

    const login = document.createElement("span");
    login.textContent = user.login;
    login.style.cssText =
      "font-size:13px;font-weight:600;color:var(--color-base-content);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

    const since = document.createElement("span");
    since.className = "badge badge-sm";
    since.textContent = formatTimeAgo(new Date(user.begin_at).getTime());
    since.style.cssText = [
      "max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",
      "background:#fff;color:#000;border-color:#fff;",
    ].join("");
    since.setAttribute(
      "data-tip",
      `since ${new Date(user.begin_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );

    card.appendChild(avatar);
    card.appendChild(login);
    card.appendChild(since);
    grid.appendChild(card);
  }
  mapArea.replaceChildren(grid);
}

export function formatTimeAgo(ts: number): string {
  const secs = (Date.now() - ts) / 1000;
  if (secs < 3) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}
