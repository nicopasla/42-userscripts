// ==UserScript==
// @name         42 Intra YouTube
// @namespace    https://github.com/nicopasla/42-userscripts
// @version      0.0.2
// @updateURL    https://raw.githubusercontent.com/nicopasla/42-userscripts/main/youtube.user.js
// @license      MIT
// @author       nicopasla
// @description  Totally useless Youtube player inside 42 Intra v3
// @match        https://profile-v3.intra.42.fr/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "42_intra_youtube_v1";
  const DEFAULT_VIDEO = "dQw4w9WgXcQ";
  const INTRA_FONT =
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  function createYouTubeBox() {
    const savedId = GM_getValue(STORAGE_KEY) || DEFAULT_VIDEO;
    const box = document.createElement("div");
    box.id = "youtube-box-v3";
    box.className =
      "bg-white dark:bg-zinc-900 md:h-96 overflow-hidden md:drop-shadow-md md:rounded-lg p-0 mb-4 transition-all";
    box.style.fontFamily = INTRA_FONT;

    box.innerHTML = `
      <div class="flex flex-col w-full h-full">
        <div class="flex flex-col gap-2 md:flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="w-1.5 h-4 bg-legacy-main rounded-full"></div>
            <div class="font-bold text-black dark:text-white uppercase text-sm tracking-tight">YouTube</div>
          </div>
          <div class="flex flex-row gap-0 w-full md:flex-grow md:ml-8 border border-gray-200 dark:border-zinc-700 rounded overflow-hidden focus-within:border-legacy-main transition-all">
             <input type="text" id="yt-url-input" placeholder="YouTube Link" class="px-4 py-1.5 text-xs w-full outline-none bg-gray-50/30 dark:bg-zinc-800 dark:text-white" />
             <button id="yt-load-btn" class="bg-legacy-main text-white px-6 py-1.5 text-xs uppercase font-bold hover:bg-black transition-colors flex-shrink-0">Load</button>
          </div>
        </div>
        <div class="relative flex-grow bg-black">
          <iframe id="yt-iframe" src="https://www.youtube.com/embed/${savedId}" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
      </div>`;

    const input = box.querySelector("#yt-url-input");
    const button = box.querySelector("#yt-load-btn");
    const iframe = box.querySelector("#yt-iframe");

    const updateVideo = () => {
      const raw = input.value.trim();

      const idMatch =
        raw.match(/^[a-zA-Z0-9_-]{11}$/) ||
        raw.match(
          /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        );

      if (!idMatch) {
        input.classList.add("border-red-500");
        return;
      }

      const videoId = idMatch[1] || idMatch[0];
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      GM_setValue(STORAGE_KEY, videoId);

      input.classList.remove("border-red-500");
      input.value = `https://youtu.be/${videoId}`;
    };

    button.addEventListener("click", updateVideo);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") updateVideo();
    });

    return box;
  }

  function initializeBox() {
    if (window.location.pathname !== "/" && window.location.pathname !== "")
      return;
    if (document.getElementById("youtube-box-v3")) return;

    const targetContainer = [
      ...document.querySelectorAll('[class*="grid"]'),
    ].find((el) => el.children.length > 2 && el.offsetParent !== null);

    if (targetContainer) {
      targetContainer.appendChild(createYouTubeBox());
    }
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById("youtube-box-v3")) {
      initializeBox();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  initializeBox();
})();
