import { gmGetValue, gmSetValue, gmDeleteValue } from "../lib/gm.ts";
import "../assets/style.css";

export async function initProfile() {
  "use strict";

  const isBaseOwnProfile =
    location.origin === "https://profile-v3.intra.42.fr" &&
    location.pathname === "/";

  type ProfileSettings = {
    img: string | null;
    bg: string | null;
  };

  const getSettings = async (): Promise<ProfileSettings> => ({
    img: await gmGetValue<string | null>("PROFILE_IMAGE_URL", null),
    bg: await gmGetValue<string | null>("PROFILE_BACKGROUND_URL", null),
  });

  const isValidUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url.trim());
      if (!["http:", "https:"].includes(u.protocol)) return false;
      if (!u.hostname) return false;
      return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(u.pathname);
    } catch {
      return false;
    }
  };

  const findAvatarEl = (): HTMLElement | null =>
    document.querySelector(
      'div.rounded-full[style*="background-image"]',
    ) as HTMLElement | null;

  const findBannerEl = (): HTMLElement | null =>
    document.querySelector(
      "div.border-neutral-600.bg-ft-gray\\/50",
    ) as HTMLElement | null;

  const applyAvatar = (el: HTMLElement | null, url: string) => {
    if (!el) return;
    if (!isValidUrl(url)) return;
    if (el instanceof HTMLImageElement) {
      el.src = url;
      return;
    }
    el.style.setProperty("background-image", `url("${url}")`, "important");
  };

  const applyBanner = (el: HTMLElement | null, url: string) => {
    if (!el) return;
    if (!isValidUrl(url)) return;
    el.style.setProperty("background-image", `url("${url}")`, "important");
  };

  const updateUI = async () => {
    const avatar = findAvatarEl();
    const banner = findBannerEl();
    const settings = await getSettings();

    if (avatar && !avatar.dataset.customized) {
      avatar.dataset.orig = avatar.style.backgroundImage;
      if (isValidUrl(settings.img)) {
        avatar.style.backgroundImage = `url("${settings.img}")`;
        avatar.style.backgroundSize = "cover";
      }
      avatar.classList.add("custom-clickable-avatar");
      avatar.style.cursor = "pointer";
      avatar.onclick = (e) => {
        e.stopPropagation();
        const m = document.getElementById(
          "profile-settings-modal",
        ) as HTMLDivElement;
        if (m) m.style.display = "flex";
      };
      avatar.dataset.customized = "true";
    }

    if (banner && !banner.dataset.customized) {
      banner.dataset.orig = banner.style.backgroundImage;
      if (isValidUrl(settings.bg)) {
        banner.style.backgroundImage = `url("${settings.bg}")`;
        banner.style.backgroundSize = "cover";
        banner.style.backgroundPosition = "center";
      }
      banner.dataset.customized = "true";
    }

    return !!(avatar?.dataset.customized && banner?.dataset.customized);
  };

  const createSettingsModal = async () => {
    if (document.getElementById("profile-settings-modal")) return;

    const modal = document.createElement("div");
    modal.id = "profile-settings-modal";

    const initial = await getSettings();

    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <button id="reset-urls">Reset</button>
        <span class="modal-title">Settings</span>
        <button id="close-profile-modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="field-row">
          <label for="set-img-url">Profile Image URL</label>
          <input class="field-control" type="text" id="set-img-url" value="${initial.img || ""}" placeholder="PNG/GIF/JPEG URL">
        </div>
        <div class="field-row">
          <label for="set-bg-url">Background Image URL</label>
          <input class="field-control" type="text" id="set-bg-url" value="${initial.bg || ""}" placeholder="PNG/GIF/JPEG URL">
        </div>
      </div>
      <div class="modal-footer">
        <button id="save-profile-cfg">Save & Reload</button>
      </div>
    </div>`;

    document.body.appendChild(modal);

    const inputImg = modal.querySelector<HTMLInputElement>("#set-img-url");
    const inputBg = modal.querySelector<HTMLInputElement>("#set-bg-url");
    if (!inputImg || !inputBg) return;

    const liveUpdate = () => {
      applyAvatar(findAvatarEl(), inputImg.value.trim());
      applyBanner(findBannerEl(), inputBg.value.trim());
    };

    inputImg.oninput = liveUpdate;
    inputBg.oninput = liveUpdate;

    const saveBtn = modal.querySelector<HTMLButtonElement>("#save-profile-cfg");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await gmSetValue("PROFILE_IMAGE_URL", inputImg.value.trim());
        await gmSetValue("PROFILE_BACKGROUND_URL", inputBg.value.trim());
        location.reload();
      };
    }

    const resetBtn = modal.querySelector<HTMLButtonElement>("#reset-urls");
    if (resetBtn) {
      resetBtn.onclick = async () => {
        if (confirm("Reset profile and background?")) {
          await gmDeleteValue("PROFILE_IMAGE_URL");
          await gmDeleteValue("PROFILE_BACKGROUND_URL");
          location.reload();
        }
      };
    }

    const closeModal = () => (modal.style.display = "none");
    const closeBtn = modal.querySelector<HTMLButtonElement>(
      "#close-profile-modal",
    );
    if (closeBtn) {
      closeBtn.type = "button";
      closeBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      });
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      });
    }

    const modalContent = modal.querySelector<HTMLElement>(".modal-content");
    if (modalContent) {
      modalContent.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  if (!isBaseOwnProfile) return;

  await createSettingsModal();

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(async () => {
      scheduled = false;
      const done = await updateUI();
      if (done) observer.disconnect();
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log("Profile loaded!");
}
