import { gmGetValue, gmSetValue, gmDeleteValue } from "../lib/gm.ts";
import { SCREENS, CLUSTERS, CLUSTER_CONFIG } from "./clusters.data.ts";
import "../assets/style.css";

export async function initClusters() {
  (function () {
    "use strict";

    const savedId = gmGetValue("CLUSTERS_DEFAULT_ID", null);
    const MARKERS_VISIBLE_KEY = "CLUSTERS_SHOW_MARKERS";

    const getBoolValue = (key, fallback) => {
      const raw = gmGetValue(key, fallback);
      if (typeof raw === "boolean") return raw;
      if (raw === null || raw === undefined) return fallback;
      return raw === "true" || raw === "1" || raw === 1;
    };

    let markersVisible = getBoolValue(MARKERS_VISIBLE_KEY, true);

    function applyMarkersVisibility() {
      const hidden = !markersVisible;

      document.documentElement.classList.toggle("markers-hidden", hidden);
      document.body?.classList.toggle("markers-hidden", hidden);

      document.querySelectorAll<SVGElement>(".custom-screen").forEach((el) => {
        if (hidden) {
          el.style.setProperty("display", "none", "important");
        } else {
          el.style.removeProperty("display");
        }
      });
    }

    function updateMarkerToggleButton(btn) {
      if (!btn) return;
      btn.textContent = "";
      btn.setAttribute(
        "title",
        markersVisible ? "Hide markers" : "Show markers",
      );
      btn.setAttribute(
        "aria-label",
        markersVisible ? "Hide markers" : "Show markers",
      );
      btn.setAttribute("aria-pressed", String(markersVisible));
      btn.classList.toggle("is-off", !markersVisible);
    }

    function hookClusterTabClicks() {
      const links = document.querySelectorAll<HTMLAnchorElement>(
        'a[href^="#cluster-"]',
      );

      links.forEach((link) => {
        if (link.dataset.markersHooked === "1") return;
        link.dataset.markersHooked = "1";

        link.addEventListener("click", () => {
          refreshMarkersSoon();
        });
      });
    }

    function injectClusterPicker() {
      const list = getClusterTabsList();
      if (!list || list.querySelector("#cluster-li-container")) return;

      hookClusterTabClicks();

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

      const dropdown = li.querySelector<HTMLSelectElement>("#cluster-dropdown");
      dropdown?.addEventListener("change", () => {
        const val = dropdown.value;

        if (!val) {
          gmDeleteValue("CLUSTERS_DEFAULT_ID");
          if (window.location.hash) {
            history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
          }
          return;
        }

        gmSetValue("CLUSTERS_DEFAULT_ID", val);
        window.location.hash = `#cluster-${val}`;
        forceTab(val);
      });

      const markerToggle = li.querySelector("#marker-toggle");
      updateMarkerToggleButton(markerToggle);

      markerToggle?.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      markerToggle?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        markersVisible = !markersVisible;
        gmSetValue(MARKERS_VISIBLE_KEY, markersVisible);

        refreshMarkersSoon();
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

    let rafId: number | null = null;
    let refreshQueued = false;
    let svgObserver: MutationObserver | null = null;
    let bodyObserver: MutationObserver | null = null;
    let observedSvgRoot: SVGSVGElement | null = null;

    function scheduleApplyManualScreens() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyManualScreens();
      });
    }

    function refreshMarkersNow() {
      applyManualScreens();
      applyMarkersVisibility();
    }

    function refreshMarkersSoon() {
      if (refreshQueued) return;
      refreshQueued = true;

      setTimeout(() => {
        refreshMarkersNow();

        requestAnimationFrame(() => {
          refreshMarkersNow();
        });

        setTimeout(() => {
          refreshMarkersNow();
          refreshQueued = false;
        }, 160);
      }, 0);
    }

    function applyManualScreens() {
      for (const [id, dir] of Object.entries(SCREENS)) {
        const el = document.getElementById(id);
        if (!el?.parentNode) continue;
        if (el.parentNode.querySelector(`.custom-screen[data-for="${id}"]`))
          continue;

        const x = Number(el.getAttribute("x"));
        const y = Number(el.getAttribute("y"));
        const width = Number(el.getAttribute("width")) || 30;
        const height = Number(el.getAttribute("height")) || 30;
        const direction = String(dir).toUpperCase();

        if (Number.isNaN(x) || Number.isNaN(y) || direction === "NONE")
          continue;

        const d = buildCurvePath(x, y, width, height, direction);
        if (!d) continue;

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("class", "custom-screen");
        path.dataset.for = id;
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", CLUSTER_CONFIG.COLOR);
        path.setAttribute("stroke-width", String(CLUSTER_CONFIG.THICKNESS));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("vector-effect", "non-scaling-stroke");

        const t = el.getAttribute("transform");
        if (t) path.setAttribute("transform", t);

        path.style.opacity = CLUSTER_CONFIG.OPACITY;
        path.style.pointerEvents = "none";
        if (!markersVisible) path.style.display = "none";

        el.parentNode.appendChild(path);
      }
    }

    function buildCurvePath(
      x: number,
      y: number,
      width: number,
      height: number,
      direction: string,
    ) {
      const ox = (width - CLUSTER_CONFIG.BAR_SIZE) / 2;
      const oy = (height - CLUSTER_CONFIG.BAR_SIZE) / 2;
      const midX = x + width / 2;
      const midY = y + height / 2;

      if (direction === "UP") {
        const yPos = y + 1,
          sx = x + ox,
          ex = x + ox + CLUSTER_CONFIG.BAR_SIZE;
        return `M ${sx} ${yPos} Q ${midX} ${yPos - CLUSTER_CONFIG.CURVE_DEPTH} ${ex} ${yPos}`;
      }
      if (direction === "DOWN") {
        const yPos = y + height - 1,
          sx = x + ox,
          ex = x + ox + CLUSTER_CONFIG.BAR_SIZE;
        return `M ${sx} ${yPos} Q ${midX} ${yPos + CLUSTER_CONFIG.CURVE_DEPTH} ${ex} ${yPos}`;
      }
      if (direction === "LEFT") {
        const xPos = x + 1,
          sy = y + oy,
          ey = y + oy + CLUSTER_CONFIG.BAR_SIZE;
        return `M ${xPos} ${sy} Q ${xPos - CLUSTER_CONFIG.CURVE_DEPTH} ${midY} ${xPos} ${ey}`;
      }
      if (direction === "RIGHT") {
        const xPos = x + width - 1,
          sy = y + oy,
          ey = y + oy + CLUSTER_CONFIG.BAR_SIZE;
        return `M ${xPos} ${sy} Q ${xPos + CLUSTER_CONFIG.CURVE_DEPTH} ${midY} ${xPos} ${ey}`;
      }
      return "";
    }

    function initObserver() {
      const findAndAttach = () => {
        const svgRoot = document.querySelector<SVGSVGElement>("svg");
        if (svgRoot) attachSvgObserver(svgRoot);
      };

      findAndAttach();

      if (!bodyObserver) {
        bodyObserver = new MutationObserver(() => {
          findAndAttach();
          hookClusterTabClicks();
          injectClusterPicker();
          refreshMarkersSoon();
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
      }

      [50, 150, 400, 900, 1500].forEach((ms) => {
        setTimeout(() => {
          findAndAttach();
          refreshMarkersSoon();
        }, ms);
      });
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
      const el = document.querySelector<HTMLAnchorElement>(
        `a[href="#cluster-${id}"]`,
      );
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

    function attachSvgObserver(svgRoot: SVGSVGElement) {
      if (!svgRoot || svgRoot === observedSvgRoot) return;
      if (svgObserver) svgObserver.disconnect();

      observedSvgRoot = svgRoot;
      svgObserver = new MutationObserver(() => {
        scheduleApplyManualScreens();
        refreshMarkersSoon();
      });

      svgObserver.observe(svgRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "id",
          "class",
          "x",
          "y",
          "width",
          "height",
          "transform",
        ],
      });

      refreshMarkersSoon();
    }

    initObserver();
    initClusterFixer();
    refreshMarkersSoon();
    setTimeout(refreshMarkersSoon, 120);
    setTimeout(refreshMarkersSoon, 400);
    setTimeout(refreshMarkersSoon, 1000);
  })();

  console.log("Clusters loaded!");
}
