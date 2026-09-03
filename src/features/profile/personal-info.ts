import { getConfig } from "../../config.ts";
import { openClusterDialog } from "../clusters/map-dialog.ts";
import { addFriend, removeFriend, isFriend } from "../friends/friends.ts";
import { getCloudLogin, syncToCloud } from "../account/account.ts";
import { getLoginFromPage } from "../../utils/profile-login.ts";
import HOLY_GRAPH_SVG from "../../assets/svg/holy-graph.svg?raw";
import CLUSTERS_SVG from "../../assets/svg/clusters.svg?raw";
import USER_COG_SVG from "../../assets/svg/user-cog.svg?raw";
import CHECK_SVG from "../../assets/svg/check.svg?raw";
import PLUS_SVG from "../../assets/svg/plus.svg?raw";

function getProfileLogin(): string {
  return getLoginFromPage() ?? "";
}

export async function initFriendBadge() {
  const pathParts = location.pathname.split("/").filter(Boolean);
  if (pathParts[0] !== "users" || !pathParts[1]) return;

  const targetLogin = pathParts[1];
  const myLogin = await getCloudLogin();
  if (!myLogin || targetLogin === myLogin) return;

  const container = document.querySelector<HTMLElement>(
    ".flex.flex-col.justify-center.gap-4",
  );
  if (!container) return;
  if (container.querySelector("[data-ft-friend]")) return;

  let friendState = false;

  const btn = document.createElement("button");
  btn.setAttribute("data-ft-friend", "");
  btn.setAttribute("data-state", "closed");
  btn.className = "cursor-default py-1.5";

  const row = document.createElement("div");
  row.className = "flex flex-row items-center gap-1";

  const textDiv = document.createElement("div");
  textDiv.className = "text-white";
  textDiv.style.whiteSpace = "nowrap";

  const render = () => {
    const label = friendState ? "Remove friend" : "Add friend";
    const svg = friendState ? CHECK_SVG : PLUS_SVG;
    row.replaceChildren();
    row.insertAdjacentHTML("beforeend", svg);
    const svgEl = row.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("width", "15");
      svgEl.setAttribute("height", "15");
    }
    textDiv.textContent = label;
    row.appendChild(textDiv);
    btn.title = `${label} (${targetLogin})`;
    btn.style.pointerEvents = "";
    btn.style.opacity = "";
  };

  btn.addEventListener("click", async () => {
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.5";
    try {
      if (friendState) {
        await removeFriend(targetLogin);
      } else {
        await addFriend(targetLogin);
      }
      syncToCloud();
      friendState = !friendState;
      render();
    } catch {
      btn.style.pointerEvents = "";
      btn.style.opacity = "";
    }
  });

  btn.appendChild(row);
  container.prepend(btn);
  render();

  isFriend(targetLogin).then((already) => {
    friendState = already;
    render();
  });
}

export async function initShortcutButtons() {
  const container = document.querySelector<HTMLElement>(
    ".border.border-ft-gray-border.bg-ft-gray\\/50.rounded-xl.flex.justify-center.items-center.w-full:not(#ft-freeze-card)",
  );
  if (!container || container.hasAttribute("data-ft-shortcuts")) return;

  const openNewTab = await getConfig("ADVANCED_OPEN_LINKS_NEW_TAB");

  const login = getProfileLogin();
  if (!login) return;

  container.setAttribute("data-ft-shortcuts", "");
  while (container.firstChild) container.removeChild(container.firstChild);

  const style = document.createElement("style");
  style.textContent = `
    [data-ft-shortcuts] a {
      border: 3px solid var(--user-color, hsl(var(--legacy-main))) !important;
      border-radius: 0.5rem;
      color: inherit;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
    }
    [data-ft-shortcuts] a svg {
      width: 20px;
      height: 20px;
      fill: currentColor !important;
      stroke: currentColor !important;
    }
  `;
  container.appendChild(style);

  const makeButton = (
    href: string,
    svg: string,
    label: string,
    openNewTab: boolean,
  ) => {
    const div = document.createElement("div");
    div.className = "py-3 px-4 hover:text-legacy-main";
    const a = document.createElement("a");
    a.href = href;
    if (openNewTab) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    a.insertAdjacentHTML("beforeend", svg);
    const span = document.createElement("span");
    span.textContent = label;
    a.appendChild(span);
    div.appendChild(a);
    container.appendChild(div);
  };

  makeButton(
    `https://projects.intra.42.fr/projects/graph?login=${login}`,
    HOLY_GRAPH_SVG,
    "Holy Graph",
    openNewTab,
  );
  (() => {
    const div = document.createElement("div");
    div.className = "py-3 px-4 hover:text-legacy-main";
    const a = document.createElement("a");
    a.href = "#";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        openClusterDialog();
      } catch (err) {}
    });
    a.insertAdjacentHTML("beforeend", CLUSTERS_SVG);
    const span = document.createElement("span");
    span.textContent = "Clusters";
    a.appendChild(span);
    div.appendChild(a);
    container.appendChild(div);
  })();
  makeButton(
    "https://profile.intra.42.fr/users/me/edit",
    USER_COG_SVG,
    "Settings",
    openNewTab,
  );
}
