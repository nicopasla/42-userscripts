import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../../assets/shared-styles.ts";
import {
  FriendData,
  addFriend,
  clearFriendsCache,
  fetchFriendsData,
  getFriendsList,
  isFriend,
  removeFriend,
} from "./friends.ts";
import {
  loginWith42,
  clearAuthFailed,
  fetchMySettings,
  applyCloudSettings,
  syncToCloud,
} from "../account/account.ts";
import { getConfig } from "../../config.ts";
import { getEffectiveTheme, getIsLight } from "../profile/theme/theme-manager.ts";
import { bindTooltips } from "../../utils/tooltip.ts";
import { CLUSTERS, getClusterData } from "../clusters/clusters.data.ts";
import FRIENDS_SVG from "../../assets/svg/friends.svg?raw";
import WARNING_SVG from "../../assets/svg/triangle-exclamation.svg?raw";
import FORTY_TWO_SVG from "../../assets/svg/42_Logo.svg?raw";

const HOST_ID = "friends-widget-host";

const showingOriginalAvatars = new Map<string, boolean>();

function levelFraction(level: number): number {
  return level % 1;
}

function renderLevelBar(level: number, color = "var(--color-primary)") {
  const pct = Math.round(levelFraction(level) * 100);
  const whole = Math.floor(level);
  return html`
    <div class="flex items-center gap-1.5 w-full">
      <span class="text-lg font-bold opacity-60 w-8 text-right shrink-0"
        >${whole}</span
      >
      <div class="flex-1 h-3 rounded-full bg-base-300 overflow-hidden relative">
        <div
          class="h-full rounded-full transition-all duration-500"
          style="width:${pct}%; background:${color};"
        ></div>
        <span
          class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white leading-none"
          style="text-shadow: 0 0 3px rgba(0,0,0,0.7);"
          >${pct}%</span
        >
      </div>
      <span class="text-lg font-bold opacity-60 w-8 shrink-0"
        >${whole + 1}</span
      >
    </div>
  `;
}

function renderFriendRow(
  friend: FriendData,
  onRemove: (login: string) => void,
  rank = -1,
  showCustomAvatars = true,
) {
  const medalClass =
    rank === 0
      ? "medal-glow-gold"
      : rank === 1
        ? "medal-glow-silver"
        : rank === 2
          ? "medal-glow-rainbow"
          : "";
  const hasCustom = !!(
    showCustomAvatars &&
    friend.customAvatar &&
    friend.customAvatar !== friend.avatar
  );
  const showingOriginal = showingOriginalAvatars.get(friend.login) ?? false;
  const showCustom = hasCustom && !showingOriginal;
  const currentSrc =
    hasCustom && !showingOriginal ? friend.customAvatar : friend.avatar;
  const toggleTitle = hasCustom
    ? showingOriginal
      ? "Click to view custom avatar"
      : "Click to view original avatar"
    : "";

  const toggleCustom = hasCustom
    ? (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        const isOrig = showingOriginalAvatars.get(friend.login) ?? false;
        showingOriginalAvatars.set(friend.login, !isOrig);
        renderWidgetUI();
      }
    : undefined;

  return html`
    <!-- Avatar column -->
    <div class="shrink-0">
      <a
        href="https://profile-v3.intra.42.fr/users/${friend.login}"
        target="_blank"
        rel="noopener noreferrer"
        class="flex flex-col items-center gap-1"
        @click="${(e: Event) => e.stopPropagation()}"
      >
        ${currentSrc
          ? html`<div class="avatar ${friend.isOnline ? "avatar-online" : ""}">
              ${showCustom
                ? html`<div
                    class="w-14 h-14 rounded-full ${medalClass} cursor-pointer"
                    style="background-image:url(${currentSrc});background-size:${friend.avatarScale ??
                    100}%;background-position:${friend.avatarPosX ??
                    50}% ${friend.avatarPosY ??
                    50}%;background-color:${friend.avatarBg || "transparent"};background-repeat:no-repeat;"
                    data-tip="${toggleTitle}"
                    @click="${toggleCustom}"
                  ></div>`
                : html`<div class="w-14 h-14 rounded-full ${medalClass}">
                    <img
                      src="${currentSrc}"
                      alt="${friend.login}"
                      loading="lazy"
                      data-tip="${toggleTitle}"
                      @click="${toggleCustom}"
                      @error="${(e: Event) => {
                        const img = e.target as HTMLImageElement;
                        if (img.dataset.fallback === "letter") return;
                        if (
                          hasCustom &&
                          !img.dataset.fallback &&
                          friend.avatar
                        ) {
                          img.dataset.fallback = "42";
                          img.src = friend.avatar;
                          return;
                        }
                        img.dataset.fallback = "letter";
                        const container = img.closest(".avatar");
                        if (!container) return;
                        const wrapper =
                          container.querySelector<HTMLElement>(".w-14");
                        if (!wrapper) return;
                        render(
                          html`<span class="text-base font-bold"
                            >${friend.login[0].toUpperCase()}</span
                          >`,
                          wrapper,
                        );
                        container.classList.add("avatar-placeholder");
                        container.classList.remove("avatar-online");
                        img.remove();
                      }}"
                    />
                  </div>`}
            </div>`
          : html`<div
              class="avatar avatar-placeholder ${friend.isOnline
                ? "avatar-online"
                : ""}"
            >
              <div class="w-14 h-14 rounded-full ${medalClass}">
                <span class="text-base font-bold"
                  >${friend.login[0].toUpperCase()}</span
                >
              </div>
            </div>`}
        <div
          class="badge badge-primary badge-md font-bold text-md px-2.5 py-1.5"
        >
          ${friend.level.toFixed(2)}
        </div>
      </a>
    </div>

    <!-- Main info -->
    <a
      href="https://profile-v3.intra.42.fr/users/${friend.login}"
      target="_blank"
      rel="noopener noreferrer"
      class="no-underline text-base-content"
      @click="${(e: Event) => e.stopPropagation()}"
    >
      <!-- Login + display name + status inline -->
      <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
        <span class="font-bold text-base">${friend.login}</span>
        ${friend.displayName && friend.displayName !== friend.login
          ? html`<span class="text-xs opacity-70 truncate"
              >${friend.displayName}</span
            >`
          : ""}
        ${friend.isOnline && friend.lastSeen
          ? html`<a
              href="${clusterUrl(friend.lastSeen)}"
              target="_blank"
              rel="noopener noreferrer"
              class="badge badge-success badge-sm shrink-0 hover:brightness-110 transition-all cursor-pointer no-underline"
              data-tip="View ${friend.lastSeen} on cluster map"
              >${friend.lastSeen}</a
            >`
          : ""}
      </div>

      <!-- Grade + pool -->
      ${friend.grade
        ? html` <div class="text-sm opacity-60 truncate mb-1.5">
            ${friend.grade}
            ${friend.poolLabel
              ? html`<span class="opacity-80">· ${friend.poolLabel}</span>`
              : ""}
          </div>`
        : ""}

      <!-- Bigger level bar -->
      <div class="mb-1">${renderLevelBar(friend.level)}</div>
    </a>

    <!-- Stats column (right-aligned) -->
    <div class="flex flex-col items-end gap-1.5 shrink-0 justify-center">
      <div class="flex items-center gap-1.5" data-tip="Wallet">
        <span class="text-xl opacity-40">₳</span>
        <span class="text-base font-bold opacity-80">${friend.wallet}</span>
      </div>
      <div class="flex items-center gap-1.5" data-tip="Correction points">
        <span class="text-xl opacity-40">✦</span>
        <span class="text-base font-bold opacity-80"
          >${friend.correctionPoints}</span
        >
      </div>
      ${!friend.isOnline && friend.lastOnlineTimestamp
        ? html`<div
            class="text-xs opacity-60 font-medium"
            data-tip="Last seen online"
          >
            ${formatTimeAgo(friend.lastOnlineTimestamp)}
          </div>`
        : ""}
    </div>

    <!-- Delete button (far right) -->
    <div
      class="opacity-0 group-hover:opacity-70 hover:opacity-100! transition-opacity shrink-0"
    >
      <button
        class="btn btn-ghost btn-sm btn-circle text-error"
        data-tip="Remove friend"
        @click="${(e: Event) => {
          e.stopPropagation();
          onRemove(friend.login);
        }}"
      >
        ✕
      </button>
    </div>
  `;
}

function formatTimeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}

function clusterUrl(location: string): string {
  const cluster = CLUSTERS.find((c) => location.startsWith(c.name));
  const hash = cluster ? `#cluster-${cluster.id}` : "";
  return `https://meta.intra.42.fr/clusters?seat=${location}${hash}`;
}

function renderEmpty() {
  return html`
    <div class="flex flex-col items-center gap-2 py-16 opacity-40">
      <span class="w-16 h-16 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
        >${unsafeHTML(FRIENDS_SVG)}</span
      >
      <p class="text-sm font-bold">No friends yet</p>
      <p class="text-xs">Add one using the input below</p>
    </div>
  `;
}

type SortMode = "online" | "name" | "level" | "wallet" | "correction";

function sortFriends(friends: FriendData[], mode: SortMode): FriendData[] {
  const sorted = [...friends];
  switch (mode) {
    case "online":
      sorted.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.login.localeCompare(b.login);
      });
      break;
    case "name":
      sorted.sort((a, b) => a.login.localeCompare(b.login));
      break;
    case "level":
      sorted.sort((a, b) => b.level - a.level);
      break;
    case "wallet":
      sorted.sort((a, b) => b.wallet - a.wallet);
      break;
    case "correction":
      sorted.sort((a, b) => b.correctionPoints - a.correctionPoints);
      break;
  }
  return sorted;
}

interface WidgetState {
  open: boolean;
  loading: boolean;
  friends: FriendData[];
  sortBy: SortMode;
  addInput: string;
  addLoading: boolean;
  addError: string;
  lastFetch: number | null;
  theme: string;
  needsReconnect: boolean;
  notConnected: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onRemove: (login: string) => void;
  onSortChange: (mode: SortMode) => void;
  onInputChange: (val: string) => void;
  onAdd: () => void;
  onConnect: () => void;
  showCustomAvatars: boolean;
}

const SORT_LABELS: Record<SortMode, string> = {
  online: "Online",
  name: "Name",
  level: "Level",
  wallet: "Wallet",
  correction: "Evaluation",
};

function renderSortSelect(current: SortMode, onChange: (m: SortMode) => void) {
  const modes: SortMode[] = ["online", "name", "level", "wallet", "correction"];
  return html`
    <select
      class="select select-bordered select-sm min-w-36 font-bold tracking-wide text-base-content"
      @change="${(e: Event) =>
        onChange((e.target as HTMLSelectElement).value as SortMode)}"
      data-tip="Sort by"
    >
      ${modes.map(
        (m) => html`
          <option
            value="${m}"
            ?selected="${current === m}"
            class="bg-base-100 text-base-content"
          >
            Sort: ${SORT_LABELS[m]}
          </option>
        `,
      )}
    </select>
  `;
}

function renderWidget(state: WidgetState) {
  const onlineCount = state.friends.filter((f) => f.isOnline).length;
  const sorted = sortFriends(state.friends, state.sortBy);

  return html`
    <style>
      ${sharedCSS} :host {
        display: block;
      }

      @keyframes rainbow-shift {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: 0% 0;
        }
      }

      .medal-glow-gold,
      .medal-glow-silver,
      .medal-glow-rainbow {
        box-sizing: content-box;
        border-width: 3px;
        border-style: solid;
      }
      .medal-glow-gold {
        border-color: #ffd700;
        box-shadow: 0 0 6px 2px #ffd700;
      }
      .medal-glow-silver {
        border-color: #c0c0c0;
        box-shadow: 0 0 6px 2px #c0c0c0;
      }
      .medal-glow-rainbow {
        border-color: #ff6a00;
        box-shadow: 0 0 6px 2px #ff6a00;
      }

      .badge-rainbow {
        background: linear-gradient(
          90deg,
          #ff0000,
          #ff7f00,
          #ffeb3b,
          #4caf50,
          #00bcd4,
          #2196f3,
          #3f51b5,
          #9c27b0,
          #e91e63,
          #ff0000
        );
        background-size: 200% 100% !important;
        animation: rainbow-shift 5s linear infinite !important;
        border: none !important;
        color: white !important;
        text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
      }

      .friends-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
      }

      .friends-fab .btn-circle {
        width: clamp(48px, 6vw, 72px) !important;
        height: clamp(48px, 6vw, 72px) !important;
        min-width: unset !important;
      }

      .friends-fab .swap {
        width: 30px;
        height: 30px;
      }

      .friends-fab .swap > * {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .friends-fab .swap-off svg {
        width: 100%;
        height: 100%;
      }

      .friends-dropdown {
        position: fixed;
        bottom: calc(clamp(48px, 6vw, 72px) + 32px);
        right: 24px;
        z-index: 9998;
        width: 480px;
        max-height: 640px;
        display: flex;
        flex-direction: column;
        transform-origin: bottom right;
        transition:
          opacity 0.15s ease,
          transform 0.15s ease;
      }

      .friends-dropdown.closed {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.95) translateY(8px);
      }

      .friends-list {
        overflow-y: auto;
        flex: 1;
        scrollbar-width: thin;
      }
    </style>

    <div data-theme="${state.theme}"
      <!-- FAB -->
      <div class="friends-fab">
        <div class="indicator">
          ${
            onlineCount > 0 && !state.needsReconnect
              ? html`<span
                  class="indicator-item badge badge-success badge-sm font-bold min-w-6 px-1.5"
                  >${onlineCount}</span
                >`
              : ""
          }
          <button
            type="button"
            class="btn btn-circle btn-lg ${state.needsReconnect ? "btn-error" : "btn-primary"} shadow-xl"
            @click="${state.needsReconnect ? state.onConnect : state.onToggle}"
            data-tip="${state.needsReconnect ? "Token expired — reconnect" : state.open ? "Close" : "Friends"}"
          >
            ${
              state.needsReconnect
                ? html`<div class="swap">
                    <span
                      class="swap-on flex items-center justify-center w-8 h-8 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                      >${unsafeHTML(WARNING_SVG)}</span
                    >
                    <span
                      class="swap-off flex items-center justify-center w-8 h-8 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                      >${unsafeHTML(WARNING_SVG)}</span
                    >
                  </div>`
                : html`
                    <div class="swap ${state.open ? "swap-active" : ""}">
                      <span class="swap-on text-3xl">✕</span>
                      <span
                        class="swap-off flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                        >${unsafeHTML(FRIENDS_SVG)}</span
                      >
                    </div>
                  `
            }
          </button>
        </div>
      </div>

      <!-- Dropdown -->
      <div
        class="friends-dropdown card card-border bg-base-100 shadow-xl ${
          state.open ? "" : "closed"
        }"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-base-300 bg-base-200/50 shrink-0"
        >
          <div class="flex items-center gap-2.5">
            <span class="font-bold text-lg text-base-content">Friends</span>
            ${
              state.friends.length > 0
                ? html`<span class="badge badge-primary badge-md font-bold"
                    >${state.friends.length}</span
                  >`
                : ""
            }
            ${
              onlineCount > 0
                ? html`<span class="badge badge-success badge-md font-bold"
                    >${onlineCount} online</span
                  >`
                : ""
            }
          </div>
          <div class="flex items-center gap-2">
            ${
              state.friends.length > 0
                ? renderSortSelect(state.sortBy, state.onSortChange)
                : ""
            }
            <button
              type="button"
              class="btn btn-sm btn-square opacity-50 hover:opacity-100 ${
                state.loading ? "loading" : ""
              } ${
                state.lastFetch && Date.now() - state.lastFetch < 60000
                  ? "btn-outline btn-success"
                  : "btn-ghost"
              }"
              data-tip="${
                state.lastFetch
                  ? `Updated ${formatTimeAgo(state.lastFetch)}`
                  : "Not yet updated"
              }"
              @click="${state.onRefresh}"
            >
              <div class="swap ${state.loading ? "swap-active" : ""}">
                <span class="swap-on loading loading-spinner loading-xs"></span>
                <span class="swap-off text-lg">↻</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Friend list -->
        <div class="friends-list">
          ${
            state.notConnected
              ? html`<div
                  class="flex flex-col items-center gap-4 py-12 px-6 text-center"
                >
                  <span
                    class="w-16 h-16 opacity-40 mb-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
                    >${unsafeHTML(FRIENDS_SVG)}</span
                  >
                  <p class="opacity-50 max-w-88">
                    See who's online, track levels, wallets, and correction
                    points for your 42 friends at a glance.
                  </p>
                  <button
                    type="button"
                    class="btn bg-[#00babc] text-white border-none hover:bg-[#1fd2d4] flex items-center justify-center gap-3 mt-2"
                    style="height:3rem; min-width:15rem; font-size:1rem;"
                    @click="${state.onConnect}"
                  >
                    <span class="font-bold tracking-wide">Connect with</span>
                    <span
                      class="size-8 flex items-center justify-center [&_polygon]:fill-current"
                    >
                      ${unsafeHTML(FORTY_TWO_SVG)}
                    </span>
                  </button>
                </div>`
              : state.needsReconnect
                ? html`<div
                    class="flex flex-col items-center gap-3 py-12 px-6 text-center"
                  >
                    <span class="text-lg font-bold opacity-60"
                      >Session expired</span
                    >
                    <p class="text-sm opacity-50">Please reconnect.</p>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm font-bold mt-2"
                      @click="${state.onConnect}"
                    >
                      Reconnect
                    </button>
                  </div>`
                : state.loading && state.friends.length === 0
                  ? html`<div class="flex justify-center py-12">
                      <span class="loading loading-spinner loading-md"></span>
                    </div>`
                  : state.friends.length === 0
                    ? renderEmpty()
                    : html`<ul class="list text-base-content">
                        ${sorted.map(
                          (f, i) =>
                            html`<li class="list-row group">
                              ${renderFriendRow(
                                f,
                                state.onRemove,
                                state.sortBy === "level" ? i : -1,
                                state.showCustomAvatars,
                              )}
                            </li>`,
                        )}
                      </ul>`
          }
        </div>

        <!-- Add friend footer (only when connected) -->
        ${
          !state.notConnected && !state.needsReconnect
            ? html`<div
                class="px-5 py-4 border-t border-base-300 bg-base-200/30 shrink-0"
              >
                <div class="join w-full">
                  <input
                    type="text"
                    class="input input-bordered input-sm join-item flex-1"
                    placeholder="Add friend by login..."
                    .value="${state.addInput}"
                    @input="${(e: Event) =>
                      state.onInputChange(
                        (e.target as HTMLInputElement).value,
                      )}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === "Enter") state.onAdd();
                    }}"
                    ?disabled="${state.addLoading}"
                  />
                  <button
                    type="button"
                    class="btn btn-sm btn-primary join-item font-bold ${state.addLoading
                      ? "loading"
                      : ""}"
                    @click="${state.onAdd}"
                    ?disabled="${state.addLoading || !state.addInput.trim()}"
                  >
                    ${state.addLoading ? "" : "Add"}
                  </button>
                </div>
                ${state.addError
                  ? html`<p class="text-error text-sm mt-1.5 px-0.5">
                      ${state.addError}
                    </p>`
                  : ""}
              </div>`
            : ""
        }
      </div>
    </div>
  `;
}

let _host: HTMLElement | null = null;
let _shadow: ShadowRoot | null = null;
let _state: WidgetState | null = null;

function renderWidgetUI() {
  if (_state && _shadow) render(renderWidget(_state), _shadow);
}

export async function injectFriendsWidget() {
  if (_host) return;

  const show = await getConfig("SHOW_FRIENDS_WIDGET");
  if (!show) return;

  if (CLUSTERS.length === 0) {
    const campus = await getConfig("CLUSTERS_CAMPUS");
    await getClusterData(campus);
  }

  _host = document.createElement("div");
  _host.id = HOST_ID;
  document.body.appendChild(_host);
  _shadow = _host.attachShadow({ mode: "open" });
  bindTooltips(_shadow, getIsLight);

  const token = await getConfig("CLOUD_TOKEN");
  const authFailed = !!(await getConfig("CLOUD_AUTH_FAILED"));

  const effectiveTheme = await getEffectiveTheme();
  const presetKey = await getConfig("PROFILE_THEME_PRESET");
  const daisyTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : effectiveTheme === "light"
        ? "light"
        : "dark";

  _state = {
    open: false,
    loading: false,
    friends: [],
    sortBy: await getConfig("FRIENDS_SORT_MODE"),
    addInput: "",
    addLoading: false,
    addError: "",
    lastFetch: null,
    theme: daisyTheme,
    needsReconnect: !!token && authFailed,
    notConnected: !token,
    showCustomAvatars: await getConfig("SHOW_CUSTOM_AVATARS_IN_FRIENDS"),
    onToggle: () => {
      if (!_state) return;
      _state.open = !_state.open;
      renderWidgetUI();
    },
    onRefresh: async () => {
      if (!_state || _state.notConnected) return;
      _state.loading = true;
      renderWidgetUI();
      clearFriendsCache();
      const list = await getFriendsList();
      _state.friends = await fetchFriendsData(list);
      _state.lastFetch = Date.now();
      _state.loading = false;
      if (_state.needsReconnect) {
        _state.needsReconnect = !!(await getConfig("CLOUD_AUTH_FAILED"));
      }
      renderWidgetUI();
    },
    onSortChange: (mode: SortMode) => {
      if (!_state) return;
      _state.sortBy = mode;
      chrome.storage.local.set({ FRIENDS_SORT_MODE: mode });
      renderWidgetUI();
    },
    onRemove: async (login: string) => {
      if (!_state) return;
      const name =
        _state.friends.find((f) => f.login === login)?.displayName || login;
      if (!confirm(`Remove ${name} from your friends list?`)) return;
      await removeFriend(login);
      _state.friends = _state.friends.filter((f) => f.login !== login);
      renderWidgetUI();
      syncToCloud();
    },
    onInputChange: (val: string) => {
      if (!_state) return;
      _state.addInput = val;
      _state.addError = "";
      renderWidgetUI();
    },
    onAdd: async () => {
      if (!_state || _state.notConnected) return;
      const login = _state.addInput.trim().toLowerCase();
      if (!login) return;

      _state.addLoading = true;
      _state.addError = "";
      renderWidgetUI();

      if (await isFriend(login)) {
        _state.addError = "Already in your list.";
        _state.addLoading = false;
        renderWidgetUI();
        return;
      }

      await addFriend(login);

      const fresh = await fetchFriendsData([login]);
      if (_state.needsReconnect) {
        _state.needsReconnect = !!(await getConfig("CLOUD_AUTH_FAILED"));
      }
      if (fresh.length === 0) {
        await removeFriend(login);
        _state.addError = "User not found.";
        _state.addLoading = false;
        renderWidgetUI();
        return;
      }

      _state.friends = [..._state.friends, ...fresh];
      _state.lastFetch = Date.now();
      _state.addInput = "";
      _state.addLoading = false;
      clearFriendsCache();
      renderWidgetUI();
      _shadow?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      syncToCloud();
    },
    onConnect: () => {
      loginWith42(async () => {
        if (_state) _state.needsReconnect = false;
        await clearAuthFailed();
        await chrome.storage.local.set({ PENDING_SETTINGS_PULL: true });
        window.location.reload();
      });
    },
  };

  renderWidgetUI();

  if (!_state.notConnected && !_state.needsReconnect) {
    _state.loading = true;
    renderWidgetUI();
    const list = await getFriendsList();
    _state.friends = await fetchFriendsData(list);
    _state.lastFetch = Date.now();
    _state.loading = false;
  }

  renderWidgetUI();

  const closeOnOutsideClick = (e: Event) => {
    if (!_state || !_state.open) return;
    if (e.composedPath().includes(_host!)) return;
    _state.open = false;
    renderWidgetUI();
  };
  document.addEventListener("click", closeOnOutsideClick);

  const pendingPull = (await chrome.storage.local.get("PENDING_SETTINGS_PULL"))
    .PENDING_SETTINGS_PULL;
  if (pendingPull) {
    await chrome.storage.local.remove("PENDING_SETTINGS_PULL");
    const settings = await fetchMySettings();
    if (settings) {
      await applyCloudSettings(settings);
      window.location.reload();
      return;
    }
  }
}
