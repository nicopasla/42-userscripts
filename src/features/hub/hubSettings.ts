import { html, render } from "lit-html";
import { FeatureId } from "./hubSettings.data.ts";
import { getConfig } from "../../config.ts";
import GEAR_SVG from "../../assets/svg/settings_gear.svg?raw";
import USERS_SVG from "../../assets/svg/users.svg?raw";
import GLOBE_OUTLINE_SVG from "../../assets/svg/globe-outline.svg?raw";
import { getIsLight } from "../profile/theme/theme-manager.ts";
import { getActiveFeatures } from "./hubSettings.storage.ts";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { openStudentsDialog } from "../profile/students/index.ts";
import { openClusterDialog } from "../clusters/map-dialog.ts";
import { isPisciner } from "../../utils/intrapy.ts";

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

function renderStudentsButton(
  onClick: (e: Event) => void,
): ReturnType<typeof html> {
  return html`<a
    id="ft-students-btn"
    class="py-5 w-full flex justify-center hover:opacity-100 opacity-40"
    href="#"
    data-tip="Students"
    data-tip-pos="right"
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

function renderClustersButton(
  onClick: (e: Event) => void,
  color: string,
): ReturnType<typeof html> {
  return html`<a
    id="ft-clusters-btn"
    class="py-5 w-full flex justify-center hover:opacity-100 opacity-40"
    href="#"
    data-tip="Clusters"
    data-tip-pos="right"
    @click="${(e: Event) => {
      e.preventDefault();
      onClick(e);
    }}"
  >
    ${unsafeHTML(
      GLOBE_OUTLINE_SVG.replace(
        "<svg",
        `<svg width="25" height="25" stroke="${color}"`,
      ),
    )}
  </a>`;
}

export function mountGearButton(): void {
  const open = async () => {
    const { openHubModal } = await import("./hubSettings.ui.ts");

    const active = await getActiveFeatures();

    await openHubModal(active);
  };

  const sidebar = findSidebarMainGroup();

  const openStudents = async () => {
    try {
      const login = await getConfig("CLOUD_LOGIN");
      if (login && (await isPisciner(login))) {
        alert("You need to be a student to access that.");
        return;
      }
      openStudentsDialog();
    } catch (err) {}
  };

  const openClusters = () => {
    try {
      openClusterDialog();
    } catch (err) {}
  };

  void (async () => {
    if ((await getConfig("CLUSTERS_CAMPUS")) !== "12") return;
    if (!sidebar) return;

    if (!document.getElementById("ft-students-btn")) {
      const container = document.createElement("div");
      render(renderStudentsButton(openStudents), container);
      const anchor = sidebar.children[1] ?? sidebar.firstElementChild;
      if (anchor) {
        anchor.after(container.firstElementChild!);
      } else {
        sidebar.appendChild(container.firstElementChild!);
      }
    }

    const studentsBtn = document.getElementById("ft-students-btn");
    if (studentsBtn && !document.getElementById("ft-clusters-btn")) {
      const isLight = await getIsLight();
      const color = isLight ? "#1a1d24" : "#fff";
      const container = document.createElement("div");
      render(renderClustersButton(openClusters, color), container);
      studentsBtn.after(container.firstElementChild!);
    }
  })();

  if (document.getElementById("hub-gear-btn")) return;

  if (sidebar) {
    const container = document.createElement("div");
    render(renderGearButton(open), container);
    sidebar.appendChild(container.firstElementChild!);
  }
}

export async function initHubSettings(): Promise<FeatureId[]> {
  const active = await getActiveFeatures();
  mountGearButton();
  const hubInterval = setInterval(mountGearButton, 500);
  setTimeout(() => clearInterval(hubInterval), 10000);
  addEventListener("pagehide", () => clearInterval(hubInterval), {
    once: true,
  });
  return active;
}
