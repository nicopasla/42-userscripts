import { initLogtime } from "./features/logtime/logtime.ts";
import { initClusters } from "./features/clusters/clusters.ts";
import { initProfile } from "./features/profile/profile.ts";
import { initHubSettings } from "./features/hub/hubSettings.ts";
import { initShortcuts } from "./features/shortcuts/shortcuts.ts";
import { initThemeManager, getIsLight } from "./features/profile/theme/theme-manager.ts";
import { initGlobalTooltips } from "./utils/tooltip.ts";
import { ensureCampusData } from "./features/campus/campus.ts";
import { updateNavAvatar } from "./features/profile/visuals.ts";
import { AVATAR_SELECTOR } from "./features/profile/selectors.ts";
import { html, render } from "lit-html";

initThemeManager();
initGlobalTooltips(getIsLight);

{
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("hook.js");
  (document.head || document.documentElement).appendChild(s);
  s.remove();
}

{
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        let target: HTMLElement | null = null;
        if (node.matches?.(AVATAR_SELECTOR)) target = node;
        else target = node.querySelector?.(AVATAR_SELECTOR);
        if (target) {
          target.style.setProperty("opacity", "0", "important");
          obs.disconnect();
          return;
        }
      }
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

setTimeout(() => {
  const el = document.querySelector<HTMLElement>(AVATAR_SELECTOR);
  if (el) el.style.setProperty("opacity", "1", "important");
}, 5000);

/**
 * A map that links feature ID strings to their initialization functions.
 * This prevents the need for a long list of if-statements and makes adding
 * new features cleaner.
 */
const featureInitializers: { [key: string]: () => Promise<void> } = {
  profile: initProfile,
  logtime: initLogtime,
  clusters: initClusters,
  shortcuts: initShortcuts,
};

(function v2Warning() {
  if (window.location.hostname !== "profile.intra.42.fr") return;
  if (window.location.pathname !== "/") return;
  if (sessionStorage.getItem("ft-v2-dismissed") === "1") return;

  const dismiss = () => {
    const el = document.getElementById("ft-v2-warning");
    if (el) el.remove();
    sessionStorage.setItem("ft-v2-dismissed", "1");
  };

  const banner = document.createElement("div");
  banner.id = "ft-v2-warning";

  render(
    html`
      <style>
        #ft-v2-warning {
          position: relative;
          z-index: 999999;
        }
        .ft-v2-bnr {
          background: #ff9800;
          color: #fff;
          padding: 10px 20px;
          text-align: center;
          font-family:
            system-ui,
            -apple-system,
            sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          position: relative;
        }
        .ft-v2-bnr a {
          color: #fff;
          font-weight: 700;
        }
        .ft-v2-dismiss {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: inherit;
          opacity: 0.6;
          line-height: 1;
          padding: 4px 8px;
        }
        .ft-v2-dismiss:hover {
          opacity: 1;
        }
      </style>
      <div class="ft-v2-bnr">
        Better Intra is designed for the
        <strong>v3</strong> profile. You are on the old v2.
        <a href="https://profile.intra.42.fr/v3_early_access">Switch to v3</a>
        <button class="ft-v2-dismiss" @click="${dismiss}" data-tip="Dismiss">
          &times;
        </button>
      </div>
    `,
    banner,
  );

  const tryInject = () => {
    if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      requestAnimationFrame(tryInject);
    }
  };
  tryInject();
})();

(async function runBetterIntra() {
  const oauthParams = new URLSearchParams(window.location.search);
  const oauthToken = oauthParams.get("token");
  const oauthLogin = oauthParams.get("login");
  if (oauthToken && oauthLogin) {
    await chrome.storage.local.set({
      CLOUD_TOKEN: oauthToken,
      CLOUD_LOGIN: oauthLogin,
    });
    await chrome.storage.local.remove("CLOUD_AUTH_FAILED");
    history.replaceState(null, "", window.location.pathname);
    window.opener?.postMessage(
      { type: "42_AUTH_SUCCESS", token: oauthToken, login: oauthLogin },
      window.location.origin,
    );
    window.close();
    return;
  }

  const discordId = oauthParams.get("discord_id");
  const discordUsername = oauthParams.get("discord_username");
  if (discordId) {
    await chrome.storage.local.set({
      DISCORD_ID: discordId,
      DISCORD_ENABLED: true,
      DISCORD_USERNAME: discordUsername || "",
    });
    history.replaceState(null, "", window.location.pathname);
    window.close();
    return;
  }

  const waitForIntra = async () => {
    const target =
      document.getElementById("root") ||
      document.querySelector(AVATAR_SELECTOR) ||
      document.querySelector("body");

    if (target) {
      try {
        // Hub settings are always initialized for the settings page.
        // initHubSettings returns the active feature list.
        const activeScripts = await initHubSettings();

        await ensureCampusData();
        updateNavAvatar();

        // Loop through the user's active scripts and initialize them if they exist in our map.
        for (const scriptId of activeScripts) {
          const init = featureInitializers[scriptId];
          if (init) {
            try {
              await init();
            } catch (e) {
              console.error(`Feature "${scriptId}" failed to initialize:`, e);
            }
          }
        }
      } catch (error) {
        console.error("Error during init of Better Intra :", error);
      }
    } else {
      setTimeout(() => {
        void waitForIntra();
      }, 100);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => waitForIntra());
  } else {
    waitForIntra();
  }
})();
