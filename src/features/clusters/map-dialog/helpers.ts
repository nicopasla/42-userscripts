import { normalizeSeatId } from "./seats";
import type { ClusterInfo } from "./context";

export function formatCampusClock(timezone?: string): string {
  if (!timezone) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "";
  }
}

export function findClusterForSeat(
  clusters: { id: string; name: string }[],
  seatId: string,
): { id: string; name: string } | undefined {
  const seat = normalizeSeatId(seatId);
  return clusters.find((c) => {
    const name = normalizeSeatId(c.name.trim());
    return name && seat.startsWith(name);
  });
}

export interface PseudoClusterChange {
  clusters: ClusterInfo[];
  added: boolean;
  removed: boolean;
}

export function applyPseudoCluster(
  clusters: ClusterInfo[],
  id: string,
  name: string,
  present: boolean,
): PseudoClusterChange {
  const hasCluster = clusters.some((c) => c.id === id);
  if (present && !hasCluster) {
    return {
      clusters: [...clusters, { id, name }],
      added: true,
      removed: false,
    };
  }
  if (!present && hasCluster) {
    return {
      clusters: clusters.filter((c) => c.id !== id),
      added: false,
      removed: true,
    };
  }
  return { clusters, added: false, removed: false };
}

export const applyActivePresence = (
  clusters: ClusterInfo[],
  hasActive: boolean,
) => applyPseudoCluster(clusters, "active", "Active", hasActive);
