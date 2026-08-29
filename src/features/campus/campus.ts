import { getConfig } from "../../config.ts";

export interface TranscriptEntry {
  cursusLabel: string;
  records: { label: string; sr_id: number }[];
}

export type ExitArrowDir = "up" | "right" | "down" | "left";

export interface ExitSign {
  x: number | string;
  y: number | string;
  w?: number | string;
  h?: number | string;
  dir?: ExitArrowDir;
  label?: string;
}

export type ExitConfig = Record<string, ExitSign[]>;

interface ClusterDataFile {
  clusters: { id: string; name: string; svg?: string }[];
  transcripts?: TranscriptEntry[];
  definitions: Record<string, unknown>;
  exits?: ExitConfig;
  badgeBaseUrl?: string;
  badges?: Record<string, string>;
}

interface CampusManifest {
  campuses: { id: string; name: string; timezone?: string }[];
}

export let CLUSTERS: { id: string; name: string; svg?: string }[] = [];

const CAMPUS_BASE = "https://api.betterintra.com/gh/campuses";
const CACHE_PREFIX = "CAMPUS_DATA_";
const MANIFEST_CACHE_KEY = "CAMPUS_MANIFEST_V2";
const CACHE_TTL = 60 * 60 * 1000;
const inFlightLoads = new Map<string, Promise<ClusterDataFile>>();

async function resolveCampusFolder(
  campusId: string,
  force?: boolean,
): Promise<string> {
  const manifest = await fetchCampusList(force);
  const campus = manifest.campuses.find((c) => c.id === campusId);
  if (!campus) return campusId;
  return campus.name.toLowerCase().replace(/\s+/g, "-");
}

async function resolveCampusId(
  campusId: string,
  force?: boolean,
): Promise<string> {
  if (campusId) return campusId;
  const manifest = await fetchCampusList(force);
  for (const campus of manifest.campuses) {
    const prefix = campus.name.toLowerCase().replace(/\s+/g, "-");
    const res = await fetch(`${CAMPUS_BASE}/${prefix}.json`, {
      cache: force ? "no-store" : undefined,
    });
    if (res.ok) return campus.id;
  }
  return "";
}

let campusListenerInstalled = false;

function installCampusDetectedListener(): void {
  if (campusListenerInstalled) return;
  campusListenerInstalled = true;

  document.addEventListener("42_CAMPUS_DETECTED", async (e) => {
    if (location.pathname.includes("/users/")) return;
    const campusId = (e as CustomEvent).detail as string;
    await chrome.storage.local.set({
      CLUSTERS_CAMPUS: campusId,
    });
    if (CLUSTERS.length === 0) {
      try {
        const data = await loadCampusData(campusId);
        CLUSTERS = data.clusters;
      } catch {}
    }
  });
}

export async function fetchCampusList(
  force?: boolean,
): Promise<CampusManifest> {
  const cached = await chrome.storage.local.get(MANIFEST_CACHE_KEY);
  const cachedData = cached[MANIFEST_CACHE_KEY] as
    | { manifest: CampusManifest; timestamp: number }
    | undefined;
  if (!force && cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.manifest;
  }
  const res = await fetch(`${CAMPUS_BASE}/campuses.json`, {
    cache: force ? "no-store" : undefined,
  });
  if (!res.ok) throw new Error("Failed to fetch campus list");
  const manifest = (await res.json()) as CampusManifest;
  await chrome.storage.local.set({
    [MANIFEST_CACHE_KEY]: { manifest, timestamp: Date.now() },
  });
  return manifest;
}

export async function loadCampusData(
  campusId: string,
  force?: boolean,
): Promise<ClusterDataFile> {
  const resolvedId = await resolveCampusId(campusId, force);
  if (!resolvedId) throw new Error("No campus data available");
  const cacheKey = `${CACHE_PREFIX}${resolvedId}`;
  if (!force) {
    const cached = await chrome.storage.local.get(cacheKey);
    const cachedData = cached[cacheKey] as
      | { data: ClusterDataFile; timestamp: number }
      | undefined;
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data;
    }
  }
  const existing = force ? undefined : inFlightLoads.get(cacheKey);
  if (existing) return existing;
  const load = (async () => {
    const prefix = await resolveCampusFolder(resolvedId, force);
    const res = await fetch(`${CAMPUS_BASE}/${prefix}.json`, {
      cache: force ? "no-store" : undefined,
    });
    if (!res.ok)
      throw new Error(`Failed to fetch campus data for ${resolvedId}`);
    const data = (await res.json()) as ClusterDataFile;
    await chrome.storage.local.set({
      [cacheKey]: { data, timestamp: Date.now() },
    });
    return data;
  })().finally(() => {
    if (!force) inFlightLoads.delete(cacheKey);
  });
  if (!force) inFlightLoads.set(cacheKey, load);
  return force ? await load : load;
}

export async function clearCampusConfigCache(campusId: string): Promise<void> {
  await chrome.storage.local.remove([
    `${CACHE_PREFIX}${campusId}`,
    MANIFEST_CACHE_KEY,
  ]);
}

export async function ensureCampusData(): Promise<void> {
  installCampusDetectedListener();

  const campus = await getConfig("CLUSTERS_CAMPUS");
  if (campus && campus !== "") {
    if (CLUSTERS.length === 0) {
      try {
        const data = await loadCampusData(campus);
        CLUSTERS = data.clusters;
      } catch {}
    }
  }
}
