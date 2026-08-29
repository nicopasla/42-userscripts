import type { ClusterInfo, DialogState, ExitArrowDir } from "./context";
import type { ExitConfig } from "../../campus/campus.ts";
import EXIT_SVG from "../../../assets/svg/exit.svg?raw";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface ResolvedExitSign {
  x: number;
  y: number;
  w: number;
  h: number;
  rotationDeg: number;
  label?: string;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DIR_DEG: Record<ExitArrowDir, number> = {
  right: 0,
  up: 270,
  down: 90,
  left: 180,
};

interface ParsedIcon {
  paths: string[];
  width: number;
  height: number;
}

/** Extracts every `<path>` and the `viewBox` from an SVG source imported with `?raw`. */
function parseSvg(svg: string): ParsedIcon | null {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.querySelector("svg");
    const paths = [...(root?.querySelectorAll("path") ?? [])].map((p) =>
      p.getAttribute("d"),
    );
    const vb = (root?.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    if (paths.length === 0 || paths.some((d) => !d) || vb.length < 4)
      return null;
    return { paths: paths as string[], width: vb[2], height: vb[3] };
  } catch {
    return null;
  }
}

const EXIT_ICON = parseSvg(EXIT_SVG);

function toNumber(
  value: number | string | undefined,
  total: number,
  fallback: number,
): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().endsWith("%")) {
    const pct = parseFloat(value);
    if (!Number.isFinite(pct)) return fallback;
    return (pct / 100) * total;
  }
  const n = typeof value === "string" ? parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function resolveExitSigns(
  config: ExitConfig | undefined,
  cluster: ClusterInfo,
  vb: ViewBox,
): ResolvedExitSign[] {
  if (!config) return [];

  const entries =
    config[cluster.id] ??
    config[cluster.name] ??
    config[cluster.id.toLowerCase()] ??
    config[cluster.name.toLowerCase()];
  if (!entries) return [];

  const defaultW = vb.w * 0.03;
  const defaultH = vb.h * 0.045;
  return entries.map((e) => ({
    x: vb.x + toNumber(e.x, vb.w, 0),
    y: vb.y + toNumber(e.y, vb.h, 0),
    w: toNumber(e.w, vb.w, defaultW),
    h: toNumber(e.h, vb.h, defaultH),
    rotationDeg: DIR_DEG[e.dir ?? "up"],
    label: e.label,
  }));
}

export function applyExitSigns(state: DialogState): void {
  const mapArea = state.shadow.getElementById("map-area");
  const svg = mapArea?.querySelector("svg") as SVGSVGElement | null;
  if (!svg || svg.querySelector(".ft-exit-sign")) return;

  const parsed = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
  if (parsed.length < 4) return;
  const vb: ViewBox = {
    x: parsed[0] || 0,
    y: parsed[1] || 0,
    w: parsed[2] || 1200,
    h: parsed[3] || 800,
  };

  const signs = resolveExitSigns(
    state.campusExits ?? undefined,
    state.activeCluster,
    vb,
  );
  if (signs.length === 0) return;

  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "ft-exit-sign");

  for (const sign of signs) {
    if (!EXIT_ICON) continue;
    const scale = sign.w / EXIT_ICON.width;
    const transform = `translate(${sign.x} ${sign.y}) rotate(${sign.rotationDeg}) scale(${scale}) translate(${-EXIT_ICON.width / 2} ${-EXIT_ICON.height / 2})`;
    for (const d of EXIT_ICON.paths) {
      const icon = document.createElementNS(SVG_NS, "path");
      icon.setAttribute("d", d);
      icon.setAttribute("transform", transform);
      g.appendChild(icon);
    }

    if (sign.label) {
      const fontSize = Math.max(7, sign.w * 0.42);
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(sign.x));
      text.setAttribute("y", String(sign.y + sign.w / 2 + fontSize * 1.1));
      text.setAttribute("font-size", String(fontSize));
      text.setAttribute("text-anchor", "middle");
      text.textContent = sign.label;
      g.appendChild(text);
    }
  }

  svg.appendChild(g);
}
