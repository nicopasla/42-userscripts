import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { getConfig, VISUAL_CLOUD_KEYS } from "../../config.ts";
import {
  fetchMySettings,
  loginWith42,
  clearAuthFailed,
  syncMyVisuals,
} from "../account/account.ts";
import { applyImgs, injectCustomStyles, VisualUrls } from "./visuals.ts";
import { getTitleBadges, applyBadgeLayout } from "./badges.ts";
import { getEffectiveTheme } from "./theme/theme-manager.ts";
import { sharedCSS } from "../../assets/shared-styles.ts";
import LINK_SVG from "../../assets/svg/link.svg?raw";
import GRIP_VERTICAL_SVG from "../../assets/svg/grip-vertical.svg?raw";
import EYE_SVG from "../../assets/svg/eye.svg?raw";
import EYE_SLASH_SVG from "../../assets/svg/eye-slash.svg?raw";
import { renderAvatarEditor } from "./avatar-editor.ts";
import { uploadImage } from "./image-upload.ts";
import FORTY_TWO_SVG from "../../assets/svg/42_Logo.svg?raw";
import TRIANGLE_EXCLAMATION_SVG from "../../assets/svg/triangle-exclamation.svg?raw";

interface FormState {
  avatar: string;
  banner: string;
  bannerMode: string;
  bannerColor: string;
  background: string;
  backgroundMode: string;
  backgroundColor: string;
  avatarBg: string;
  decoration: string;
  avatarPosX: number;
  avatarPosY: number;
  avatarScale: number;
  badgeBg: string;
  badgeOrder: string[];
  badgeWrap: boolean;
  uploading: string;
}

type ProfileTab = "avatar" | "banner" | "background" | "badges";

let activeTab: ProfileTab = "avatar";
let badgeDragIdx: number | null = null;

function addToHistory(url: string, history: string[]): string[] {
  if (!url) return history;
  const filtered = history.filter((h) => h !== url);
  return [url, ...filtered].slice(0, 10);
}

function extractLabel(url: string): string {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(segs[segs.length - 1] || "");
    if (last.length > 25) return last.slice(0, 22) + "...";
    if (last) return last;
  } catch {}
  return url.length > 25 ? url.slice(0, 22) + "..." : url;
}

function renderUrlHistory(
  history: string[],
  onSelect: (val: string) => void,
  onClear?: () => void,
) {
  if (history.length === 0) return html``;
  return html`
    <div class="flex flex-wrap gap-1 mt-2">
      ${history.map(
        (url) => html`
          <button
            type="button"
            class="rounded-lg border border-base-300 hover:border-accent"
            data-tip="${url}"
            @click="${() => onSelect(url)}"
            style="background-image: url(${url}); background-size: cover; background-position: center; width: 2rem; height: 2rem; flex-shrink: 0; border-radius: 0.5rem; cursor: pointer;"
          ></button>
        `,
      )}
      ${onClear
        ? html`<button
            type="button"
            class="rounded-lg border border-base-300 text-xs font-bold opacity-50 hover:opacity-100 hover:border-error"
            style="width: 2rem; height: 2rem; flex-shrink: 0; cursor: pointer; background: none;"
            data-tip="Clear history"
            @click=${onClear}
          >
            ✕
          </button>`
        : ""}
    </div>
  `;
}
function renderUrlField(
  id: string,
  label: string,
  value: string,
  onInput: (val: string) => void,
  history: string[] = [],
  uploadKey = "",
  uploading = "",
  onClearHistory?: () => void,
) {
  const isUploading = uploading === uploadKey;
  return html`
    <div class="form-control w-full">
      <label class="label py-1">
        <span class="label-text opacity-80">${label}</span>
      </label>
      <div class="flex gap-2 items-stretch">
        <label
          class="input input-accent validator flex items-center gap-2 flex-1"
        >
          <span class="h-[1em] opacity-50 flex items-center justify-center"
            >${unsafeHTML(LINK_SVG)}</span
          >
          <input
            type="url"
            required
            placeholder="https://example.com/image.png"
            .value="${value}"
            pattern="^(https?://)?.*"
            class="grow"
            @input="${(e: Event) =>
              onInput((e.target as HTMLInputElement).value)}"
          />
        </label>
        <button
          type="button"
          class="btn btn-accent shrink-0"
          ?disabled="${isUploading}"
          id="${id}-upload-btn"
        >
          ${isUploading
            ? html`<span class="loading loading-spinner loading-xs"></span>`
            : "Upload"}
        </button>
      </div>
      ${renderUrlHistory(history, onInput, onClearHistory)}
    </div>
  `;
}

function renderModeRadios(
  name: string,
  currentValue: string,
  onChange: (val: string) => void,
) {
  const modes = ["fill", "fit", "stretch", "center", "tile"];
  return html`
    <div class="join w-full mt-4">
      ${modes.map(
        (m) =>
          html`<input
            type="radio"
            name="${name}"
            class="btn btn-sm join-item flex-1"
            aria-label="${m.charAt(0).toUpperCase() + m.slice(1)}"
            value="${m}"
            ?checked="${currentValue === m}"
            @change="${(e: Event) =>
              onChange((e.target as HTMLInputElement).value)}"
          />`,
      )}
    </div>
  `;
}

function renderPanelContent(
  state: FormState,
  currentTheme: string,
  onFormUpdate: (updates: Partial<FormState>) => void,
  history: { avatar: string[]; banner: string[]; background: string[] },
  onUpload: (key: string) => void,
  onClearHistory: (key: "avatar" | "banner" | "background") => void,
  isConnected: boolean,
  needsReconnect: boolean,
  onConnect: () => void,
  onTabChange: (tab: ProfileTab) => void,
) {
  const isTransparent = state.avatarBg === "transparent";

  const tabItems: { id: ProfileTab; label: string }[] = [
    { id: "avatar", label: "Avatar" },
    { id: "banner", label: "Banner" },
    { id: "background", label: "Background" },
    { id: "badges", label: "Badges" },
  ];

  const avatarPanel = html`
    <div class="rounded-box border border-base-300 bg-base-200/50 p-3">
      <div class="flex gap-5 items-start">
        <div class="flex-1 min-w-0">
          ${renderUrlField(
            "PROFILE_IMAGE_URL",
            "Image URL",
            state.avatar,
            (val) => onFormUpdate({ avatar: val }),
            history.avatar,
            "avatar",
            state.uploading,
            () => onClearHistory("avatar"),
          )}
          <div class="flex gap-2 items-center mt-2">
            <div class="join w-full">
              <input
                type="radio"
                name="PROFILE_AVATAR_BG_MODE"
                class="btn btn-sm join-item flex-1"
                aria-label="Transparent"
                value="transparent"
                ?checked="${isTransparent}"
                @change="${() => onFormUpdate({ avatarBg: "transparent" })}"
              />
              <input
                type="radio"
                name="PROFILE_AVATAR_BG_MODE"
                class="btn btn-sm join-item flex-1"
                aria-label="Color"
                value="custom"
                ?checked="${!isTransparent}"
                @change="${() => onFormUpdate({ avatarBg: "#00bcba" })}"
              />
            </div>
            <div
              id="ft-avatar-bg-color-wrap"
              class="${isTransparent ? "hidden" : ""}"
            >
              <input
                type="color"
                id="PROFILE_AVATAR_BG_COLOR"
                class="input input-bordered input-sm p-1 h-8 w-14"
                .value="${isTransparent ? "#00bcba" : state.avatarBg}"
                @input="${(e: Event) =>
                  onFormUpdate({
                    avatarBg: (e.target as HTMLInputElement).value,
                  })}"
              />
            </div>
          </div>
          <div class="pt-2">
            <span class="text-xs opacity-60">Border</span>
            <div class="join w-full mt-1">
              <input
                type="radio"
                name="PROFILE_DECORATION"
                class="btn btn-sm join-item flex-1"
                aria-label="None"
                value="none"
                ?checked="${state.decoration === "none"}"
                @change="${() => onFormUpdate({ decoration: "none" })}"
              />
              <input
                type="radio"
                name="PROFILE_DECORATION"
                class="btn btn-sm join-item flex-1"
                aria-label="Solid"
                value="solid"
                ?checked="${state.decoration === "solid"}"
                @change="${() => onFormUpdate({ decoration: "solid" })}"
              />
            </div>
          </div>
        </div>

        <div class="w-64 shrink-0 flex flex-col items-start">
          ${state.avatar
            ? renderAvatarEditor(
                {
                  url: state.avatar,
                  posX: state.avatarPosX,
                  posY: state.avatarPosY,
                  scale: state.avatarScale,
                  bgColor: state.avatarBg,
                  decoration: state.decoration,
                },
                (changes) => {
                  const updates: Partial<FormState> = {};
                  if (changes.scale !== undefined)
                    updates.avatarScale = changes.scale;
                  if (changes.posX !== undefined)
                    updates.avatarPosX = changes.posX;
                  if (changes.posY !== undefined)
                    updates.avatarPosY = changes.posY;
                  onFormUpdate(updates);
                },
              )
            : html`<div
                class="w-52 h-52 rounded-full bg-base-300 flex items-center justify-center"
              >
                <span class="text-xs opacity-50">No avatar URL set</span>
              </div>`}
        </div>
      </div>
    </div>
  `;

  const bannerPanel = html`
    <div class="rounded-box border border-base-300 bg-base-200/50 p-3">
      <div
        class="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3"
      >
        Banner
      </div>
      ${state.bannerColor
        ? ""
        : html`${renderUrlField(
            "PROFILE_BANNER_URL",
            "Image URL",
            state.banner,
            (val) => onFormUpdate({ banner: val }),
            history.banner,
            "banner",
            state.uploading,
            () => onClearHistory("banner"),
          )}
          ${renderModeRadios("PROFILE_BANNER_MODE", state.bannerMode, (val) =>
            onFormUpdate({ bannerMode: val }),
          )}`}
      ${state.bannerColor
        ? html`<div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text opacity-80">Color</span>
            </label>
            <input
              type="color"
              class="input input-bordered w-full h-10 p-1"
              .value="${state.bannerColor}"
              @input="${(e: Event) =>
                onFormUpdate({
                  bannerColor: (e.target as HTMLInputElement).value,
                })}"
            />
          </div>`
        : ""}
      <div class="join w-full mt-2">
        <input
          type="radio"
          name="PROFILE_BANNER_TYPE"
          class="btn btn-sm join-item flex-1"
          aria-label="Image"
          value="image"
          ?checked="${!state.bannerColor}"
          @change="${() => onFormUpdate({ bannerColor: "", banner: "" })}"
        />
        <input
          type="radio"
          name="PROFILE_BANNER_TYPE"
          class="btn btn-sm join-item flex-1"
          aria-label="Color"
          value="color"
          ?checked="${state.bannerColor !== ""}"
          @change="${() =>
            onFormUpdate({ bannerColor: "#333333", banner: "" })}"
        />
      </div>
    </div>
  `;

  const backgroundPanel = html`
    <div class="rounded-box border border-base-300 bg-base-200/50 p-3">
      <div
        class="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3"
      >
        Background
      </div>
      ${state.backgroundColor
        ? ""
        : html`${renderUrlField(
            "PROFILE_BACKGROUND_URL",
            "Image URL",
            state.background,
            (val) => onFormUpdate({ background: val }),
            history.background,
            "background",
            state.uploading,
            () => onClearHistory("background"),
          )}
          ${renderModeRadios(
            "PROFILE_BACKGROUND_MODE",
            state.backgroundMode,
            (val) => onFormUpdate({ backgroundMode: val }),
          )}`}
      ${state.backgroundColor
        ? html`<div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text opacity-80">Color</span>
            </label>
            <input
              type="color"
              class="input input-bordered w-full h-10 p-1"
              .value="${state.backgroundColor}"
              @input="${(e: Event) =>
                onFormUpdate({
                  backgroundColor: (e.target as HTMLInputElement).value,
                })}"
            />
          </div>`
        : ""}
      <div class="join w-full mt-2">
        <input
          type="radio"
          name="PROFILE_BACKGROUND_TYPE"
          class="btn btn-sm join-item flex-1"
          aria-label="Image"
          value="image"
          ?checked="${!state.backgroundColor}"
          @change="${() =>
            onFormUpdate({ backgroundColor: "", background: "" })}"
        />
        <input
          type="radio"
          name="PROFILE_BACKGROUND_TYPE"
          class="btn btn-sm join-item flex-1"
          aria-label="Color"
          value="color"
          ?checked="${state.backgroundColor !== ""}"
          @change="${() =>
            onFormUpdate({ backgroundColor: "#333333", background: "" })}"
        />
      </div>
    </div>
  `;

  const liveBadges = getTitleBadges(document).map((b) => b.title);
  const normalizedOrder = state.badgeOrder.filter((n) => !n.startsWith("-"));
  const knownHidden = new Set(
    state.badgeOrder
      .filter((n) => n.startsWith("-"))
      .map((n) => n.substring(1).trim().toLowerCase()),
  );
  const mergedTitles = [
    ...normalizedOrder,
    ...liveBadges.filter((t) => !normalizedOrder.includes(t)),
  ];
  const badgeTitles = mergedTitles.filter(
    (t, i) => mergedTitles.indexOf(t) === i,
  );

  const setBadgeHidden = (title: string, hidden: boolean) => {
    const clean = state.badgeOrder
      .filter((n) => n.trim().toLowerCase() !== title.toLowerCase())
      .filter((n) => n !== `-${title}` && n.substring(1) !== title);
    const next = [...clean];
    if (hidden) next.push(`-${title}`);
    else next.push(title);
    const idx = badgeTitles.indexOf(title);
    if (idx === -1) next.push(title);
    onFormUpdate({ badgeOrder: next });
  };

  const moveBadge = (from: number, to: number) => {
    if (from === to) return;
    const list = [...badgeTitles];
    const [removed] = list.splice(from, 1);
    list.splice(to, 0, removed);
    const hidden = badgeTitles
      .filter((t) => knownHidden.has(t.toLowerCase()))
      .map((t) => `-${t}`);
    onFormUpdate({ badgeOrder: [...list, ...hidden] });
  };

  const badgesPanel = html`
    <div class="flex flex-col gap-3">
      <div class="flex gap-3 flex-col sm:flex-row">
        <div
          class="rounded-box border border-base-300 bg-base-200/50 p-3 flex-1 flex flex-col justify-center"
        >
          <div
            class="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3"
          >
            Background color
          </div>
          <div class="form-control">
            <div class="flex gap-2 items-center">
              <input
                type="color"
                class="input input-bordered w-full h-10 p-1"
                .value="${state.badgeBg || "#00babc"}"
                @input="${(e: Event) =>
                  onFormUpdate({
                    badgeBg: (e.target as HTMLInputElement).value,
                  })}"
              />
              <button
                type="button"
                class="btn btn-ghost btn-sm shrink-0"
                @click="${() => onFormUpdate({ badgeBg: "" })}"
              >
                Default
              </button>
            </div>
          </div>
        </div>

        <div
          class="rounded-box border border-base-300 bg-base-200/50 p-3 flex-1 flex flex-col justify-center"
        >
          <div class="form-control">
            <label
              class="flex items-center justify-between cursor-pointer gap-2"
            >
              <span class="label-text opacity-80"
                >Wrap onto multiple lines</span
              >
              <input
                type="checkbox"
                class="toggle toggle-sm shrink-0"
                .checked="${state.badgeWrap}"
                @change="${(e: Event) =>
                  onFormUpdate({
                    badgeWrap: (e.target as HTMLInputElement).checked,
                  })}"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="rounded-box border border-base-300 bg-base-200/50 p-3">
        <div
          class="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3"
        >
          Order & visibility
        </div>
        <div class="flex flex-wrap gap-3 items-center">
          <span class="text-xs opacity-50 w-full pb-1"
            >Drag to reorder · click the eye to hide</span
          >
          ${badgeTitles.map((title, idx) => {
            const isHidden = knownHidden.has(title.toLowerCase());
            return html`
              <div
                class="btn btn-sm border shadow-sm transition-all select-none gap-2 font-bold normal-case px-3 cursor-grab active:cursor-grabbing ${isHidden
                  ? "opacity-30 line-through saturate-50 scale-95"
                  : ""}"
                data-ft-badge-idx="${idx}"
                draggable="true"
                @dragstart="${(e: DragEvent) => {
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                  (e.currentTarget as HTMLElement).style.opacity = "0.3";
                  badgeDragIdx = idx;
                }}"
                @dragover="${(e: DragEvent) => e.preventDefault()}"
                @dragend="${(e: DragEvent) => {
                  (e.currentTarget as HTMLElement).style.opacity = "";
                  badgeDragIdx = null;
                }}"
                @drop="${(e: DragEvent) => {
                  e.preventDefault();
                  if (badgeDragIdx !== null) moveBadge(badgeDragIdx, idx);
                  badgeDragIdx = null;
                }}"
              >
                <span
                  class="size-3 shrink-0 opacity-40 pointer-events-none flex items-center justify-center"
                  >${unsafeHTML(GRIP_VERTICAL_SVG)}</span
                >
                <button
                  type="button"
                  class="p-1 -ml-1 rounded hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center text-white"
                  @click="${() => setBadgeHidden(title, !isHidden)}"
                  data-tip="${isHidden ? "Show badge" : "Hide badge"}"
                >
                  ${isHidden
                    ? html`<span
                        class="size-4 opacity-80 flex items-center justify-center"
                        >${unsafeHTML(EYE_SLASH_SVG)}</span
                      >`
                    : html`<span
                        class="size-4 opacity-60 flex items-center justify-center"
                        >${unsafeHTML(EYE_SVG)}</span
                      >`}
                </button>
                <span class="pointer-events-none">${title}</span>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;

  const panels: Record<ProfileTab, unknown> = {
    avatar: avatarPanel,
    banner: bannerPanel,
    background: backgroundPanel,
    badges: badgesPanel,
  };

  return html`
    <style>
      :host { display: block; }
      ${unsafeHTML(sharedCSS)}
    </style>
    <div
      data-theme="${currentTheme}"
      class="flex flex-col p-4 gap-3 bg-base-100 rounded-2xl"
    >
      <div class="flex justify-between items-center shrink-0">
        <button
          type="button"
          id="profile-reset-btn"
          class="btn btn-outline btn-error btn-sm"
        >
          Reset
        </button>
        <button class="btn btn-circle btn-ghost btn-sm" id="profile-close-btn">
          ✕
        </button>
      </div>

      ${!isConnected
        ? html`
            <div
              class="flex flex-col items-center gap-4 py-12 px-6 text-center"
            >
              <p class="opacity-50 max-w-72 text-sm">
                ${needsReconnect
                  ? "Session expired. Reconnect to customize your profile pictures."
                  : "Connect your 42 account to customize your profile pictures."}
              </p>
              <button
                type="button"
                class="btn bg-[#00babc] text-white border-none hover:bg-[#1fd2d4] flex items-center justify-center gap-3 mt-2"
                style="height:3rem; min-width:15rem; font-size:1rem;"
                @click="${onConnect}"
              >
                <span class="font-bold tracking-wide"
                  >${needsReconnect ? "Reconnect" : "Connect with"}</span
                >
                <span
                  class="size-8 flex items-center justify-center [&_polygon]:fill-current"
                >
                  ${unsafeHTML(FORTY_TWO_SVG)}
                </span>
              </button>
            </div>
          `
        : html`
            <div role="tablist" class="tabs tabs-box shrink-0">
              ${tabItems.map(
                (tab) => html`
                  <button
                    type="button"
                    role="tab"
                    aria-selected="${activeTab === tab.id}"
                    class="tab ${activeTab === tab.id ? "tab-active" : ""}"
                    @click="${() => onTabChange(tab.id)}"
                  >
                    ${tab.label}
                  </button>
                `,
              )}
            </div>

            <div
              role="tabpanel"
              style="min-height: 260px;"
              class="flex flex-col"
            >
              ${panels[activeTab]}
            </div>

            <button
              id="profile-save"
              class="btn btn-success font-bold shrink-0"
            >
              Save Changes
            </button>
          `}
    </div>
  `;
}

export const createSettingsModal = async (
  onSaveCallback: (updatedVisuals: VisualUrls) => void,
) => {
  if (document.getElementById("profile-modal-host")) return;

  activeTab = "avatar";

  const token = await getConfig("CLOUD_TOKEN");
  const authFailed = !!(await getConfig("CLOUD_AUTH_FAILED"));
  const isConnected = !!token && !authFailed;
  const needsReconnect = !!token && authFailed;

  const presetKey = (await getConfig("PROFILE_THEME_PRESET")) || "dark";
  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : await getEffectiveTheme();

  const dialog = Object.assign(document.createElement("dialog"), {
    id: "profile-modal-host",
    className: "bg-transparent backdrop:bg-black/50",
  });
  Object.assign(dialog.style, {
    marginTop: "auto",
    marginBottom: "5vh",
    width: "min(820px, calc(100dvw - 1.5rem))",
    maxHeight: "92vh",
    borderRadius: "1.5rem",
    overflowY: "auto",
    padding: "0",
  });

  const content = document.createElement("div");
  content.style.cssText = "width:100%;display:flex;flex-direction:column;";
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  const shadow = content.attachShadow({ mode: "open" });

  const skeleton = html`
    <style>
      :host { display: block; }
      ${unsafeHTML(sharedCSS)}
    </style>
    <div
      data-theme="${currentTheme}"
      class="flex flex-col p-4 gap-3 bg-base-100 rounded-2xl"
    >
      <div class="flex justify-between items-center">
        <div class="skeleton h-8 w-16"></div>
        <div class="skeleton h-8 w-8 rounded-full"></div>
      </div>
      <div class="flex gap-5">
        <div class="skeleton flex-1 h-64 rounded-xl"></div>
        <div class="skeleton flex-1 h-64 rounded-xl"></div>
      </div>
      <div class="flex gap-5">
        <div class="skeleton flex-1 h-48 rounded-xl"></div>
        <div class="skeleton flex-1 h-48 rounded-xl"></div>
      </div>
      <div class="skeleton h-12 w-full rounded-xl"></div>
    </div>
  `;

  render(skeleton, shadow);
  dialog.showModal();

  content.addEventListener("click", (e) => e.stopPropagation());
  dialog.addEventListener("click", () => close());

  if (isConnected) {
    const cloudSettings = await fetchMySettings();
    if (cloudSettings) {
      const visualData: Record<string, unknown> = {};
      for (const key of VISUAL_CLOUD_KEYS) {
        if (key in cloudSettings) {
          visualData[key] = (cloudSettings as Record<string, unknown>)[key];
        }
      }
      if (Object.keys(visualData).length > 0) {
        await chrome.storage.local.set(visualData);
      }
    }
  }

  const saved = {
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
    badgeBg: await getConfig("PROFILE_BADGE_BG"),
    badgeOrder: await getConfig("PROFILE_BADGE_ORDER"),
    badgeWrap: await getConfig("PROFILE_BADGE_WRAP"),
  };

  const state: FormState = { ...saved, uploading: "" };

  const imgHistory = {
    avatar: await getConfig("PROFILE_IMAGE_HISTORY"),
    banner: await getConfig("PROFILE_BANNER_HISTORY"),
    background: await getConfig("PROFILE_BACKGROUND_HISTORY"),
  };

  if (saved.avatar)
    imgHistory.avatar = addToHistory(saved.avatar, imgHistory.avatar);
  if (saved.banner)
    imgHistory.banner = addToHistory(saved.banner, imgHistory.banner);
  if (saved.background)
    imgHistory.background = addToHistory(
      saved.background,
      imgHistory.background,
    );

  const close = () => {
    dialog.close();
    dialog.remove();
  };

  const reset = async () => {
    if (!confirm("Reset visuals?")) return;
    await chrome.storage.local.remove([
      "PROFILE_IMAGE_URL",
      "PROFILE_BANNER_URL",
      "PROFILE_BANNER_MODE",
      "PROFILE_BANNER_COLOR",
      "PROFILE_BACKGROUND_URL",
      "PROFILE_BACKGROUND_MODE",
      "PROFILE_BACKGROUND_COLOR",
      "PROFILE_AVATAR_BG",
      "PROFILE_DECORATION",
      "PROFILE_AVATAR_POSITION_X",
      "PROFILE_AVATAR_POSITION_Y",
      "PROFILE_AVATAR_SCALE",
      "PROFILE_BADGE_BG",
      "PROFILE_BADGE_ORDER",
      "PROFILE_BADGE_WRAP",
    ]);
    close();
    location.reload();
  };

  const handleConnect42 = () => {
    loginWith42(async () => {
      await clearAuthFailed();
      window.location.reload();
    });
  };

  const showAlert = (message: string) => {
    const existing = document.getElementById("ft-alert-host");
    if (existing) existing.remove();

    const dlg = Object.assign(document.createElement("dialog"), {
      id: "ft-alert-host",
      className: "bg-transparent backdrop:bg-black/50",
    });
    Object.assign(dlg.style, {
      padding: "0",
      borderRadius: "1rem",
      maxWidth: "24rem",
    });

    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });

    render(
      html`
        <style>
          ${unsafeHTML(sharedCSS)}
        </style>
        <div
          data-theme="${currentTheme}"
          class="p-6 bg-base-100 rounded-2xl flex flex-col gap-4 text-center"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg">Better Intra</h3>
            <span
              class="w-8 h-8 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current text-red-500"
              >${unsafeHTML(TRIANGLE_EXCLAMATION_SVG)}</span
            >
          </div>
          <p class="opacity-70 text-sm">${message}</p>
          <button
            class="btn btn-primary btn-sm"
            @click="${() => {
              dlg.close();
              dlg.remove();
            }}"
          >
            OK
          </button>
        </div>
      `,
      shadow,
    );

    dlg.appendChild(host);
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) {
        dlg.close();
        dlg.remove();
      }
    });
  };

  const handleFormUpdate = (updates: Partial<FormState>) => {
    Object.assign(state, updates);
    liveApplyBannerBg(state);
    rerender();
  };

  const handleClearHistory = async (
    key: "avatar" | "banner" | "background",
  ) => {
    const historyKey =
      key === "avatar"
        ? "PROFILE_IMAGE_HISTORY"
        : key === "banner"
          ? "PROFILE_BANNER_HISTORY"
          : "PROFILE_BACKGROUND_HISTORY";
    imgHistory[key] = [];
    await chrome.storage.local.set({ [historyKey]: [] });
    rerender();
  };

  const handleUpload = async (key: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 7 * 1024 * 1024) {
        showAlert("File too large. Maximum size is 7 MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showAlert("Only image files are allowed.");
        return;
      }
      if (state.uploading) return;
      state.uploading = key;
      rerender();
      try {
        const url = await uploadImage(file);
        const updates: Partial<FormState> = {};
        if (key === "avatar") updates.avatar = url;
        else if (key === "banner") updates.banner = url;
        else if (key === "background") updates.background = url;
        handleFormUpdate(updates);
      } catch (e) {
        showAlert(`Upload failed: ${(e as Error).message}`);
      } finally {
        state.uploading = "";
        rerender();
      }
    };
    input.click();
  };

  const rerender = () => {
    render(
      renderPanelContent(
        state,
        currentTheme,
        handleFormUpdate,
        imgHistory,
        handleUpload,
        handleClearHistory,
        isConnected,
        needsReconnect,
        handleConnect42,
        (tab) => {
          activeTab = tab;
          rerender();
        },
      ),
      shadow,
    );
    bindButtons(shadow, close, reset);
    if (isConnected) bindUploadButtons(shadow, handleUpload);
  };

  injectCustomStyles();
  rerender();

  if (isConnected) {
    shadow
      .querySelector("#profile-save")
      ?.addEventListener("click", async () => {
        const batchData: Record<string, string | number | boolean | string[]> =
          {};
        const keysToRemove: string[] = [];

        if (!state.avatar) {
          keysToRemove.push("PROFILE_IMAGE_URL");
        } else {
          batchData["PROFILE_IMAGE_URL"] = state.avatar;
        }

        if (!state.banner) {
          keysToRemove.push("PROFILE_BANNER_URL", "PROFILE_BANNER_MODE");
        } else {
          batchData["PROFILE_BANNER_URL"] = state.banner;
          batchData["PROFILE_BANNER_MODE"] = state.bannerMode;
        }

        if (!state.bannerColor) {
          keysToRemove.push("PROFILE_BANNER_COLOR");
        } else {
          batchData["PROFILE_BANNER_COLOR"] = state.bannerColor;
        }

        if (!state.background) {
          keysToRemove.push(
            "PROFILE_BACKGROUND_URL",
            "PROFILE_BACKGROUND_MODE",
          );
        } else {
          batchData["PROFILE_BACKGROUND_URL"] = state.background;
          batchData["PROFILE_BACKGROUND_MODE"] = state.backgroundMode;
        }

        if (!state.backgroundColor) {
          keysToRemove.push("PROFILE_BACKGROUND_COLOR");
        } else {
          batchData["PROFILE_BACKGROUND_COLOR"] = state.backgroundColor;
        }

        batchData["PROFILE_AVATAR_BG"] = state.avatarBg;
        batchData["PROFILE_DECORATION"] = state.decoration;
        batchData["PROFILE_AVATAR_POSITION_X"] = state.avatarPosX;
        batchData["PROFILE_AVATAR_POSITION_Y"] = state.avatarPosY;
        batchData["PROFILE_AVATAR_SCALE"] = state.avatarScale;

        if (!state.badgeBg) {
          keysToRemove.push("PROFILE_BADGE_BG");
        } else {
          batchData["PROFILE_BADGE_BG"] = state.badgeBg;
        }

        batchData["PROFILE_BADGE_ORDER"] = state.badgeOrder;
        batchData["PROFILE_BADGE_WRAP"] = state.badgeWrap;

        if (Object.keys(batchData).length > 0)
          await chrome.storage.local.set(batchData as Record<string, unknown>);
        if (keysToRemove.length > 0)
          await chrome.storage.local.remove(keysToRemove);

        imgHistory.avatar = addToHistory(state.avatar, imgHistory.avatar);
        imgHistory.banner = addToHistory(state.banner, imgHistory.banner);
        imgHistory.background = addToHistory(
          state.background,
          imgHistory.background,
        );
        await chrome.storage.local.set({
          PROFILE_IMAGE_HISTORY: imgHistory.avatar,
          PROFILE_BANNER_HISTORY: imgHistory.banner,
          PROFILE_BACKGROUND_HISTORY: imgHistory.background,
        });

        const updatedVisuals: VisualUrls = {
          avatar: state.avatar || "",
          banner: state.banner || "",
          bannerMode: state.bannerMode || "fill",
          bannerColor: state.bannerColor || "",
          background: state.background || "",
          backgroundMode: state.backgroundMode || "fill",
          backgroundColor: state.backgroundColor || "",
          avatarBg: state.avatarBg,
          decoration: state.decoration,
          avatarPosX: state.avatarPosX,
          avatarPosY: state.avatarPosY,
          avatarScale: state.avatarScale,
          badgeBg: state.badgeBg || "",
        };

        try {
          await syncMyVisuals(updatedVisuals);
        } catch (e) {
          console.error("Failed to sync visuals:", e);
        }
        onSaveCallback(updatedVisuals);
        close();
      });
  }
};

function liveApplyBannerBg(state: FormState) {
  applyImgs({
    avatar: "",
    banner: state.bannerColor ? "" : state.banner,
    bannerMode: state.bannerMode,
    bannerColor: state.bannerColor,
    background: state.backgroundColor ? "" : state.background,
    backgroundMode: state.backgroundMode,
    backgroundColor: state.backgroundColor,
    avatarBg: state.avatarBg,
    decoration: state.decoration,
    badgeBg: state.badgeBg,
  });
  applyBadgeLayout(document, {
    order: state.badgeOrder,
    wrap: state.badgeWrap,
  });
}

function bindButtons(shadow: ShadowRoot, close: () => void, reset: () => void) {
  const resetBtn = shadow.querySelector(
    "#profile-reset-btn",
  ) as HTMLElement | null;
  const closeBtn = shadow.querySelector(
    "#profile-close-btn",
  ) as HTMLElement | null;
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.addEventListener("click", reset);
    resetBtn.dataset.bound = "1";
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener("click", close);
    closeBtn.dataset.bound = "1";
  }
}

function bindUploadButtons(
  shadow: ShadowRoot,
  onUpload: (key: string) => void,
) {
  const ids = [
    { id: "PROFILE_IMAGE_URL-upload-btn", key: "avatar" },
    { id: "PROFILE_BANNER_URL-upload-btn", key: "banner" },
    { id: "PROFILE_BACKGROUND_URL-upload-btn", key: "background" },
  ];
  for (const { id, key } of ids) {
    const btn = shadow.querySelector(`#${id}`) as HTMLElement | null;
    if (btn && !btn.dataset.bound) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        onUpload(key);
      });
      btn.dataset.bound = "1";
    }
  }
}
