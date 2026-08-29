import { describe, it, expect } from "vitest";
import {
  resolveExitSigns,
  applyExitSigns,
} from "../src/features/clusters/map-dialog/exit-markers";
import type { ExitConfig } from "../src/features/campus/campus.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const VB = { x: 0, y: 0, w: 1000, h: 600 };

const BELGIUM_EXITS = {
  shi: [
    { x: "22%", y: "6%", dir: "left", label: "CHILLZONE" },
    { x: "22%", y: "60%", dir: "left", label: "CHILLZONE" },
  ],
  fu: [
    { x: "80%", y: "15%", dir: "right", label: "CHILLZONE" },
    { x: "80%", y: "56%", dir: "right", label: "CHILLZONE" },
    { x: "90%", y: "10%", dir: "up", label: "MI" },
  ],
  mi: [
    { x: "80%", y: "8%", dir: "up", label: "CHILLZONE" },
    { x: "74%", y: "39%", dir: "right", label: "EXIT" },
    { x: "69%", y: "70%", dir: "down", label: "CHILLZONE" },
  ],
} satisfies ExitConfig;

function makeState(clusterId: string, campusExits?: ExitConfig | null) {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const mapArea = document.createElement("div");
  mapArea.id = "map-area";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 1000 600");
  mapArea.appendChild(svg);
  shadow.appendChild(mapArea);
  return {
    shadow,
    activeCampusId: "12",
    activeCluster: { id: clusterId, name: clusterId },
    campusExits: campusExits ?? null,
  } as never;
}

describe("resolveExitSigns", () => {
  it("resolves percent positions against the viewBox", () => {
    const [sign] = resolveExitSigns(
      BELGIUM_EXITS,
      { id: "mi", name: "mi" },
      VB,
    );
    expect(sign.x).toBeCloseTo(800);
    expect(sign.y).toBeCloseTo(48);
    expect(sign.w).toBeCloseTo(30);
    expect(sign.h).toBeCloseTo(27);
    expect(sign.label).toBeTruthy();
  });

  it("maps dir to a cardinal rotation", () => {
    const entries = [
      ["shi", 180], // left
      ["fu", 0], // right
      ["mi", 270], // up
    ] as const;
    for (const [clusterId, deg] of entries) {
      const [sign] = resolveExitSigns(
        BELGIUM_EXITS,
        { id: clusterId, name: clusterId },
        VB,
      );
      expect(sign.rotationDeg, clusterId).toBe(deg);
    }
  });

  it("resolves every configured exit", () => {
    const signs = resolveExitSigns(
      BELGIUM_EXITS,
      { id: "shi", name: "shi" },
      VB,
    );
    expect(signs.length).toBeGreaterThan(1);
  });

  it("matches clusters by name when the id is numeric", () => {
    const signs = resolveExitSigns(
      BELGIUM_EXITS,
      { id: "20", name: "shi" },
      VB,
    );
    expect(signs.length).toBeGreaterThan(0);
  });

  it("returns nothing for campuses or clusters without markers", () => {
    expect(resolveExitSigns(undefined, { id: "shi", name: "shi" }, VB)).toEqual(
      [],
    );
    expect(
      resolveExitSigns(BELGIUM_EXITS, { id: "zzz", name: "zzz" }, VB),
    ).toEqual([]);
  });
});

describe("applyExitSigns", () => {
  it("renders one icon and label per configured exit", () => {
    const state = makeState("shi", BELGIUM_EXITS);
    applyExitSigns(state);

    const svg = state.shadow.querySelector("svg")!;
    const signs = resolveExitSigns(BELGIUM_EXITS, state.activeCluster, VB);
    expect(svg.querySelectorAll(".ft-exit-sign path").length).toBeGreaterThan(
      0,
    );
    expect(svg.querySelectorAll(".ft-exit-sign text").length).toBe(
      signs.length,
    );
  });

  it("ignores clusters without markers", () => {
    const state = makeState("zzz", BELGIUM_EXITS);
    applyExitSigns(state);
    expect(state.shadow.querySelector(".ft-exit-sign")).toBeNull();
  });

  it("renders nothing when campus has no exit config", () => {
    const state = makeState("shi");
    applyExitSigns(state);
    expect(state.shadow.querySelector(".ft-exit-sign")).toBeNull();
  });
});
