import type { OccupancyEntry, ActiveSortMode } from "./render";
import type { SeatPos } from "./crop";
import { getSvgSlug } from "./cache";
import type { ExitConfig } from "../../campus/campus.ts";

export type {
  ExitConfig,
  ExitSign,
  ExitArrowDir,
} from "../../campus/campus.ts";

export interface ClusterInfo {
  id: string;
  name: string;
  svg?: string;
}

export const WORKER_URL = "https://api.betterintra.com";
export const CLUSTERS_JSON_URL = "https://meta.intra.42.fr/clusters.json";
export const POLL_INTERVAL = 60_000;
export const SEAT_TARGET_PX = 60;

export interface DialogTabsState {
  wired: WeakSet<Element>;
  overflowing: boolean;
  resizeObserver: ResizeObserver | null;
}

export interface DialogTimers {
  poll: ReturnType<typeof setInterval> | null;
  clock: ReturnType<typeof setInterval> | null;
  countdown: ReturnType<typeof setInterval> | null;
}

export interface DialogState {
  shadow: ShadowRoot;
  dialog: HTMLDialogElement;
  tabsState: DialogTabsState;
  timers: DialogTimers;

  campusOptions: { id: string; name: string; timezone?: string }[];
  activeCampusId: string;
  detectedCampus: string;
  currentTheme: string;

  clusters: ClusterInfo[];
  activeCluster: ClusterInfo;
  defaultId: string;
  campusExits: ExitConfig | null;

  zoomLevel: number;
  defaultZoomLevel: number;
  showMarkers: boolean;

  seatPosCache: Map<string, Map<string, SeatPos>>;
  svgViewBoxes: Map<string, { w: number; h: number }>;
  parsedDocs: Map<string, Document>;
  loadId: number;
  retryCount: number;
  lastUpdated: number;

  occupancyCache: Map<string, OccupancyEntry> | null;
  wifiUsers: OccupancyEntry[];
  seatedUsers: OccupancyEntry[];
  activeUsers: OccupancyEntry[];
  flashingSeat: string | null;

  activeSortMode: ActiveSortMode;
  activeNameDir: "asc" | "desc";
  activeSinceDir: "asc" | "desc";
  activeWifiOnly: boolean;
}

export const keyOf = (campusId: string, clusterId: string) =>
  `${campusId}:${clusterId}`;

export function clusterLabel(c: ClusterInfo): string {
  return (
    c.name.trim() ||
    (c.svg ? getSvgSlug(c.svg) : "") ||
    `Cluster ${c.id}`
  ).toUpperCase();
}
