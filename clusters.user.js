// ==UserScript==
// @name         42 Intra Clusters
// @namespace    https://github.com/nicopasla/42-userscripts
// @version      0.0.1
// @updateURL    https://raw.githubusercontent.com/nicopasla/42-userscripts/main/clusters.user.js
// @license      MIT
// @author       nicopasla
// @description  Adds iMac direction markers and a default cluster picker with saved preference
// @match        https://meta.intra.42.fr/clusters*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // --- STYLE ---
  const COLOR = "#00babc";
  const THICKNESS = 3;
  const OPACITY = "0.4";
  const BAR_SIZE = 16;
  const CURVE_DEPTH = 1;

  function rowScreens(row, positions, dir) {
    return Object.fromEntries(positions.map((n) => [`${row}-p${n}`, dir]));
  }

  function rowsScreens(rows, positions, dir) {
    return Object.fromEntries(
      rows.flatMap((row) => positions.map((n) => [`${row}-p${n}`, dir])),
    );
  }

  const SHI_SCREENS = {
    ...rowsScreens(
      ["r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"],
      [1, 3, 5, 7],
      "UP",
    ),
    ...rowsScreens(
      ["r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"],
      [2, 4, 6, 8],
      "DOWN",
    ),
    ...rowScreens("r1", [1, 2, 3, 4, 5, 6, 7], "DOWN"),
    ...rowScreens("r12", [1, 2, 3, 4], "UP"),
    ...rowScreens("c1", [1, 2, 3, 4, 5, 6], "LEFT"),
    ...rowScreens("c2", [1, 2, 3, 4, 5, 6], "LEFT"),
  };

  const FU_SCREENS = {
    ...rowsScreens(
      ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"],
      [1, 3, 5, 7],
      "UP",
    ),
    ...rowsScreens(
      ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"],
      [2, 4, 6, 8],
      "DOWN",
    ),
    ...rowScreens("c1", [1, 2, 3, 5], "LEFT"),
    "c1-p5": "NONE",
    ...rowScreens("c2", [1, 2, 3], "LEFT"),
    "c2-p4": "UP",
    ...rowScreens("c3", [1, 2, 3, 4, 5, 6], "RIGHT"),
    ...rowScreens("c4", [1, 2, 3, 4, 5, 6], "RIGHT"),
  };

  const MI_SCREENS = {
    ...rowsScreens(
      ["r1", "r2", "r3", "r4", "r5", "r6", "r7"],
      [1, 3, 5, 7],
      "UP",
    ),
    ...rowsScreens(
      ["r1", "r2", "r3", "r4", "r5", "r6", "r7"],
      [2, 4, 6, 8],
      "DOWN",
    ),
    "r1-p5": "NONE",
    "r8-p1": "RIGHT",
    "r8-p2": "NONE",
    "r8-p3": "RIGHT",
    ...rowScreens("c1", [1, 2], "DOWN"),
    ...rowScreens("c2", [1, 2, 3, 4, 5, 6, 7, 8], "LEFT"),
    ...rowScreens("c3", [1, 2, 3], "LEFT"),
    ...rowScreens("c4", [1, 2, 3], "UP"),
    ...rowScreens("c4", [4, 5], "RIGHT"),
    ...rowScreens("c5", [1], "RIGHT"),
    ...rowScreens("c6", [1, 2, 3, 4], "RIGHT"),
  };

  const A1_SCREENS = {};

  const A2_SCREENS = {};

  function prefixScreens(prefix, screens) {
    return Object.fromEntries(
      Object.entries(screens).map(([id, dir]) => [`${prefix}-${id}`, dir]),
    );
  }

  const SCREENS = {
    ...prefixScreens("shi", SHI_SCREENS),
    ...prefixScreens("fu", FU_SCREENS),
    ...prefixScreens("mi", MI_SCREENS),
    ...prefixScreens("a1", A1_SCREENS),
    ...prefixScreens("a2", A2_SCREENS),
  };

  const CLUSTERS = [
    { id: "20", name: "shi" },
    { id: "21", name: "fu" },
    { id: "54", name: "mi" },
    { id: "164", name: "a1" },
    { id: "165", name: "a2" },
  ];

  const getValue = (key, fallback) => GM_getValue(key, fallback);

  const setValue = (key, value) => GM_setValue(key, value);

  const deleteValue = (key) => GM_deleteValue(key);

  const savedId = getValue("defaultClusterId", null);
  const MARKERS_VISIBLE_KEY = "markersVisible";

  const getBoolValue = (key, fallback) => {
    const raw = getValue(key, fallback);
    if (typeof raw === "boolean") return raw;
    if (raw === null || raw === undefined) return fallback;
    return raw === "true" || raw === "1" || raw === 1;
  };

  let markersVisible = getBoolValue(MARKERS_VISIBLE_KEY, true);

  function applyMarkersVisibility() {
    const hidden = !markersVisible;
    document.documentElement.classList.toggle("markers-hidden", hidden);

    document.querySelectorAll(".custom-screen").forEach((el) => {
      el.style.display = hidden ? "none" : "";
    });
  }

  function updateMarkerToggleButton(btn) {
    if (!btn) return;
    btn.textContent = "";
    btn.setAttribute("title", markersVisible ? "Hide markers" : "Show markers");
    btn.setAttribute(
      "aria-label",
      markersVisible ? "Hide markers" : "Show markers",
    );
    btn.setAttribute("aria-pressed", String(markersVisible));
    btn.classList.toggle("is-off", !markersVisible);
  }

  function injectClusterPickerStyles() {
    if (document.getElementById("cluster-picker-style")) return;

    const style = document.createElement("style");
    style.id = "cluster-picker-style";
    style.textContent = `#cluster-li-container{display:flex;align-items:center;padding:0 10px;height:42px;float:left;}
    .cluster-picker{display:inline-flex;align-items:center;gap:8px;height:100%;padding:0;border:0;background:transparent;box-shadow:none;font:inherit;}
    .cluster-picker__label,.marker-toggle-desc{font:inherit;font-size:13px;font-weight:500;color:#6b7280;}
    #cluster-dropdown,#marker-toggle{height:26px;border:1px solid #dbe4ee;border-radius:8px;background:#fff;font:inherit;font-size:13px;font-weight:500;color:#6b7280;outline:none;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease;}
    #cluster-dropdown{min-width:76px;padding:0 8px;cursor:pointer;}
    #cluster-dropdown:hover,#marker-toggle:hover{border-color:#cbd5e1;background:#f8fafc;}
    #cluster-dropdown:focus,#marker-toggle:focus{border-color:#00babc;box-shadow:0 0 0 3px rgba(0,188,186,.16);}
    #marker-toggle{width:26px;padding:0;border-radius:999px;border-color:#16a34a;background:#dcfce7;cursor:pointer;}
    #marker-toggle.is-off{border-color:#ef4444;background:#fee2e2;}
    #marker-toggle.is-off:hover{border-color:#dc2626;background:#fecaca;}
    .markers-hidden .custom-screen{display:none !important;}`;
    document.head.appendChild(style);
  }

  function injectClusterPicker() {
    const list = getClusterTabsList();
    if (!list || list.querySelector("#cluster-li-container")) return;

    injectClusterPickerStyles();

    const li = document.createElement("li");
    li.id = "cluster-li-container";

    const options = CLUSTERS.map(
      (c) =>
        `<option value="${c.id}" ${savedId === c.id ? "selected" : ""}>${c.name}</option>`,
    ).join("");

    li.innerHTML = `
      <div class="cluster-picker">
        <span class="cluster-picker__label">Default</span>
        <select id="cluster-dropdown" aria-label="Default cluster">
          <option value="">None</option>
          ${options}
        </select>
        <span class="marker-toggle-desc">Markers</span>
        <button id="marker-toggle" type="button" aria-label="Toggle markers"></button>
      </div>
    `;

    list.appendChild(li);

    const dropdown = li.querySelector("#cluster-dropdown");
    dropdown?.addEventListener("change", (e) => {
      const val = e.target.value;

      if (!val) {
        deleteValue("defaultClusterId");
        if (window.location.hash) {
          history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
        return;
      }

      setValue("defaultClusterId", val);
      window.location.hash = `#cluster-${val}`;
      forceTab(val);
    });

    const markerToggle = li.querySelector("#marker-toggle");
    updateMarkerToggleButton(markerToggle);
    markerToggle?.addEventListener("click", () => {
      markersVisible = !markersVisible;
      setValue(MARKERS_VISIBLE_KEY, markersVisible);
      applyMarkersVisibility();
      updateMarkerToggleButton(markerToggle);
    });
  }

  function initClusterFixer() {
    const checkInterval = setInterval(() => {
      injectClusterPicker();

      const hashMatch = window.location.hash.match(/cluster-(\d+)/);
      const targetId = hashMatch ? hashMatch[1] : savedId;

      if (targetId && forceTab(targetId)) {
        clearInterval(checkInterval);
      }
    }, 100);

    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  let rafId = null;

  function scheduleApplyManualScreens() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyManualScreens();
    });
  }

  function applyManualScreens() {
    for (const [id, dir] of Object.entries(SCREENS)) {
      const el = document.getElementById(id);
      if (!el) continue;

      const parent = el.parentNode;
      if (!parent) continue;

      if (parent.querySelector(`.custom-screen[data-for="${id}"]`)) continue;

      const x = Number(el.getAttribute("x"));
      const y = Number(el.getAttribute("y"));
      const width = Number(el.getAttribute("width")) || 30;
      const height = Number(el.getAttribute("height")) || 30;

      if (Number.isNaN(x) || Number.isNaN(y)) continue;

      const direction = dir.toUpperCase();
      if (direction === "NONE") continue;

      const OFFSET_X = (width - BAR_SIZE) / 2;
      const OFFSET_Y = (height - BAR_SIZE) / 2;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("class", "custom-screen");
      path.dataset.for = id;

      const localTransform = el.getAttribute("transform");
      if (localTransform) {
        path.setAttribute("transform", localTransform);
      }

      let d = "";

      switch (direction) {
        case "UP": {
          const yPos = y + 1;
          const startX = x + OFFSET_X;
          const endX = x + OFFSET_X + BAR_SIZE;
          const midX = x + width / 2;
          d = `M ${startX} ${yPos} Q ${midX} ${yPos - CURVE_DEPTH} ${endX} ${yPos}`;
          break;
        }

        case "DOWN": {
          const yPos = y + height - 1;
          const startX = x + OFFSET_X;
          const endX = x + OFFSET_X + BAR_SIZE;
          const midX = x + width / 2;
          d = `M ${startX} ${yPos} Q ${midX} ${yPos + CURVE_DEPTH} ${endX} ${yPos}`;
          break;
        }

        case "LEFT": {
          const xPos = x + 1;
          const startY = y + OFFSET_Y;
          const endY = y + OFFSET_Y + BAR_SIZE;
          const midY = y + height / 2;
          d = `M ${xPos} ${startY} Q ${xPos - CURVE_DEPTH} ${midY} ${xPos} ${endY}`;
          break;
        }

        case "RIGHT": {
          const xPos = x + width - 1;
          const startY = y + OFFSET_Y;
          const endY = y + OFFSET_Y + BAR_SIZE;
          const midY = y + height / 2;
          d = `M ${xPos} ${startY} Q ${xPos + CURVE_DEPTH} ${midY} ${xPos} ${endY}`;
          break;
        }

        default:
          continue;
      }

      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", COLOR);
      path.setAttribute("stroke-width", THICKNESS);
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("vector-effect", "non-scaling-stroke");

      path.style.opacity = OPACITY;
      path.style.pointerEvents = "none";
      if (!markersVisible) path.style.display = "none";

      parent.appendChild(path);
    }
  }

  function initObserver() {
    const svgRoot = document.querySelector("svg");
    if (!svgRoot) {
      requestAnimationFrame(initObserver);
      return;
    }

    const observer = new MutationObserver(scheduleApplyManualScreens);
    observer.observe(svgRoot, { childList: true, subtree: true });

    scheduleApplyManualScreens();
  }

  function getClusterTabsList() {
    const links = document.querySelectorAll('a[href^="#cluster-"]');
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (/^#cluster-\d+$/.test(href)) {
        return link.closest("ul, ol");
      }
    }
    return null;
  }

  function forceTab(id) {
    const el = document.querySelector(`a[href="#cluster-${id}"]`);
    if (!el) return false;

    el.click();

    const parent = el.parentElement;
    const list = parent?.parentElement;
    if (parent && list) {
      list
        .querySelectorAll("li")
        .forEach((li) => li.classList.remove("active"));
      parent.classList.add("active");
    }
    return true;
  }

  initObserver();
  initClusterFixer();
  applyMarkersVisibility();
})();
