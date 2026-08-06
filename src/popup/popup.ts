import { html, render } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { initAccountSettings } from "../features/account/account.ui";
import CSS from "../assets/style.css?inline";
import ICON_SVG from "../assets/svg/icon.svg?raw";

const style = document.createElement("style");
style.textContent = CSS;
document.head.appendChild(style);

function isIntraUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return hostname === "intra.42.fr" || hostname.endsWith(".intra.42.fr");
  } catch {
    return false;
  }
}

function renderPlaceholder(container: HTMLElement) {
  render(
    html`
      <div
        data-theme="light"
        class="w-full h-full flex flex-col items-center justify-center p-8 gap-4"
      >
        <div class="text-center flex flex-col items-center">
          <span
            class="size-16 flex items-center justify-center [&_svg]:size-full [&_polygon]:fill-current text-[#00babc]"
          >
            ${unsafeHTML(ICON_SVG)}
          </span>
          <h2 class="text-2xl font-bold mt-2">Better Intra</h2>
          <p class="opacity-70 mt-1">Works on Intra pages only.</p>
        </div>
        <button
          class="btn bg-[#00babc] text-white border-none hover:bg-[#1fd2d4] w-full max-w-sm h-14 text-base flex items-center justify-center gap-2 transition-colors duration-200 mt-4 font-bold"
          type="button"
          @click="${() =>
            window.open("https://profile-v3.intra.42.fr/", "_blank")}"
        >
          Open Intra
        </button>
      </div>
    `,
    container,
  );
}

async function main() {
  const root = document.getElementById("account-root");
  if (!root) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isIntraUrl(tab?.url)) {
    await initAccountSettings(root);
  } else {
    renderPlaceholder(root);
  }
}

void main();
