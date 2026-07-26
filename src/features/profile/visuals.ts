import { getConfig } from "../../config.ts";
import { getCloudLogin, fetchUserVisuals } from "../account/account.ts";
import { createSettingsModal } from "./profile.modal.ts";
import { applyThemeToProfileCard } from "./profile-card.ts";
import { applyPublicLogtimeSettings, initLogtime } from "../logtime/logtime.ts";
import {
  AVATAR_SELECTOR,
  BANNER_SELECTOR,
  BACKGROUND_SELECTOR,
} from "./selectors.ts";

export interface VisualUrls {
  avatar: string;
  banner: string;
  bannerMode: string;
  bannerColor?: string;
  background: string;
  backgroundMode: string;
  backgroundColor?: string;
  avatarBg?: string;
  decoration?: string;
  avatarPosX?: number;
  avatarPosY?: number;
  avatarScale?: number;
  theme?: { profileColor?: string } | null;
  logtime?: {
    calendarColor?: string;
    labelsColor?: string;
    emoji?: string;
    emojiDivisor?: string | number;
    emojiRate?: string | number;
  } | null;
}

let isFetching = false;

let historyListenerInstalled = false;

function addToHistory(url: string, history: string[]): string[] {
  if (!url) return history;
  const filtered = history.filter((h) => h !== url);
  return [url, ...filtered].slice(0, 10);
}

function installHistoryListener(): void {
  if (historyListenerInstalled) return;
  historyListenerInstalled = true;

  const URL_KEYS = [
    "PROFILE_IMAGE_URL",
    "PROFILE_BANNER_URL",
    "PROFILE_BACKGROUND_URL",
  ] as const;
  const HISTORY_KEYS = {
    PROFILE_IMAGE_URL: "PROFILE_IMAGE_HISTORY",
    PROFILE_BANNER_URL: "PROFILE_BANNER_HISTORY",
    PROFILE_BACKGROUND_URL: "PROFILE_BACKGROUND_HISTORY",
  } as const;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of URL_KEYS) {
      if (!(key in changes)) continue;
      const newUrl = changes[key].newValue as string | undefined;
      if (!newUrl) continue;
      const historyKey = HISTORY_KEYS[key];
      chrome.storage.local.get(historyKey).then(async (result) => {
        const history = (result[historyKey] as string[]) || [];
        const updated = addToHistory(newUrl, history);
        if (updated !== history) {
          await chrome.storage.local.set({ [historyKey]: updated });
        }
      });
    }
  });
}
let visualCache: VisualUrls | null = null;
let lastUser: string | null = null;
let showingOriginalAvatar = false;
let originalAvatarUrl: string | null = null;

let lastAppliedUser: string | null = null;
let lastAppliedKey: string | null = null;

const getVisualKey = (urls: VisualUrls) =>
  JSON.stringify({
    avatar: urls.avatar || "",
    banner: urls.banner || "",
    bannerMode: urls.bannerMode || "",
    bannerColor: urls.bannerColor || "",
    background: urls.background || "",
    backgroundMode: urls.backgroundMode || "",
    backgroundColor: urls.backgroundColor || "",
    avatarBg: urls.avatarBg || "transparent",
    decoration: urls.decoration || "none",
    avatarPosX: urls.avatarPosX ?? 50,
    avatarPosY: urls.avatarPosY ?? 50,
    avatarScale: urls.avatarScale ?? 100,
    theme: urls.theme || null,
    logtime: urls.logtime || null,
  });

const CACHE_PREFIX = "visuals_cache_";
const pendingRevalidations = new Set<string>();

const getCachedVisuals = async (login: string): Promise<VisualUrls | null> => {
  const result = (await chrome.storage.local.get(
    `${CACHE_PREFIX}${login}`,
  )) as Record<string, VisualUrls>;
  return result[`${CACHE_PREFIX}${login}`] || null;
};

const setCachedVisuals = (login: string, urls: VisualUrls) => {
  chrome.storage.local.set({ [`${CACHE_PREFIX}${login}`]: urls });
};

const revalidateVisuals = async (login: string, cached: VisualUrls) => {
  if (pendingRevalidations.has(login)) return;
  pendingRevalidations.add(login);
  try {
    const fresh = await fetchUserVisuals(login);
    if (!fresh || login !== lastUser) return;
    const freshKey = getVisualKey(fresh);
    const cachedKey = getVisualKey(cached);
    if (freshKey === cachedKey) {
      setCachedVisuals(login, fresh);
      return;
    }
    visualCache = fresh;
    setCachedVisuals(login, fresh);
    if (
      lastAppliedUser === login &&
      lastAppliedKey === freshKey &&
      !needsReapply(fresh)
    )
      return;
    applyImgs(fresh);
    lastAppliedUser = login;
    lastAppliedKey = freshKey;
  } finally {
    pendingRevalidations.delete(login);
  }
};

const hasBackground = (el: HTMLElement | null, url?: string) => {
  if (!url) return true;
  if (!el) return false;
  const urlRe = /url\((["']?)(.*?)\1\)/;
  const inline = el.style.backgroundImage || "";
  const computed = window.getComputedStyle(el).backgroundImage || "";
  const inlineMatch = inline.match(urlRe);
  const computedMatch = computed.match(urlRe);
  return inlineMatch?.[2] === url || computedMatch?.[2] === url;
};

const needsReapply = (urls: VisualUrls) => {
  const avatar = document.querySelector(AVATAR_SELECTOR) as HTMLElement | null;
  const banner = document.querySelector(BANNER_SELECTOR) as HTMLElement | null;
  const background = document.querySelector(
    BACKGROUND_SELECTOR,
  ) as HTMLElement | null;

  if (
    urls?.avatar &&
    !showingOriginalAvatar &&
    !hasBackground(avatar, urls.avatar)
  )
    return true;
  if (urls.avatar && avatar) {
    const pos = avatar.style.getPropertyValue("background-position");
    const size = avatar.style.getPropertyValue("background-size");
    const expectedPos = `${urls.avatarPosX ?? 50}% ${urls.avatarPosY ?? 50}%`;
    const expectedSize = `${urls.avatarScale ?? 100}%`;
    if (pos !== expectedPos || size !== expectedSize) return true;
  }
  if (urls?.banner && !hasBackground(banner, urls.banner)) return true;
  if (urls?.bannerColor && banner) {
    const style = document.getElementById("ft-banner-style");
    const expectedColor = `background-color: ${urls.bannerColor} !important; background-image: none !important;`;
    if (
      !style ||
      style.textContent !== `${BANNER_SELECTOR} { ${expectedColor} }`
    )
      return true;
  }
  if (urls?.background && !hasBackground(background, urls.background))
    return true;
  if (urls?.backgroundColor && background) {
    const style = document.getElementById("ft-bg-style");
    const expectedColor = `background-color: ${urls.backgroundColor} !important; background-image: none !important;`;
    if (
      !style ||
      style.textContent !== `${BACKGROUND_SELECTOR} { ${expectedColor} }`
    )
      return true;
  }
  return false;
};

export const injectCustomStyles = () => {
  if (document.getElementById("ft-profile-host-styles")) return;
  const style = document.createElement("style");
  style.id = "ft-profile-host-styles";
  style.textContent = `
    .bg-ft-gray b,
      .bg-ft-gray span {font-size: 1.2rem !important;font-weight: bold !important;font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;}
      p.text-sm:nth-child(2) {font-size: 1.3rem !important;}
    #profile-modal-host { 
      position: fixed; inset: 0; z-index: 999999; 
      display: flex; align-items: flex-start; justify-content: center;
      pointer-events: auto; padding-top: 12vh;       
    }
    ${AVATAR_SELECTOR} {
      will-change: background-image, transform;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
      opacity: 0 !important;
    }
    ${AVATAR_SELECTOR}[data-modal-listener] {
      position: relative !important;
    }
    ${AVATAR_SELECTOR}[data-modal-listener]::after {
      content: "Edit";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      font-family: system-ui, sans-serif;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    ${AVATAR_SELECTOR}[data-modal-listener]:hover::after {
      opacity: 1;
    }
    ${BANNER_SELECTOR},
    ${BACKGROUND_SELECTOR} {
      will-change: background-image, transform;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
    }
    .bg-mode-fill { background-size: cover !important; background-repeat: no-repeat !important; background-position: center !important; }
    .bg-mode-fit { background-size: contain !important; background-repeat: no-repeat !important; background-position: center !important; }
    .bg-mode-stretch { background-size: 100% 100% !important; background-repeat: no-repeat !important; background-position: center !important; }
    .bg-mode-center { background-size: auto !important; background-repeat: no-repeat !important; background-position: center !important; }
    .bg-mode-tile { background-size: auto !important; background-repeat: repeat !important; background-position: top left !important; }

    .banner-mode-fill { background-size: cover !important; background-repeat: no-repeat !important; background-position: center !important; }
    .banner-mode-fit { background-size: contain !important; background-repeat: no-repeat !important; background-position: center !important; }
    .banner-mode-stretch { background-size: 100% 100% !important; background-repeat: no-repeat !important; background-position: center !important; }
    .banner-mode-center { background-size: auto !important; background-repeat: no-repeat !important; background-position: center !important; }
    .banner-mode-tile { background-size: auto !important; background-repeat: repeat !important; background-position: top left !important; }

    .ft-deco-solid {
      box-shadow: 0 0 0 3px var(--user-color, #00babc) !important;
    }

    html.dark .inline-flex.items-center.rounded.border.shadow-base {
      color: #fff !important;
    }

    html:not(.dark) .inline-flex.items-center.rounded.border.shadow-base {
      color: #fff !important;
    }
  `;
  document.head.appendChild(style);
};

const setStyleForSelector = (id: string, selector: string, cssText: string) => {
  let style = document.getElementById(id);
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = selector ? `${selector} { ${cssText} }` : "";
};

const modeCss: Record<string, string> = {
  fill: "background-size: cover !important; background-repeat: no-repeat !important; background-position: center !important;",
  fit: "background-size: contain !important; background-repeat: no-repeat !important; background-position: center !important;",
  stretch:
    "background-size: 100% 100% !important; background-repeat: no-repeat !important; background-position: center !important;",
  center:
    "background-size: auto !important; background-repeat: no-repeat !important; background-position: center !important;",
  tile: "background-size: auto !important; background-repeat: repeat !important; background-position: top left !important;",
};

export const applyImgs = (urls: VisualUrls | null) => {
  if (!urls) return;

  const avatar = document.querySelector(AVATAR_SELECTOR) as HTMLElement | null;

  if (avatar && !originalAvatarUrl) {
    const inlineStyle = avatar.style.backgroundImage;
    if (
      inlineStyle &&
      inlineStyle !== "none" &&
      !inlineStyle.includes(urls.avatar)
    ) {
      const match = inlineStyle.match(/url\((['"]?)(.*?)\1\)/);
      if (match) originalAvatarUrl = match[2];
    }
    if (!originalAvatarUrl) {
      const computedBg = window.getComputedStyle(avatar).backgroundImage;
      if (
        computedBg &&
        computedBg !== "none" &&
        !computedBg.includes(urls.avatar)
      ) {
        const match = computedBg.match(/url\((['"]?)(.*?)\1\)/);
        if (match) originalAvatarUrl = match[2];
      }
    }
  }

  if (avatar && urls.avatar && !showingOriginalAvatar) {
    avatar.style.setProperty(
      "background-image",
      `url("${urls.avatar}")`,
      "important",
    );
    avatar.style.setProperty(
      "background-color",
      urls.avatarBg || "transparent",
      "important",
    );
    avatar.style.setProperty(
      "background-size",
      `${urls.avatarScale ?? 100}%`,
      "important",
    );
    avatar.style.setProperty(
      "background-position",
      `${urls.avatarPosX ?? 50}% ${urls.avatarPosY ?? 50}%`,
      "important",
    );
  }
  if (avatar && !showingOriginalAvatar) {
    avatar.style.setProperty("opacity", "1", "important");
  }

  if (avatar) {
    avatar.classList.remove("ft-deco-solid");
    const deco = urls.decoration;
    if (deco && deco !== "none") avatar.classList.add(`ft-deco-${deco}`);
  }

  if (urls.banner) {
    const bannerMode = urls.bannerMode || "fill";
    setStyleForSelector(
      "ft-banner-style",
      BANNER_SELECTOR,
      `background-image: url("${urls.banner}") !important; ${modeCss[bannerMode] || modeCss.fill}`,
    );
  } else if (urls.bannerColor) {
    setStyleForSelector(
      "ft-banner-style",
      BANNER_SELECTOR,
      `background-color: ${urls.bannerColor} !important; background-image: none !important;`,
    );
  } else {
    setStyleForSelector("ft-banner-style", BANNER_SELECTOR, "");
  }

  if (urls.background) {
    const bgMode = urls.backgroundMode || "fill";
    setStyleForSelector(
      "ft-bg-style",
      BACKGROUND_SELECTOR,
      `background-image: url("${urls.background}") !important; ${modeCss[bgMode] || modeCss.fill}`,
    );
  } else if (urls.backgroundColor) {
    setStyleForSelector(
      "ft-bg-style",
      BACKGROUND_SELECTOR,
      `background-color: ${urls.backgroundColor} !important; background-image: none !important;`,
    );
  } else {
    setStyleForSelector("ft-bg-style", BACKGROUND_SELECTOR, "");
  }

  if (urls.theme) {
    applyThemeToProfileCard(urls.theme);
  }

  if (urls.logtime) {
    const logtime = urls.logtime;
    initLogtime().then(() => applyPublicLogtimeSettings(logtime));
  }
};

const attachToggleListener = (avatarEl: HTMLElement) => {
  if (avatarEl.dataset.toggleListener) return;
  avatarEl.dataset.toggleListener = "true";
  avatarEl.style.cursor = "pointer";
  avatarEl.title = "Click to view original avatar";
  avatarEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentAvatar = document.querySelector(
      AVATAR_SELECTOR,
    ) as HTMLElement;
    if (!currentAvatar) return;
    if (showingOriginalAvatar) {
      showingOriginalAvatar = false;
      if (visualCache?.avatar) {
        currentAvatar.style.setProperty(
          "background-image",
          `url("${visualCache.avatar}")`,
          "important",
        );
        currentAvatar.style.setProperty(
          "background-color",
          visualCache.avatarBg || "transparent",
          "important",
        );
        currentAvatar.style.setProperty(
          "background-size",
          `${visualCache.avatarScale ?? 100}%`,
          "important",
        );
        currentAvatar.style.setProperty(
          "background-position",
          `${visualCache.avatarPosX ?? 50}% ${visualCache.avatarPosY ?? 50}%`,
          "important",
        );
        currentAvatar.classList.remove("ft-deco-solid");
        const d = visualCache.decoration;
        if (d && d !== "none") currentAvatar.classList.add(`ft-deco-${d}`);
      }
    } else {
      showingOriginalAvatar = true;
      currentAvatar.classList.remove("ft-deco-solid");
      if (originalAvatarUrl) {
        currentAvatar.style.setProperty(
          "background-image",
          `url("${originalAvatarUrl}")`,
          "important",
        );
      }
      currentAvatar.style.setProperty("background-size", "cover", "important");
      currentAvatar.style.setProperty(
        "background-position",
        "center",
        "important",
      );
      currentAvatar.style.setProperty(
        "background-color",
        "transparent",
        "important",
      );
    }
  });
};

export const updateVisuals = async () => {
  const pathParts = location.pathname.split("/").filter((p) => p);
  injectCustomStyles();
  installHistoryListener();

  let avatarEl = document.querySelector(AVATAR_SELECTOR) as HTMLElement;

  let myLogin = await getCloudLogin();
  if (!myLogin) myLogin = "me";

  const targetLogin =
    pathParts[0] === "users" && pathParts[1] ? pathParts[1] : myLogin;

  if (targetLogin !== lastUser) {
    visualCache = null;
    originalAvatarUrl = null;
    showingOriginalAvatar = false;
    lastUser = targetLogin;
    isFetching = false;
    lastAppliedUser = null;
    lastAppliedKey = null;
    if (avatarEl) avatarEl.style.setProperty("opacity", "1", "important");
  }

  if (!avatarEl) {
    let att = 0;
    while (!avatarEl && att < 30) {
      await new Promise((r) => requestAnimationFrame(r));
      avatarEl = document.querySelector(AVATAR_SELECTOR) as HTMLElement;
      att++;
    }
    if (!avatarEl) return;
  }

  if (targetLogin === myLogin) {
    if (!avatarEl.dataset.modalListener) {
      avatarEl.dataset.modalListener = "true";
      avatarEl.style.cursor = "pointer";
      avatarEl.addEventListener("click", (e) => {
        e.stopPropagation();
        showingOriginalAvatar = false;
        createSettingsModal((updatedVisuals) => {
          visualCache = updatedVisuals;
          setCachedVisuals(targetLogin, updatedVisuals);
          applyImgs(visualCache);
          lastAppliedUser = targetLogin;
          lastAppliedKey = getVisualKey(visualCache);
        });
      });
    }
  }

  if (visualCache) {
    if (document.getElementById("profile-modal-host")) return;
    const key = getVisualKey(visualCache);
    const reapply = needsReapply(visualCache);
    if (lastAppliedUser === targetLogin && lastAppliedKey === key && !reapply)
      return;

    applyImgs(visualCache);
    lastAppliedUser = targetLogin;
    lastAppliedKey = key;
    return;
  }

  if (!isFetching) {
    if (targetLogin === myLogin) {
      visualCache = {
        avatar: await getConfig("PROFILE_IMAGE_URL"),
        banner: await getConfig("PROFILE_BANNER_URL"),
        bannerMode: (await getConfig("PROFILE_BANNER_MODE")) || "fill",
        bannerColor: await getConfig("PROFILE_BANNER_COLOR"),
        background: await getConfig("PROFILE_BACKGROUND_URL"),
        backgroundMode: (await getConfig("PROFILE_BACKGROUND_MODE")) || "fill",
        backgroundColor: await getConfig("PROFILE_BACKGROUND_COLOR"),
        avatarBg: await getConfig("PROFILE_AVATAR_BG"),
        decoration: await getConfig("PROFILE_DECORATION"),
        avatarPosX: await getConfig("PROFILE_AVATAR_POSITION_X"),
        avatarPosY: await getConfig("PROFILE_AVATAR_POSITION_Y"),
        avatarScale: await getConfig("PROFILE_AVATAR_SCALE"),
      };

      if (
        !visualCache.avatar &&
        !visualCache.banner &&
        !visualCache.bannerColor &&
        !visualCache.background &&
        !visualCache.backgroundColor
      ) {
        avatarEl.style.setProperty("opacity", "1", "important");
      } else if (!document.getElementById("profile-modal-host")) {
        applyImgs(visualCache);
        lastAppliedUser = targetLogin;
        lastAppliedKey = getVisualKey(visualCache);
      }
    } else {
      const cached = await getCachedVisuals(targetLogin);
      if (
        cached &&
        (cached.avatar ||
          cached.banner ||
          cached.bannerColor ||
          cached.background ||
          cached.backgroundColor ||
          cached.theme ||
          cached.logtime)
      ) {
        visualCache = cached;
        applyImgs(visualCache);
        lastAppliedUser = targetLogin;
        lastAppliedKey = getVisualKey(visualCache);
        if (cached.avatar) attachToggleListener(avatarEl);
        revalidateVisuals(targetLogin, cached);
      } else {
        isFetching = true;
        const fetchForLogin = targetLogin;
        try {
          const cloudUrls = await fetchUserVisuals(targetLogin);

          if (fetchForLogin !== lastUser) return;

          if (
            cloudUrls &&
            (cloudUrls.avatar ||
              cloudUrls.banner ||
              cloudUrls.bannerColor ||
              cloudUrls.background ||
              cloudUrls.backgroundColor ||
              cloudUrls.theme ||
              cloudUrls.logtime)
          ) {
            visualCache = cloudUrls;
            setCachedVisuals(targetLogin, cloudUrls);
            applyImgs(visualCache);
            lastAppliedUser = targetLogin;
            lastAppliedKey = getVisualKey(visualCache);
            if (cloudUrls.avatar) attachToggleListener(avatarEl);
          } else {
            avatarEl.style.setProperty("opacity", "1", "important");
          }
        } finally {
          isFetching = false;
        }
      }
    }
  }
};

const NAV_AVATAR_SELECTOR =
  'img.aspect-square.h-full.w-full[src*="cdn.intra.42.fr"]';
let _navAvatarDone = false;

export async function updateNavAvatar(): Promise<void> {
  if (_navAvatarDone) return;
  const customUrl = await getConfig("PROFILE_IMAGE_URL");

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 20; i++) {
    const img = document.querySelector<HTMLImageElement>(NAV_AVATAR_SELECTOR);
    if (img && !img.dataset.ftNavAvatar) {
      img.style.objectFit = "cover";
      if (customUrl) {
        img.src = customUrl;
      }
      img.dataset.ftNavAvatar = "1";
      _navAvatarDone = true;
      return;
    }
    await wait(250);
  }
}
