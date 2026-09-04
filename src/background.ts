import { hashLogin } from "./utils/crypto";
import { getConfig } from "./config";

const WORKER_URL = "https://api.betterintra.com";

const ACTIVATION_HOSTS = [/(^|\.)intra\.42\.fr$/, /^api\.betterintra\.com$/];

function isActivationAllowedUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return ACTIVATION_HOSTS.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

async function syncActionStateForTab(tabId: number, url: string | undefined) {
  const restrict = await getConfig("RESTRICT_ACTIVATION");
  if (!restrict || isActivationAllowedUrl(url)) {
    await chrome.action.enable(tabId);
  } else {
    await chrome.action.disable(tabId);
  }
}

async function syncActionStateForAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id !== undefined) await syncActionStateForTab(tab.id, tab.url);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined || changeInfo.status === "complete") {
    void syncActionStateForTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    void syncActionStateForTab(tabId, tab.url);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  syncDiscord();
  syncDiscordQuiet();
  void syncActionStateForAllTabs();
});

chrome.runtime.onStartup.addListener(() => {
  void syncActionStateForAllTabs();
});

chrome.storage.onChanged.addListener((changes) => {
  if ("RESTRICT_ACTIVATION" in changes) {
    void syncActionStateForAllTabs();
  }
  if ("DISCORD_ENABLED" in changes || "DISCORD_ID" in changes) {
    syncDiscord();
  }
  if ("DISCORD_ID" in changes && !changes.DISCORD_ID.newValue) {
    syncRegistration();
  }
  if ("DISCORD_ENABLED" in changes && !changes.DISCORD_ENABLED.newValue) {
    syncRegistration();
  }
  if (
    "DISCORD_QUIET_ENABLED" in changes ||
    "DISCORD_QUIET_START" in changes ||
    "DISCORD_QUIET_END" in changes
  ) {
    syncDiscordQuiet();
  }
  if ("CLOUD_TOKEN" in changes && changes.CLOUD_TOKEN.newValue) {
    reloadIntraTabs();
  }
});

async function syncRegistration() {
  const store = await chrome.storage.local.get([
    "CLOUD_TOKEN",
    "CLOUD_LOGIN",
    "DISCORD_ENABLED",
    "DISCORD_ID",
  ]);
  const token = String(store.CLOUD_TOKEN || "");
  const cloudLogin = String(store.CLOUD_LOGIN || "");
  if (!token || !cloudLogin) return;

  const discordEnabled = store.DISCORD_ENABLED === true;
  const discordId = String(store.DISCORD_ID || "").trim();
  if (discordEnabled && discordId) return;

  const hashedLogin = await hashLogin(cloudLogin);
  const url = `${WORKER_URL}/api/v1/private/evaluations?login=${encodeURIComponent(hashedLogin)}&action=unregister`;

  try {
    await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    console.warn("syncRegistration: fetch failed");
  }
}

async function syncDiscord() {
  const store = await chrome.storage.local.get([
    "CLOUD_TOKEN",
    "CLOUD_LOGIN",
    "DISCORD_ENABLED",
    "DISCORD_ID",
  ]);
  const token = String(store.CLOUD_TOKEN || "");
  const cloudLogin = String(store.CLOUD_LOGIN || "");
  if (!token || !cloudLogin) return;

  const hashedLogin = await hashLogin(cloudLogin);
  const enabled = store.DISCORD_ENABLED === true;
  const discordId = String(store.DISCORD_ID || "").trim();

  if (enabled && discordId) {
    const url = `${WORKER_URL}/api/v1/private/discord/link?login=${encodeURIComponent(hashedLogin)}`;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discordId }),
      });
    } catch {
      console.warn("syncDiscord: link fetch failed");
    }
  } else if (!discordId) {
    const url = `${WORKER_URL}/api/v1/private/discord/unlink?login=${encodeURIComponent(hashedLogin)}`;
    try {
      await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      console.warn("syncDiscord: unlink fetch failed");
    }
  }
}

async function syncDiscordQuiet() {
  const store = await chrome.storage.local.get([
    "CLOUD_TOKEN",
    "CLOUD_LOGIN",
    "DISCORD_QUIET_ENABLED",
    "DISCORD_QUIET_START",
    "DISCORD_QUIET_END",
  ]);
  const token = String(store.CLOUD_TOKEN || "");
  const cloudLogin = String(store.CLOUD_LOGIN || "");
  if (!token || !cloudLogin) return;

  const hashedLogin = await hashLogin(cloudLogin);
  const url = `${WORKER_URL}/api/v1/private/discord/quiet?login=${encodeURIComponent(hashedLogin)}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quietEnabled: store.DISCORD_QUIET_ENABLED === true,
        quietStart: String(store.DISCORD_QUIET_START || "22:00"),
        quietEnd: String(store.DISCORD_QUIET_END || "08:00"),
        timezoneOffset: new Date().getTimezoneOffset(),
      }),
    });
  } catch {
    console.warn("syncDiscordQuiet: fetch failed");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FT_RELOAD_INTRA_TABS") {
    reloadIntraTabs()
      .catch(() => undefined)
      .finally(sendResponse);
    return true;
  }
  return undefined;
});

async function reloadIntraTabs() {
  const tabs = await chrome.tabs.query({ url: "https://*.intra.42.fr/*" });
  if (tabs.length === 0) {
    const [active] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (active?.id) chrome.tabs.reload(active.id);
    return;
  }
  for (const tab of tabs) {
    if (tab.id) chrome.tabs.reload(tab.id);
  }
}
