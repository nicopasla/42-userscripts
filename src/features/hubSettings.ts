import { gmGetValue, gmSetValue } from "../lib/gm.ts";
import "../assets/style.css";
import {
  FEATURE_DEFS,
  HUB_INFO,
  FeatureId,
  STORAGE_KEY,
  FEATURE_IDS,
  FEATURE_PAGE_GUARDS,
  FEATURE_PAGE_URLS,
} from "./hubSettings.data.ts";
import GEAR_SVG from "../assets/settings_gear.svg?raw";

function isFeatureAllowedOnPage(
  id: FeatureId,
  loc: Location = location,
): boolean {
  return FEATURE_PAGE_GUARDS[id](loc);
}

function normalizeActive(raw: unknown): FeatureId[] {
  let parsed: unknown = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    return FEATURE_DEFS.map((f) => f.id);
  }

  const ids = parsed.filter((v): v is FeatureId =>
    FEATURE_IDS.has(v as FeatureId),
  );
  return ids.length ? ids : FEATURE_DEFS.map((f) => f.id);
}

export function getActiveFeatures(): FeatureId[] {
  const raw = gmGetValue<unknown>(STORAGE_KEY, null);
  const active = normalizeActive(raw);

  gmSetValue(STORAGE_KEY, JSON.stringify(active));
  return active;
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildDebugInfo(activeSelected?: FeatureId[]): string {
  const rawStored = gmGetValue<unknown>(STORAGE_KEY, null);
  const stored = normalizeActive(rawStored);
  const selected = activeSelected ?? stored;
  const allowedHere = selected.filter((id) => isFeatureAllowedOnPage(id));

  const hasV3Sidebar = !!findSidebarMainGroup();
  const hasLegacyNav = !!findLegacyNavList();
  const hasHeaderTarget = !!document.querySelector(
    ".flex.flex-row.grow.h-16.gap-3",
  );
  const gear = document.getElementById("hub-gear-btn");

  const featureMatrix = FEATURE_DEFS.map((f) => {
    const enabled = selected.includes(f.id);
    const allowed = isFeatureAllowedOnPage(f.id);
    return `${f.id}=enabled:${enabled},allowed_here:${allowed}`;
  }).join(" | ");

  return [
    `name=${HUB_INFO.name}`,
    `version=${HUB_INFO.version}`,
    `author=${HUB_INFO.author}`,
    `license=${HUB_INFO.license}`,
    `url=${location.href}`,
    `origin=${location.origin}`,
    `hostname=${location.hostname}`,
    `pathname=${location.pathname}`,
    `search=${location.search || "(empty)"}`,
    `hash=${location.hash || "(empty)"}`,
    `referrer=${document.referrer || "(none)"}`,
    `readyState=${document.readyState}`,
    `raw_active_storage=${safeStringify(rawStored)}`,
    `stored_active=${stored.join(",") || "none"}`,
    `selected_active=${selected.join(",") || "none"}`,
    `active_on_this_page=${allowedHere.join(",") || "none"}`,
    `features=${featureMatrix}`,
    `layout_v3_sidebar=${hasV3Sidebar}`,
    `layout_legacy_nav=${hasLegacyNav}`,
    `layout_header_target=${hasHeaderTarget}`,
    `gear_present=${!!gear}`,
    `gear_tag=${gear?.tagName ?? "(none)"}`,
    `gear_parent_class=${gear?.parentElement?.className ?? "(none)"}`,
    `overlay_present=${!!document.getElementById("hub-overlay")}`,
    `modal_present=${!!document.getElementById("hub-modal")}`,
    `lang=${navigator.language}`,
    `platform=${navigator.platform}`,
    `ua=${navigator.userAgent}`,
    `time_iso=${new Date().toISOString()}`,
    `time_local=${new Date().toString()}`,
  ].join("\n");
}

async function copyDebugInfo(activeSelected?: FeatureId[]): Promise<boolean> {
  const text = buildDebugInfo(activeSelected);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function findSidebarMainGroup(): HTMLDivElement | null {
  const profileLink = document.querySelector<HTMLAnchorElement>(
    'a[href="https://profile-v3.intra.42.fr"]',
  );
  const fromProfile = profileLink?.closest<HTMLDivElement>(
    "div.flex.flex-col.w-full",
  );
  if (fromProfile) return fromProfile;

  return document.querySelector<HTMLDivElement>(
    "div.flex.flex-col.w-full:not(.pb-16)",
  );
}

function findLegacyNavList(): HTMLDivElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLDivElement>("div._"),
  );
  for (const root of candidates) {
    const hasKnownLinks =
      !!root.querySelector('a[href="https://profile.intra.42.fr"]') ||
      !!root.querySelector('a[href="https://projects.intra.42.fr"]') ||
      !!root.querySelector('a[href="https://meta.intra.42.fr"]');
    const hasLi = root.querySelectorAll(":scope > li").length > 0;
    if (hasKnownLinks && hasLi) return root;
  }
  return null;
}

function createModal(active: FeatureId[]): void {
  if (document.getElementById("hub-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "hub-overlay";

  const rows = FEATURE_DEFS.map((f) => {
    const checked = active.includes(f.id) ? "checked" : "";
    const runsHere = isFeatureAllowedOnPage(f.id);
    return `
      <label class="hub-row">
        <div>
          <div class="hub-name">${f.name}</div>
          <div class="hub-desc">${f.desc}</div>
          <span class="hub-run-pill ${runsHere ? "is-on" : "is-off"}">
            ${FEATURE_PAGE_URLS[f.id]}
          </span>
        </div>
        <div class="hub-toggle-switch">
          <input type="checkbox" class="hub-toggle" data-id="${f.id}" ${checked}>
          <div class="hub-toggle-bg"></div>
          <div class="hub-toggle-handle"></div>
        </div>
      </label>
    `;
  }).join("");

  const about = `
    <div class="hub-about">
      <div class="hub-about-title">About this extension</div>
      <div class="hub-about-meta">
        <div class="k">Name</div><div class="v">${HUB_INFO.name}</div>
        <div class="k">Version</div><div class="v">${HUB_INFO.version}</div>
        <div class="k">Author</div><div class="v">${HUB_INFO.author}</div>
        <div class="k">License</div><div class="v">${HUB_INFO.license}</div>
      </div>
      <div class="hub-about-links">
        <a href="${HUB_INFO.github}" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="${HUB_INFO.issues}" target="_blank" rel="noopener noreferrer">Report issue</a>
        <button id="hub-copy-debug" type="button">Copy debug info</button>
      </div>
    </div>
  `;

  overlay.innerHTML = `
    <div id="hub-modal">
      <div class="hub-head">
        <span class="hub-title">Settings</span>
        <button id="close-settings-modal" type="button" aria-label="Close"></button>
      </div>
      <div class="hub-body">${rows}</div>
      ${about}
      <div class="hub-foot">
        <button class="hub-save" id="hub-save" type="button">Save & Reload</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => (overlay.style.display = "none");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document
    .getElementById("close-settings-modal")
    ?.addEventListener("click", close);

  document.getElementById("hub-save")?.addEventListener("click", () => {
    const selected = Array.from(
      overlay.querySelectorAll<HTMLInputElement>(".hub-toggle:checked"),
    )
      .map((el) => el.dataset.id)
      .filter((id): id is FeatureId => FEATURE_IDS.has(id as FeatureId));

    gmSetValue(STORAGE_KEY, JSON.stringify(selected));
    location.reload();
  });

  document
    .getElementById("hub-copy-debug")
    ?.addEventListener("click", async () => {
      const selected = Array.from(
        overlay.querySelectorAll<HTMLInputElement>(".hub-toggle:checked"),
      )
        .map((el) => el.dataset.id)
        .filter((id): id is FeatureId => FEATURE_IDS.has(id as FeatureId));

      const ok = await copyDebugInfo(selected);
      const btn = document.getElementById(
        "hub-copy-debug",
      ) as HTMLButtonElement | null;
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = ok ? "Copied" : "Copy failed";
      window.setTimeout(() => {
        btn.textContent = prev ?? "Copy debug info";
      }, 1200);
    });
}

function mountGearButton(): void {
  const openModal = () => {
    const overlay = document.getElementById("hub-overlay");
    if (overlay) overlay.style.display = "flex";
  };

  const sidebarMainGroup = findSidebarMainGroup();
  const legacyNavList = findLegacyNavList();
  const oldTarget = document.querySelector(".flex.flex-row.grow.h-16.gap-3");

  document.getElementById("hub-gear-item")?.remove();
  const existing = document.getElementById("hub-gear-btn");
  existing?.remove();

  if (sidebarMainGroup) {
    const a = document.createElement("a");
    a.id = "hub-gear-btn";
    a.href = "#";
    a.title = "Extension settings";
    a.setAttribute("aria-label", "Extension settings");
    a.className =
      "py-5 w-full flex justify-center hover:opacity-100 opacity-40";
    a.innerHTML = GEAR_SVG;
    a.onclick = (e) => {
      e.preventDefault();
      openModal();
    };
    sidebarMainGroup.appendChild(a);
    return;
  }

  if (legacyNavList) {
    const li = document.createElement("li");
    li.id = "hub-gear-item";

    const a = document.createElement("a");
    a.id = "hub-gear-btn";
    a.href = "#";
    a.className = "inactive";
    a.title = "Extension settings";
    a.setAttribute("aria-label", "Extension settings");
    a.innerHTML = GEAR_SVG;
    a.onclick = (e) => {
      e.preventDefault();
      openModal();
    };

    li.appendChild(a);
    legacyNavList.appendChild(li);
    return;
  }

  if (oldTarget) {
    const b = document.createElement("button");
    b.id = "hub-gear-btn";
    b.type = "button";
    b.title = "Extension settings";
    b.setAttribute("aria-label", "Extension settings");
    b.innerHTML = GEAR_SVG;
    b.onclick = openModal;
    oldTarget.appendChild(b);
    return;
  }

  const b = document.createElement("button");
  b.id = "hub-gear-btn";
  b.type = "button";
  b.title = "Extension settings";
  b.setAttribute("aria-label", "Extension settings");
  b.innerHTML = "⚙️";
  b.onclick = openModal;
  b.style.position = "fixed";
  b.style.right = "14px";
  b.style.bottom = "14px";
  b.style.zIndex = "9999";
  document.body.appendChild(b);
}

export function initHubSettings(): FeatureId[] {
  const active = getActiveFeatures();
  createModal(active);

  mountGearButton();
  const iv = window.setInterval(() => {
    mountGearButton();
  }, 300);
  window.setTimeout(() => window.clearInterval(iv), 8000);

  return active.filter((id) => isFeatureAllowedOnPage(id));
}
