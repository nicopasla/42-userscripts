import { getConfig } from "../../config.ts";

export interface TranscriptEntry {
  cursusLabel: string;
  records: { label: string; sr_id: number }[];
}

interface ClusterDataFile {
  clusters: { id: string; name: string; svg?: string }[];
  transcripts?: TranscriptEntry[];
  definitions: Record<string, unknown>;
  badgeBaseUrl?: string;
  badges?: Record<string, string>;
}

interface CampusManifest {
  campuses: { id: string; name: string }[];
}

export let CLUSTERS: { id: string; name: string; svg?: string }[] = [];

const CAMPUS_BASE = "https://api.betterintra.com/gh/campuses";
const CACHE_PREFIX = "CAMPUS_DATA_";
const MANIFEST_CACHE_KEY = "CAMPUS_MANIFEST";
const CACHE_TTL = 60 * 60 * 1000;

async function resolveCampusFolder(campusId: string): Promise<string> {
  const manifest = await fetchCampusList();
  const campus = manifest.campuses.find((c) => c.id === campusId);
  if (!campus) return campusId;
  return campus.name.toLowerCase().replace(/\s+/g, "-");
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

export async function fetchCampusList(): Promise<CampusManifest> {
  const cached = await chrome.storage.local.get(MANIFEST_CACHE_KEY);
  const cachedData = cached[MANIFEST_CACHE_KEY] as
    | { manifest: CampusManifest; timestamp: number }
    | undefined;
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return cachedData.manifest;
  }
  const res = await fetch(`${CAMPUS_BASE}/campuses.json`);
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
  const cacheKey = `${CACHE_PREFIX}${campusId}`;
  if (!force) {
    const cached = await chrome.storage.local.get(cacheKey);
    const cachedData = cached[cacheKey] as
      | { data: ClusterDataFile; timestamp: number }
      | undefined;
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return cachedData.data;
    }
  }
  const prefix = await resolveCampusFolder(campusId);
  let res = await fetch(`${CAMPUS_BASE}/${prefix}.json`);
  if (!res.ok) res = await fetch(`${CAMPUS_BASE}/${prefix}_clusters.json`);
  if (!res.ok) throw new Error(`Failed to fetch campus data for ${campusId}`);
  const data = (await res.json()) as ClusterDataFile;
  await chrome.storage.local.set({
    [cacheKey]: { data, timestamp: Date.now() },
  });
  return data;
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
