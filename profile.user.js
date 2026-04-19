// ==UserScript==
// @name         42 Intra Profile
// @namespace    https://github.com/nicopasla/42-userscripts
// @version      0.0.2
// @updateURL	   https://raw.githubusercontent.com/nicopasla/42-userscripts/main/profile.user.js
// @license      MIT
// @author       nicopasla
// @description  Replace your profile and background pics
// @match        https://profile-v3.intra.42.fr/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// ==/UserScript==

(async function () {
  "use strict";

  const isBaseProfilePage = location.pathname === "/";

  const getSettings = async () => ({
    img: await GM.getValue("custom-42-img-url", null),
    bg: await GM.getValue("custom-42-bg-url", null),
  });
  const INTRA_FONT =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const isValidUrl = (url) => {
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

  const injectProfileStyles = () => {
    if (document.getElementById("custom-42-profile-styles")) return;
    const style = document.createElement("style");
    style.id = "custom-42-profile-styles";
    style.textContent = `
      .bg-ft-gray b { font-size: 1rem !important; margin-right: 5px; font-family: ${INTRA_FONT};}
      .bg-ft-gray span { font-size: 1.2rem !important; font-weight: bold !important; font-family: ${INTRA_FONT};}
      .user-primary h1, .user-name { font-size: 2.5rem !important; font-family: ${INTRA_FONT};}
      p.text-sm:nth-child(2) { font-size: 0.95rem !important; }
    `;
    document.head.appendChild(style);
  };

  const injectBasePageStyles = () => {
    if (document.getElementById("custom-42-base-styles")) return;
    const style = document.createElement("style");
    style.id = "custom-42-base-styles";
    style.textContent = `
      .custom-clickable-avatar { cursor: pointer !important; transition: filter 0.2s; }
      .custom-clickable-avatar:hover { filter: brightness(0.8); }
      #profile-settings-modal .modal-content { background:#fff; border-radius:12px; max-width:420px; width:94%; overflow:visible; box-shadow:0 20px 25px -5px rgba(0,0,0,.1); font-family:${INTRA_FONT}; position:relative; }
      #profile-settings-modal .modal-header { padding:12px 14px; border-bottom:1px solid #e2e8f0; font-weight:700; color:#1e293b; display:flex; align-items:center; }
      #profile-settings-modal .modal-title { flex-grow:1; text-align:center; font-size:15px; letter-spacing:-.01em; }
      #reset-urls { background:#fff; border:1px solid #fee2e2; color:#ef4444; font-size:11px; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:700; transition:all .2s ease; }
      #reset-urls:hover { background:#fef2f2; border-color:#f87171; }
      #close-profile-modal { display:flex; position:relative; width:28px; height:28px; padding:0; border:none; border-radius:50%; background:#f1f5f9; color:#64748b; cursor:pointer; transition:all .3s ease; }
      #close-profile-modal:hover { background:#e2e8f0; color:#1e293b; }
      #close-profile-modal::before, #close-profile-modal::after { content:" "; position:absolute; top:50%; left:50%; width:2px; height:14px; background-color:currentColor; border-radius:1px; }
      #close-profile-modal::before { transform:translate(-50%,-50%) rotate(45deg); }
      #close-profile-modal::after { transform:translate(-50%,-50%) rotate(-45deg); }
      #profile-settings-modal .modal-body { padding:12px 14px; display:flex; flex-direction:column; gap:10px; font-family:${INTRA_FONT}; }
      #profile-settings-modal .field-row { display:flex; flex-direction:column; gap:6px; border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#fafcff; }
      #profile-settings-modal .field-row label { font-size:13px; font-weight:600; color:#1e293b; text-transform:none; }
      #profile-settings-modal .field-control {width: 100%;box-sizing: border-box;font-size: 14px;font-family: ${INTRA_FONT};padding: 10px 12px;min-height: 42px;border: 1px solid #cbd5e1;border-radius: 6px;background: #fff;}
      #profile-settings-modal .modal-footer { padding:12px 14px; border-top:1px solid #e2e8f0; }
      #save-profile-cfg { width:100%; padding:9px; background:#00BCBA; color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; font-family:${INTRA_FONT}; }
      #save-profile-cfg:hover { opacity:.9; }
    `;
    document.head.appendChild(style);
  };

  const createSettingsModal = async () => {
    if (document.getElementById("profile-settings-modal")) return;
    const modal = document.createElement("div");
    modal.id = "profile-settings-modal";
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: none; align-items: center; justify-content: center; z-index: 10000; font-family: ${INTRA_FONT};`;

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

    const inputImg = modal.querySelector("#set-img-url");
    const inputBg = modal.querySelector("#set-bg-url");

    const liveUpdate = () => {
      const avatar = document.querySelector(
        'div.rounded-full[style*="background-image"]',
      );
      const banner = document.querySelector(
        "div.border-neutral-600.bg-ft-gray\\/50",
      );

      if (avatar) {
        const url = inputImg.value.trim();
        avatar.style.backgroundImage = isValidUrl(url)
          ? `url("${url}")`
          : avatar.dataset.orig || "";
      }
      if (banner) {
        const url = inputBg.value.trim();
        banner.style.backgroundImage = isValidUrl(url)
          ? `url("${url}")`
          : banner.dataset.orig || "";
      }
    };

    inputImg.oninput = liveUpdate;
    inputBg.oninput = liveUpdate;

    modal.querySelector("#save-profile-cfg").onclick = async () => {
      await GM.setValue("custom-42-img-url", inputImg.value.trim());
      await GM.setValue("custom-42-bg-url", inputBg.value.trim());
      location.reload();
    };

    modal.querySelector("#reset-urls").onclick = async () => {
      if (confirm("Reset profile and background?")) {
        await GM.deleteValue("custom-42-img-url");
        await GM.deleteValue("custom-42-bg-url");
        location.reload();
      }
    };

    const closeModal = () => (modal.style.display = "none");
    const closeBtn = modal.querySelector("#close-profile-modal");
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

    modal.querySelector(".modal-content").addEventListener("click", (e) => {
      e.stopPropagation();
    });

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  const updateUI = async () => {
    const avatar = document.querySelector(
      'div.rounded-full[style*="background-image"]',
    );
    const bannerContainer = document.querySelector(
      "div.border-neutral-600.bg-ft-gray\\/50",
    );
    const settings = await getSettings();

    if (avatar && !avatar.dataset.customized) {
      avatar.dataset.orig = avatar.style.backgroundImage;
      if (isValidUrl(settings.img)) {
        avatar.style.backgroundImage = `url("${settings.img}")`;
        avatar.style.backgroundSize = "cover";
      }
      avatar.classList.add("custom-clickable-avatar");
      avatar.onclick = (e) => {
        e.stopPropagation();
        const m = document.getElementById("profile-settings-modal");
        if (m) m.style.display = "flex";
      };
      avatar.dataset.customized = "true";
    }

    if (bannerContainer && !bannerContainer.dataset.customized) {
      bannerContainer.dataset.orig = bannerContainer.style.backgroundImage;
      if (isValidUrl(settings.bg)) {
        bannerContainer.style.backgroundImage = `url("${settings.bg}")`;
        bannerContainer.style.backgroundSize = "cover";
        bannerContainer.style.backgroundPosition = "center";
      }
      bannerContainer.dataset.customized = "true";
    }

    return !!(
      avatar?.dataset.customized && bannerContainer?.dataset.customized
    );
  };

  injectProfileStyles();
  if (!isBaseProfilePage) return;
  injectBasePageStyles();
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
})();
