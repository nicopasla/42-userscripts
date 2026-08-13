import { html, render } from "lit-html";
import { CLUSTERS } from "./clusters.data.ts";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { bindTooltips } from "../../utils/tooltip.ts";
import { getIsLight } from "../profile/theme/theme-manager.ts";

export function renderClusterPicker(
  currentId: string,
  showMarkers: boolean,
  onClusterChange: (value: string) => void,
  onMarkerToggle: () => void,
) {
  const openSelectDropdown = (e: Event) => {
    e.preventDefault();
    const host = (e.currentTarget as HTMLElement).getRootNode() as ShadowRoot;
    const select = host.getElementById(
      "cluster-select",
    ) as HTMLSelectElement | null;
    if (select) {
      try {
        // Modern way to open a select dropdown programmatically
        select.showPicker();
      } catch (err) {
        // Fallback for older browsers
        select.focus();
      }
    }
  };

  return html`
    <div
      class="flex items-center gap-5 px-4 py-1 text-base-content bg-transparent"
    >
      <div
        class="flex items-center gap-3 cursor-pointer select-none py-1"
        data-tip="Choose a default cluster"
        data-tip-size="15px"
        @click="${openSelectDropdown}"
      >
        <select
          id="cluster-select"
          class="select select-lg font-black uppercase min-w-40 text-xl px-2"
          @change="${(e: Event) =>
            onClusterChange((e.target as HTMLSelectElement).value)}"
          @click="${(e: Event) => e.stopPropagation()}"
        >
          ${CLUSTERS.map(
            (c) => html`
              <option
                value="${c.id}"
                ?selected="${String(currentId) === String(c.id)}"
              >
                ${c.name.toLowerCase()}
              </option>
            `,
          )}
        </select>
      </div>
      <div class="h-8 w-px bg-base-content/20"></div>
      <button
        class="btn btn-lg px-8 text-base font-bold uppercase tracking-wider ${showMarkers
          ? "btn-primary"
          : "btn-ghost"}"
        @click="${onMarkerToggle}"
      >
        Show markers
      </button>
    </div>
  `;
}

export function createShadowUI(
  onClusterChange: (value: string) => void,
  onMarkerToggle: () => void,
): {
  shadowHost: HTMLElement;
  reRender: (currentId: string, showMarkers: boolean) => void;
} {
  const isDark = document.documentElement.classList.contains("dark");
  const theme = isDark ? "dark" : "light";

  const shadowHost = document.createElement("div");
  shadowHost.id = "cluster-shadow-host";
  Object.assign(shadowHost.style, {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    right: "0px",
    zIndex: "10",
    display: "inline-flex",
    alignItems: "center",
    height: "64px",
  });

  const shadowRoot = shadowHost.attachShadow({ mode: "open" });
  bindTooltips(shadowRoot, getIsLight);

  const style = document.createElement("style");
  style.textContent = `
    ${sharedCSS}
    :host { display: inline-flex !important; align-items: center !important; }
  `;
  shadowRoot.appendChild(style);

  const wrapper = document.createElement("div");
  wrapper.id = "cluster-li-container";
  wrapper.setAttribute("data-theme", theme);
  shadowRoot.appendChild(wrapper);

  const reRender = (currentId: string, showMarkers: boolean) => {
    render(
      renderClusterPicker(
        currentId,
        showMarkers,
        onClusterChange,
        onMarkerToggle,
      ),
      wrapper,
    );
  };

  return { shadowHost, reRender };
}
