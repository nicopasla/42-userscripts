import { html, TemplateResult } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../../../assets/shared-styles.ts";
import { getCampusFlag } from "../../profile/campus-flags.ts";
import { type DialogState } from "./context";
import RELOAD_SVG from "../../../assets/svg/reload.svg?raw";
import CLOCK_SVG from "../../../assets/svg/clock.svg?raw";
import MAXIMIZE_SVG from "../../../assets/svg/maximize.svg?raw";
import MINIMIZE_SVG from "../../../assets/svg/minimize.svg?raw";
import SETTINGS_SVG from "../../../assets/svg/settings_gear.svg?raw";
import RESET_SVG from "../../../assets/svg/reset.svg?raw";

export function renderTemplate(state: DialogState): TemplateResult {
  const {
    currentTheme,
    campusOptions,
    activeCampusId,
    clusters,
    defaultId,
    showMarkers,
  } = state;

  return html`
    <style>
      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }
      #maximize-btn .maximize-icon,
      #maximize-btn .minimize-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      #maximize-btn .minimize-icon {
        display: none;
      }
      #maximize-btn.is-maximized .maximize-icon {
        display: none;
      }
      #maximize-btn.is-maximized .minimize-icon {
        display: inline-flex;
      }
      ${sharedCSS} #map-area-clip {
        background: var(--color-base-300);
      }
      ${sharedCSS} #map-area {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: color-mix(
            in oklch,
            var(--color-base-content) 35%,
            transparent
          )
          transparent;
      }
      #map-area::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      #map-area::-webkit-scrollbar-corner {
        background: transparent;
      }
      #map-area::-webkit-scrollbar-track {
        background: transparent;
      }
      #map-area::-webkit-scrollbar-thumb {
        background: color-mix(
          in oklch,
          var(--color-base-content) 35%,
          transparent
        );
        border-radius: 3px;
      }
      #map-area::-webkit-scrollbar-thumb:hover {
        background: color-mix(
          in oklch,
          var(--color-base-content) 55%,
          transparent
        );
      }
      #map-area svg {
        width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .seat-link {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        overflow: hidden;
        background: #222;
      }
      .seat-link:hover {
        overflow: visible !important;
      }
      .seat-link img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .posts rect:not(.custom-screen),
      .posts polygon:not(.custom-screen),
      rect:not(.custom-screen) {
        fill: var(--color-base-200) !important;
      }
      #map-area svg text,
      #map-area svg tspan {
        fill: var(--color-base-content) !important;
      }
      .spinning {
        animation: btn-spin 0.8s linear infinite;
      }
      @keyframes btn-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .campus-option {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        text-align: left;
        font-size: 14px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: inherit;
        white-space: nowrap;
      }
      .campus-option:hover {
        background: color-mix(in oklch, var(--color-base-200) 80%, transparent);
      }
      .campus-option.active {
        color: var(--color-accent);
      }
      .campus-option-flag {
        font-size: 16px;
        line-height: 1;
      }
      .campus-option-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #campus-time svg {
        width: 12px;
        height: 12px;
        display: block;
        flex-shrink: 0;
        fill: currentColor;
      }
      @keyframes ft-dialog-pulsate {
        0%,
        100% {
          box-shadow:
            0 0 0 2px #ff0055,
            0 0 5px 2px #ff0055,
            0 0 10px 4px #ff0055;
        }
        50% {
          box-shadow:
            0 0 0 3px #ff0055,
            0 0 8px 3px #ff0055,
            0 0 15px 6px #ff0055;
        }
      }
      .ft-dialog-seat-glow {
        animation: ft-dialog-pulsate 1.6s ease-in-out infinite !important;
      }
      .seat-link.ft-dialog-seat-glow {
        overflow: visible !important;
        z-index: 10;
      }
      .tabs-scroll {
        flex: 1 1 auto;
        min-width: 0;
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
      }
      .tabs-scroll::-webkit-scrollbar {
        display: none;
      }
      .tabs-scroll .tab {
        white-space: nowrap;
        flex-shrink: 0;
      }
      .clusters-nav-summary .clusters-nav-chevron {
        transition: transform 0.2s ease;
      }
      .clusters-tabs-host details.dropdown[open] .clusters-nav-chevron {
        transform: rotate(180deg);
      }
      #top-left-badges.active-tab #seat-count-badge {
        padding: 5px 12px;
      }
      #top-left-badges.active-tab #campus-time {
        font-size: 14px;
        padding: 5px 12px;
      }
      #top-left-badges.active-tab #campus-time-icon {
        width: 14px;
        height: 14px;
      }
      #top-left-badges.active-tab #active-sort {
        gap: 2px;
        padding: 2px 6px;
      }
      #top-left-badges.active-tab #active-sort .btn {
        min-height: 1.375rem;
        height: 1.375rem;
        font-size: 12px;
        padding: 0 8px;
        border-radius: 6px;
      }
      #top-left-badges.active-tab #active-sort .sort-icon {
        width: 15px;
        height: 15px;
      }
      #top-left-badges.active-tab #active-sort .sort-icon svg {
        width: 15px;
        height: 15px;
      }
      #top-left-badges.active-tab #active-sort .w-px {
        height: 1.25rem;
      }
      #campus-trigger {
        border: 1px solid var(--color-base-300);
      }
    </style>
    <div
      data-theme="${currentTheme}"
      class="bg-base-100 h-full"
      style="display:flex;flex-direction:column;height:100%;overflow:hidden;"
    >
      <div
        class="flex items-center justify-between shrink-0 p-3 pb-0 sticky top-0 z-30 bg-base-100 rounded-t-xl"
      >
        <div class="flex items-center gap-2" style="flex:1 1 auto;min-width:0;">
          <div style="position:relative;">
            <button
              type="button"
              id="campus-trigger"
              class="btn btn-sm btn-ghost gap-1.5 px-2"
              data-tip="Campus"
              data-tip-size="14px"
            >
              <span class="text-base leading-none" id="campus-trigger-flag"
                >${getCampusFlag(
                  campusOptions.find((o) => o.id === activeCampusId)?.name ||
                    activeCampusId,
                )}</span
              >
              <span
                class="text-xs font-semibold uppercase tracking-wide"
                id="campus-trigger-name"
                >${(
                  campusOptions.find((o) => o.id === activeCampusId)?.name ||
                  activeCampusId
                ).toUpperCase()}</span
              >
              <span
                id="totals-badge"
                class="text-xs font-medium opacity-70 whitespace-nowrap tabular-nums"
                style="display:none"
                data-tip="Total taken / Total seats"
                data-tip-size="14px"
              ></span>
            </button>
            <div
              id="campus-menu"
              style="display:none;position:absolute;left:0;top:calc(100% + 4px);z-index:50;width:13rem;max-height:min(18rem,60vh);overflow:auto;border-radius:8px;background:var(--color-base-100);border:1px solid var(--color-base-300);box-shadow:0 6px 16px rgba(0,0,0,.28);padding:4px;"
            >
              ${campusOptions.map(
                (o) =>
                  html`<button
                    type="button"
                    data-campus-id="${o.id}"
                    class="campus-option ${o.id === activeCampusId
                      ? "active"
                      : ""}"
                  >
                    <span class="campus-option-flag"
                      >${getCampusFlag(o.name)}</span
                    >
                    <span class="campus-option-name"
                      >${o.name.toUpperCase()}</span
                    >
                  </button>`,
              )}
            </div>
          </div>
          <div
            class="clusters-tabs-host"
            style="position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center;"
          ></div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div style="position:relative;">
            <button
              type="button"
              id="settings-btn"
              class="btn btn-circle btn-ghost btn-sm"
              data-tip="Settings"
              data-tip-size="14px"
            >
              ${unsafeHTML(
                SETTINGS_SVG.replace(
                  "<svg",
                  '<svg width="16" height="16"',
                ).replace('stroke="#fff"', 'stroke="currentColor"'),
              )}
            </button>
            <div
              id="settings-menu"
              style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:50;width:15rem;border-radius:8px;background:var(--color-base-100);border:1px solid var(--color-base-300);box-shadow:0 6px 16px rgba(0,0,0,.28);padding:10px 8px;"
            >
              <div id="default-cluster-row">
                <span
                  class="text-xs font-semibold uppercase tracking-wide opacity-60 block mb-1"
                  >Default cluster</span
                >
                <select
                  class="select select-accent select-sm w-full"
                  id="default-cluster-select"
                  data-tip="Default cluster"
                  data-tip-size="14px"
                >
                  ${[...clusters, { id: "active", name: "Active" }]
                    .filter(
                      (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
                    )
                    .map(
                      (c) =>
                        html`<option
                          value="${c.id}"
                          ?selected="${c.id === defaultId}"
                        >
                          ${c.name.toUpperCase()}
                        </option>`,
                    )}
                </select>
              </div>
              <button
                class="btn btn-sm w-full mt-2 justify-between ${showMarkers
                  ? "btn-accent"
                  : "btn-ghost"}"
                style="${showMarkers
                  ? "border-color: var(--color-accent)"
                  : ""}"
                id="markers-btn"
                data-tip="Toggle chair markers"
                data-tip-size="14px"
              >
                <span>Show chair markers</span>
                <span class="text-xs opacity-50"
                  >${showMarkers ? "ON" : "OFF"}</span
                >
              </button>
            </div>
          </div>
          <button
            class="btn btn-circle btn-ghost btn-sm"
            id="maximize-btn"
            data-tip="Maximize"
            data-tip-size="14px"
          >
            <span class="maximize-icon">
              ${unsafeHTML(
                MAXIMIZE_SVG.replace("<svg", '<svg width="16" height="16"'),
              )}
            </span>
            <span class="minimize-icon">
              ${unsafeHTML(
                MINIMIZE_SVG.replace("<svg", '<svg width="16" height="16"'),
              )}
            </span>
          </button>
          <button
            class="btn btn-circle btn-ghost btn-sm text-xl"
            id="close-btn"
          >
            ✕
          </button>
        </div>
      </div>
      <div class="relative flex-1 min-h-0 mx-3 mb-3 mt-2">
        <div id="map-area-clip" class="rounded-lg overflow-hidden h-full">
          <div id="map-area" class="h-full"></div>
        </div>
        <button
          id="updated-badge"
          class="btn btn-accent btn-sm border border-base-content/20 absolute bottom-3 right-3 z-20"
          style="display:none;width:80px;justify-content:flex-start"
          data-tip="Reload occupancy"
          data-tip-size="14px"
        >
          <span id="reload-icon" class="size-4 flex items-center justify-center"
            >${unsafeHTML(RELOAD_SVG)}</span
          >
          <span id="badge-text" style="flex:1;text-align:center"></span>
        </button>
        <div
          id="top-left-badges"
          class="absolute top-2 left-2 z-20 flex items-center gap-2"
        >
          <div
            id="seat-count-badge"
            class="text-xs tabular-nums font-medium bg-accent text-accent-content rounded-lg px-2 py-1 border border-accent"
          >
            - / -
          </div>
          <div
            id="campus-time"
            class="flex items-center gap-1 whitespace-nowrap text-xs tabular-nums font-medium bg-accent text-accent-content rounded-lg px-2 py-1 border border-accent"
            style="display:none"
          >
            <span
              id="campus-time-icon"
              class="size-3 flex items-center justify-center"
              >${unsafeHTML(CLOCK_SVG)}</span
            >
            <span id="campus-time-text"></span>
          </div>
          <div
            id="active-sort"
            class="flex items-center gap-0.5 bg-accent text-accent-content rounded-lg px-1 py-0.5 border border-accent"
            style="display:none"
          >
            <button
              class="btn btn-ghost btn-xs text-accent-content gap-1"
              id="sort-name"
              data-tip="Sort by login"
              data-tip-size="14px"
            >
              <span
                class="sort-icon size-3 flex items-center justify-center"
              ></span>
              <span class="sort-label">Name</span>
            </button>
            <button
              class="btn btn-ghost btn-xs text-accent-content gap-1"
              id="sort-since"
              data-tip="Sort by connection time"
              data-tip-size="14px"
            >
              <span
                class="sort-icon size-3 flex items-center justify-center"
              ></span>
              <span class="sort-label">Time</span>
            </button>
            <div class="w-px h-4 bg-accent-content/40"></div>
            <button
              class="btn btn-ghost btn-xs text-accent-content gap-1"
              id="active-wifi-toggle"
              data-tip="Show only Wi-Fi users"
              data-tip-size="14px"
            >
              <span class="sort-label">Wi-Fi</span>
            </button>
          </div>
        </div>
        <div
          id="zoom-controls"
          class="absolute top-2 right-6 z-20 flex items-center gap-1 bg-accent text-accent-content rounded-lg px-1 py-0.5 border border-accent"
        >
          <button
            class="btn btn-ghost btn-xs text-xs text-accent-content"
            id="zoom-reset"
            data-tip="Reset zoom"
            data-tip-size="14px"
          >
            <span class="size-3 flex items-center justify-center"
              >${unsafeHTML(RESET_SVG)}</span
            >
          </button>
          <button
            class="btn btn-ghost btn-xs text-xs text-accent-content"
            id="zoom-out"
            data-tip="Zoom out"
            data-tip-size="14px"
          >
            −
          </button>
          <span class="zoom-pct text-xs tabular-nums w-10 text-center"
            >100%</span
          >
          <button
            class="btn btn-ghost btn-xs text-xs text-accent-content"
            id="zoom-in"
            data-tip="Zoom in"
            data-tip-size="14px"
          >
            +
          </button>
        </div>
      </div>
    </div>
  `;
}
