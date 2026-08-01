import { html, render } from "lit-html";
import { FeatureId } from "./hubSettings.data.ts";
import GEAR_SVG from "../../assets/svg/settings_gear.svg?raw";
import USERS_SVG from "../../assets/svg/users.svg?raw";
import { getActiveFeatures } from "./hubSettings.storage.ts";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { openStudentsDialog } from "../profile/students-dialog.ts";

function findSidebarMainGroup(): HTMLDivElement | null {
  const profileLink = document.querySelector<HTMLAnchorElement>(
    'a[href="https://profile-v3.intra.42.fr"]',
  );
  return (
    profileLink?.closest<HTMLDivElement>("div.flex.flex-col.w-full") ||
    document.querySelector<HTMLDivElement>(
      "div.flex.flex-col.w-full:not(.pb-16)",
    )
  );
}

function findLegacyNavList(): HTMLDivElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLDivElement>("div._"),
  );
  return (
    candidates.find(
      (root) =>
        (!!root.querySelector('a[href="https://profile.intra.42.fr"]') ||
          !!root.querySelector('a[href="https://projects.intra.42.fr"]')) &&
        root.querySelectorAll(":scope > li").length > 0,
    ) || null
  );
}

function renderGearButton(
  onClick: (e: Event) => void,
): ReturnType<typeof html> {
  return html`<a
    id="hub-gear-btn"
    class="py-5 w-full flex justify-center hover:opacity-100 opacity-40"
    href="#"
    @click="${(e: Event) => {
      e.preventDefault();
      onClick(e);
    }}"
  >
    ${unsafeHTML(GEAR_SVG)}
  </a>`;
}

function renderLegacyGearButton(
  onClick: (e: Event) => void,
): ReturnType<typeof html> {
  return html`<li>
    <a
      id="hub-gear-btn"
      href="#"
      @click="${(e: Event) => {
        e.preventDefault();
        onClick(e);
      }}"
    >
      ${unsafeHTML(GEAR_SVG)}
    </a>
  </li>`;
}

function renderStudentsButton(
  onClick: (e: Event) => void,
): ReturnType<typeof html> {
  return html`<a
    id="ft-students-btn"
    class="py-5 w-full flex justify-center hover:opacity-100 opacity-40"
    href="#"
    title="Students"
    @click="${(e: Event) => {
      e.preventDefault();
      onClick(e);
    }}"
  >
    ${unsafeHTML(
      USERS_SVG.replace("<svg", '<svg width="25" height="25" stroke="#fff"'),
    )}
  </a>`;
}

function renderLegacyStudentsButton(
  onClick: (e: Event) => void,
): ReturnType<typeof html> {
  return html`<li>
    <a
      id="ft-students-btn"
      href="#"
      title="Students"
      @click="${(e: Event) => {
        e.preventDefault();
        onClick(e);
      }}"
    >
      ${unsafeHTML(
        USERS_SVG.replace(
          "<svg",
          '<svg width="20" height="20" stroke="currentColor"',
        ),
      )}
    </a>
  </li>`;
}

export function mountGearButton(): void {
  const open = async () => {
    const { openHubModal } = await import("./hubSettings.ui.ts");

    const active = await getActiveFeatures();

    await openHubModal(active);
  };

  const sidebar = findSidebarMainGroup();
  const legacy = findLegacyNavList();

  if (document.getElementById("hub-gear-btn")) return;

  if (sidebar) {
    const container = document.createElement("div");
    render(renderGearButton(open), container);
    sidebar.appendChild(container.firstElementChild!);
  } else if (legacy) {
    const container = document.createElement("div");
    render(renderLegacyGearButton(open), container);
    legacy.appendChild(container.firstElementChild!);
  }

  if (document.getElementById("ft-students-btn")) return;

  const openStudents = () => {
    try {
      openStudentsDialog();
    } catch (err) {}
  };

  if (sidebar) {
    const container = document.createElement("div");
    render(renderStudentsButton(openStudents), container);
    const firstLink = sidebar.firstElementChild;
    if (firstLink) {
      firstLink.after(container.firstElementChild!);
    } else {
      sidebar.appendChild(container.firstElementChild!);
    }
  } else if (legacy) {
    const container = document.createElement("div");
    render(renderLegacyStudentsButton(openStudents), container);
    const firstLink = legacy.firstElementChild;
    if (firstLink) {
      firstLink.after(container.firstElementChild!);
    } else {
      legacy.appendChild(container.firstElementChild!);
    }
  }
}

export async function initHubSettings(): Promise<FeatureId[]> {
  const active = await getActiveFeatures();
  mountGearButton();
  const hubInterval = setInterval(mountGearButton, 500);
  setTimeout(() => clearInterval(hubInterval), 10000);
  addEventListener("pagehide", () => clearInterval(hubInterval), { once: true });
  return active;
}
