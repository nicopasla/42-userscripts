export { fetchEventTypes } from "../profile/events/events.ts";
export { ensureCampusData, fetchCampusList, CLUSTERS } from "../campus/campus.ts";
import { loadCampusData, CLUSTERS as CAMPUS_CLUSTERS } from "../campus/campus.ts";

export type ScreenDirection = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";

interface RowConfig {
  range: string;
  pos: number[];
  dir: ScreenDirection;
}

interface ManualConfig {
  row: string;
  pos: number[];
  dir: ScreenDirection;
}

interface ClusterDefinition {
  rows?: RowConfig[];
  manual?: ManualConfig[];
  overrides?: Record<string, ScreenDirection>;
}

function rowScreens(
  row: string,
  positions: number[],
  dir: ScreenDirection,
): Record<string, ScreenDirection> {
  return Object.fromEntries(positions.map((n) => [`${row}-p${n}`, dir]));
}

function rowsScreens(
  rows: string[],
  positions: number[],
  dir: ScreenDirection,
): Record<string, ScreenDirection> {
  return Object.fromEntries(
    rows.flatMap((row) => positions.map((n) => [`${row}-p${n}`, dir])),
  );
}

function prefixScreens(
  prefix: string,
  screens: Record<string, ScreenDirection>,
): Record<string, ScreenDirection> {
  return Object.fromEntries(
    Object.entries(screens).map(([id, dir]) => [`${prefix}-${id}`, dir]),
  );
}

const expandRange = (range: string) => {
  const [start, end] = range.split("-");
  const prefix = start[0];
  const startN = parseInt(start.slice(1));
  const endN = parseInt(end.slice(1));
  return Array.from(
    { length: endN - startN + 1 },
    (_, i) => `${prefix}${startN + i}`,
  );
};

const buildScreens = (
  definitions: Record<string, ClusterDefinition>,
): Record<string, ScreenDirection> => {
  const final: Record<string, ScreenDirection> = {};
  Object.entries(definitions).forEach(([clusterName, config]) => {
    config.rows?.forEach((r) => {
      const rows = expandRange(r.range);
      Object.assign(
        final,
        prefixScreens(clusterName, rowsScreens(rows, r.pos, r.dir)),
      );
    });
    config.manual?.forEach((m) => {
      Object.assign(
        final,
        prefixScreens(clusterName, rowScreens(m.row, m.pos, m.dir)),
      );
    });
    if (config.overrides) {
      Object.entries(config.overrides).forEach(([k, v]) => {
        final[`${clusterName}-${k}`] = v;
      });
    }
  });
  return final;
};

export let SCREENS: Record<string, ScreenDirection> = {};

export async function getClusterData(campusId: string): Promise<{
  clusters: { id: string; name: string }[];
  screens: Record<string, ScreenDirection>;
}> {
  if (!campusId) return { clusters: [], screens: {} };
  const data = await loadCampusData(campusId);
  const definitions = (data.definitions ?? {}) as Record<
    string,
    ClusterDefinition
  >;
  CAMPUS_CLUSTERS.length = 0;
  CAMPUS_CLUSTERS.push(...data.clusters);
  SCREENS = buildScreens(definitions);
  return { clusters: data.clusters, screens: SCREENS };
}
