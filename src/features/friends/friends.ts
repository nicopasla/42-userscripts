import { getConfig } from "../../config.ts";
import { hashLogin } from "../account/account.ts";

const WORKER_URL = "https://api.betterintra.com";

export interface FriendData {
  login: string;
  displayName: string;
  avatar: string | null;
  customAvatar: string | null;
  avatarBg?: string;
  avatarPosX?: number;
  avatarPosY?: number;
  avatarScale?: number;
  level: number;
  grade: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  poolLabel: string | null;
  wallet: number;
  correctionPoints: number;
  lastOnlineTimestamp: number | null;
}

export async function getFriendsList(): Promise<string[]> {
  const raw = await getConfig("FRIENDS_LIST");
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFriendsList(logins: string[]): Promise<void> {
  await chrome.storage.local.set({
    FRIENDS_LIST: JSON.stringify(logins),
  });
}

export async function addFriend(login: string): Promise<void> {
  const list = await getFriendsList();
  const normalized = login.trim().toLowerCase();
  if (list.includes(normalized)) return;
  await saveFriendsList([...list, normalized]);
}

export async function removeFriend(login: string): Promise<void> {
  const list = await getFriendsList();
  await saveFriendsList(list.filter((l) => l !== login.toLowerCase()));
}

export async function isFriend(login: string): Promise<boolean> {
  const list = await getFriendsList();
  return list.includes(login.trim().toLowerCase());
}

const CACHE_KEY = "FRIENDS_DATA_CACHE";
const CACHE_TTL = 30_000;

async function getCachedData(): Promise<{
  data: FriendData[];
  timestamp: number;
} | null> {
  try {
    const raw = (await chrome.storage.local.get(CACHE_KEY)) as Record<
      string,
      unknown
    >;
    const val = raw[CACHE_KEY] as
      | { data: FriendData[]; timestamp: number }
      | undefined;
    if (val && Array.isArray(val.data) && typeof val.timestamp === "number")
      return val;
    return null;
  } catch {
    return null;
  }
}

async function setCachedData(data: FriendData[]): Promise<void> {
  await chrome.storage.local.set({
    [CACHE_KEY]: { data, timestamp: Date.now() },
  });
}

export async function clearFriendsCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY);
}

export async function fetchFriendsData(
  logins: string[],
): Promise<FriendData[]> {
  if (logins.length === 0) return [];

  const token = await getConfig("CLOUD_TOKEN");
  const cloudLogin = await getConfig("CLOUD_LOGIN");
  if (!token || !cloudLogin) return [];

  // Single-login fetches (add friend validation) always go to API
  if (logins.length === 1) {
    try {
      const hashedLogin = await hashLogin(cloudLogin);
      const res = await fetch(
        `${WORKER_URL}/api/v1/private/friends/data?login=${encodeURIComponent(hashedLogin)}&logins=${encodeURIComponent(logins[0])}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 401) {
        await chrome.storage.local.set({ CLOUD_AUTH_FAILED: true });
      }
      return res.ok
        ? (((await res.json()) as { friends?: FriendData[] }).friends ?? [])
        : [];
    } catch {
      return [];
    }
  }

  // Check cache for full list fetches
  const cached = await getCachedData();
  if (
    cached &&
    cached.data.length > 0 &&
    Date.now() - cached.timestamp < CACHE_TTL
  ) {
    return cached.data;
  }

  try {
    const hashedLogin = await hashLogin(cloudLogin);
    const res = await fetch(
      `${WORKER_URL}/api/v1/private/friends/data?login=${encodeURIComponent(hashedLogin)}&logins=${encodeURIComponent(logins.join(","))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const data = (await res.json()) as { friends?: FriendData[] };
      const friends = data.friends ?? [];
      if (friends.length > 0) {
        setCachedData(friends);
        return friends;
      }
      // Fresh fetch returned empty — fall back to last known non-empty data
      if (cached && cached.data.length > 0) return cached.data;
      return [];
    } else if (res.status === 401) {
      await chrome.storage.local.set({ CLOUD_AUTH_FAILED: true });
    }
  } catch (e) {
    console.error("Failed to fetch friends data:", e);
  }

  // On failure, fall back to last known non-empty data if present
  if (cached && cached.data.length > 0) return cached.data;
  return [];
}
