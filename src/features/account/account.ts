import { BetterIntraConfig, getConfig, CLOUD_SYNC_KEYS } from "../../config.ts";
import type { VisualUrls } from "../profile/visuals.ts";
import { hashLogin } from "../../utils/crypto.ts";
import { showConfirmDialog } from "../../utils/confirm-dialog.ts";

export { hashLogin };

const WORKER_URL = "https://api.betterintra.com";

async function handleAuthResponse(response: Response): Promise<boolean> {
  if (response.status === 401) {
    await chrome.storage.local.set({ CLOUD_AUTH_FAILED: true });
    return false;
  }
  return response.ok;
}

export async function clearAuthFailed(): Promise<void> {
  await chrome.storage.local.remove("CLOUD_AUTH_FAILED");
}

/**
 * Initiates the 42 OAuth login flow by opening a popup window.
 * It listens for a message from the popup to receive the session token upon success.
 * @param onSuccess Optional callback to run after a successful login.
 */
export async function loginWith42(
  onSuccess?: () => void | Promise<void>,
): Promise<void> {
  const extensionFakeCallback = window.location.href;
  const authUrl = `${WORKER_URL}/login?redirect_uri=${encodeURIComponent(extensionFakeCallback)}`;

  const popup = window.open(
    authUrl,
    "42 Authentication",
    "width=600,height=700",
  );

  if (!popup) {
    alert("Popup blocked! Please allow popups for this site.");
    return;
  }

  const WORKER_ORIGIN = new URL(WORKER_URL).origin;
  const isExtension =
    window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "moz-extension:";

  const messageListener = async (event: MessageEvent) => {
    if (
      event.origin !== WORKER_ORIGIN &&
      event.origin !== "https://profile.intra.42.fr" &&
      event.origin !== "https://profile-v3.intra.42.fr"
    )
      return;

    if (event.data && event.data.type === "42_AUTH_SUCCESS") {
      const { token, login } = event.data;

      if (token && login) {
        await chrome.storage.local.set({
          CLOUD_TOKEN: token,
          CLOUD_LOGIN: login,
          PENDING_SETTINGS_RESTORE: true,
        });

        window.removeEventListener("message", messageListener);
        if (pollInterval) clearInterval(pollInterval);
        popup.close();
        if (onSuccess) {
          await onSuccess();
        } else {
          window.location.reload();
        }
      }
    }
  };

  window.addEventListener("message", messageListener);

  let pollInterval: ReturnType<typeof setInterval> | undefined;
  if (isExtension) {
    pollInterval = setInterval(async () => {
      if (!popup.closed) return;
      clearInterval(pollInterval);
      window.removeEventListener("message", messageListener);
      await new Promise((r) => setTimeout(r, 300));
      const savedLogin = await getCloudLogin();
      const savedToken = await getConfig("CLOUD_TOKEN");
      if (savedLogin && savedToken) {
        await chrome.storage.local.set({ PENDING_SETTINGS_RESTORE: true });
        if (onSuccess) await onSuccess();
        else window.location.reload();
      }
    }, 500);
  }
}

/**
 * Retrieves the stored 42 login from local storage.
 * @returns A promise that resolves to the login string or null if not found.
 */
export async function getCloudLogin(): Promise<string | null> {
  return (await getConfig("CLOUD_LOGIN")) || null;
}

/**
 * Tests the connection to the worker by fetching the number of active sessions.
 * @returns A promise that resolves to the number of active sessions, or 0 on failure.
 */
export async function testCloudConnection(): Promise<number> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return 0;

  try {
    const hashedLogin = await hashLogin(login);
    const response = await fetch(
      `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!(await handleAuthResponse(response))) return 0;
    const data = (await response.json()) as any;
    return data.activeSessions ?? 0;
  } catch (error) {
    console.error("Cloud connection test failed:", error);
    return 0;
  }
}

/**
 * Gathers all local settings (except cloud credentials) and pushes them to the cloud.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function syncToCloud(): Promise<boolean> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return false;

  try {
    const settings: Partial<BetterIntraConfig> = {};

    for (const key of CLOUD_SYNC_KEYS) {
      (settings as Record<string, unknown>)[key] = await getConfig(key);
    }

    const hashedLogin = await hashLogin(login);
    const response = await fetch(
      `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      },
    );
    const success = await handleAuthResponse(response);
    if (success) {
      await chrome.storage.local.set({ LAST_CLOUD_SYNC: Date.now() });
    }
    return success;
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return false;
  }
}

/**
 * A specialized sync function to quickly update only the user's visual settings.
 * @param visuals An object containing URLs and modes for profile visuals.
 */
export async function syncMyVisuals(visuals: {
  avatar: string;
  banner: string;
  bannerMode?: string;
  bannerColor?: string;
  background: string;
  backgroundMode?: string;
  backgroundColor?: string;
  avatarBg?: string;
  decoration?: string;
  avatarPosX?: number;
  avatarPosY?: number;
  avatarScale?: number;
  badgeBg?: string;
}): Promise<void> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return;

  try {
    const hashedLogin = await hashLogin(login);
    const res = await fetch(
      `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            PROFILE_IMAGE_URL: visuals.avatar,
            PROFILE_BANNER_URL: visuals.banner,
            PROFILE_BANNER_MODE: visuals.bannerMode || "fill",
            PROFILE_BANNER_COLOR: visuals.bannerColor || "",
            PROFILE_BACKGROUND_URL: visuals.background,
            PROFILE_BACKGROUND_MODE: visuals.backgroundMode || "fill",
            PROFILE_BACKGROUND_COLOR: visuals.backgroundColor || "",
            PROFILE_AVATAR_BG: visuals.avatarBg || "transparent",
            PROFILE_DECORATION: visuals.decoration || "none",
            PROFILE_AVATAR_POSITION_X: visuals.avatarPosX ?? 50,
            PROFILE_AVATAR_POSITION_Y: visuals.avatarPosY ?? 50,
            PROFILE_AVATAR_SCALE: visuals.avatarScale ?? 100,
            PROFILE_BADGE_BG: visuals.badgeBg || "",
            PROFILE_IMAGE_HISTORY: await getConfig("PROFILE_IMAGE_HISTORY"),
            PROFILE_BANNER_HISTORY: await getConfig("PROFILE_BANNER_HISTORY"),
            PROFILE_BACKGROUND_HISTORY: await getConfig(
              "PROFILE_BACKGROUND_HISTORY",
            ),
          },
        }),
      },
    );
    await handleAuthResponse(res);
  } catch (e) {
    console.error("Cloud Quick Sync Error:", e);
  }
}

/**
 * Fetches the public visual settings for a given user login.
 * @param login The target user's 42 login.
 * @returns A promise that resolves to the user's visual settings, or null on failure.
 */
export async function fetchUserVisuals(
  login: string,
): Promise<VisualUrls | null> {
  try {
    const hashedTarget = await hashLogin(login);
    const response = await fetch(
      `${WORKER_URL}/api/v1/public/visuals?login=${encodeURIComponent(hashedTarget)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as Record<string, unknown>;

    return {
      avatar: String(data.avatar || ""),
      banner: String(data.banner || ""),
      bannerMode: String(data.bannerMode || "fill"),
      bannerColor: String(data.bannerColor || ""),
      background: String(data.background || ""),
      backgroundMode: String(data.backgroundMode || "fill"),
      backgroundColor: String(data.backgroundColor || ""),
      avatarBg: String(data.avatarBg || "transparent"),
      decoration: String(data.decoration || "none"),
      avatarPosX: Number(data.avatarPosX ?? 50),
      avatarPosY: Number(data.avatarPosY ?? 50),
      avatarScale: Number(data.avatarScale ?? 100),
      badgeBg: String(data.badgeBg || ""),
      theme: (data.theme as { profileColor?: string }) || null,
      logtime: (data.logtime as Record<string, unknown>) || null,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Fetches the current user's settings from the cloud.
 * @returns A promise that resolves to a partial config object, or null on failure.
 */
export async function fetchMySettings(): Promise<Partial<BetterIntraConfig> | null> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return null;

  try {
    const hashedLogin = await hashLogin(login);
    const response = await fetch(
      `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!(await handleAuthResponse(response))) return null;
    const data = (await response.json()) as any;
    const settings = data.settings || {};
    if (data.discordId) {
      (settings as Record<string, unknown>).DISCORD_ID = data.discordId;
    }
    if (data.discordUsername) {
      (settings as Record<string, unknown>).DISCORD_USERNAME =
        data.discordUsername;
    }
    return settings as Partial<BetterIntraConfig>;
  } catch (error) {
    console.error("[fetchMySettings] error:", error);
    return null;
  }
}

/**
 * Logs the user out by deleting the current session from the worker and clearing local credentials.
 * @returns A promise that resolves to true on success.
 */
export async function logoutCloud(): Promise<boolean> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");

  if (login && token) {
    try {
      const hashedLogin = await hashLogin(login);
      await fetch(
        `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (e) {
      console.error("Failed to notify worker of logout", e);
    }
  }

  await chrome.storage.local.remove([
    "CLOUD_TOKEN",
    "CLOUD_LOGIN",
    "CLOUD_AUTH_FAILED",
  ]);
  return true;
}

/**
 * Sends a request to the worker to wipe all cloud data associated with the user's account.
 * @returns A promise that resolves to true on success, false on failure.
 */
export async function wipeAllCloudData(): Promise<boolean> {
  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return false;

  try {
    const hashedLogin = await hashLogin(login);
    const response = await fetch(
      `${WORKER_URL}/api/v1/private/settings?login=${encodeURIComponent(hashedLogin)}&all=true`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (response.ok) {
      await chrome.storage.local.remove([
        "CLOUD_TOKEN",
        "CLOUD_LOGIN",
        "CLOUD_AUTH_FAILED",
      ]);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Wipe cloud data failed:", error);
    return false;
  }
}

/**
 * Applies a set of settings from the cloud to the local storage.
 * @param cloudData A partial configuration object from the cloud.
 */
export async function applyCloudSettings(
  cloudData: Partial<BetterIntraConfig>,
): Promise<void> {
  const dataToSave: Partial<BetterIntraConfig> = {};

  for (const key of CLOUD_SYNC_KEYS) {
    if (key in cloudData) {
      (dataToSave as Record<string, unknown>)[key] = (
        cloudData as Record<string, unknown>
      )[key];
    }
  }

  if (Object.keys(dataToSave).length > 0) {
    await chrome.storage.local.set(dataToSave as Record<string, unknown>);
  }
}

/**
 * Prompts the user to restore their cloud settings after a fresh 42 connect.
 * Triggered once per connect via the PENDING_SETTINGS_RESTORE flag.
 */
export async function maybePromptRestore(): Promise<void> {
  const pending = (await chrome.storage.local.get(
    "PENDING_SETTINGS_RESTORE",
  )) as Record<string, unknown>;
  if (!pending.PENDING_SETTINGS_RESTORE) return;
  await chrome.storage.local.remove("PENDING_SETTINGS_RESTORE");

  const login = await getCloudLogin();
  const token = await getConfig("CLOUD_TOKEN");
  if (!login || !token) return;

  const settings = await fetchMySettings();
  if (!settings) return;

  const hasData = Object.entries(settings).some(
    ([k, v]) =>
      k !== "CLOUD_TOKEN" && k !== "CLOUD_LOGIN" && v != null && v !== "",
  );
  if (
    hasData &&
    (await showConfirmDialog({
      message: "Cloud backup found. Restore your settings?",
      confirmLabel: "Restore",
      cancelLabel: "Cancel",
    }))
  ) {
    await applyCloudSettings(settings);
    window.location.reload();
  }
}
