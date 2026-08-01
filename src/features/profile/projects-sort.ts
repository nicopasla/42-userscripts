import { getConfig } from "../../config.ts";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { THEMES, getEffectiveTheme } from "./theme/theme-manager.ts";
import SORT_AZ_SVG from "../../assets/svg/sort-az.svg?raw";
import SORT_ZA_SVG from "../../assets/svg/sort-za.svg?raw";
import CAL_DOWN_SVG from "../../assets/svg/calendar-arrow-down.svg?raw";
import CAL_UP_SVG from "../../assets/svg/calendar-arrow-up.svg?raw";

type SortField = "name" | "date";

interface ProjectItem {
  wrapper: HTMLElement;
  score: number;
  name: string;
  dateMs: number;
  passed: boolean;
}

const HOST_ID = "better-intra-sort-host";

const FIELD_LABELS: Record<SortField, string> = {
  name: "Name",
  date: "Date",
};

const FIELD_DEFAULTS: Record<SortField, "asc" | "desc"> = {
  name: "asc",
  date: "desc",
};

const FIELD_VALUES: SortField[] = ["name", "date"];

const parseRelativeDate = (text: string | null): number => {
  if (!text) return 0;
  const lowered = text.trim().toLowerCase();
  const numMatch = lowered.match(/(\d+)/);
  const num = numMatch ? parseInt(numMatch[1]) : 0;
  let duration = 0;
  if (lowered.includes("second")) duration = num * 1000;
  else if (lowered.includes("minute")) duration = num * 60 * 1000;
  else if (lowered.includes("hour")) duration = num * 3600 * 1000;
  else if (lowered.includes("day")) duration = num * 86400 * 1000;
  else if (lowered.includes("month")) duration = num * 30 * 86400 * 1000;
  else if (lowered.includes("year")) duration = num * 365 * 86400 * 1000;
  else return 0;
  return Date.now() - duration;
};

const makeSorter = (
  field: SortField,
  asc: boolean,
): ((a: ProjectItem, b: ProjectItem) => number) => {
  switch (field) {
    case "name":
      return asc
        ? (a, b) => a.name.localeCompare(b.name)
        : (a, b) => b.name.localeCompare(a.name);
    case "date":
      return asc
        ? (a, b) =>
            a.dateMs - b.dateMs ||
            b.score - a.score ||
            a.name.localeCompare(b.name)
        : (a, b) =>
            b.dateMs - a.dateMs ||
            b.score - a.score ||
            a.name.localeCompare(b.name);
  }
};

const extractItems = (panel: HTMLElement | null): ProjectItem[] => {
  if (!panel) return [];
  const rows = panel.querySelectorAll<HTMLElement>(
    ".flex.flex-row.justify-between.hover\\:bg-gray-300.p-2",
  );
  if (rows.length < 2) return [];

  const items: ProjectItem[] = [];
  const seen = new Set<HTMLElement>();
  for (const row of rows) {
    let wrapper: HTMLElement | null = row;
    while (
      wrapper &&
      wrapper.parentElement &&
      !wrapper.parentElement.classList.contains("gap-2")
    ) {
      wrapper = wrapper.parentElement;
    }
    if (!wrapper || seen.has(wrapper)) continue;
    seen.add(wrapper);

    const scoreEl =
      row.querySelector(".text-green-500") ??
      row.querySelector(".text-red-500");
    const scoreText = scoreEl?.parentElement?.textContent?.trim();
    const score = scoreText ? parseInt(scoreText) : 0;

    const name = row.querySelector("a")?.textContent?.trim() ?? "";

    const dateText = row.querySelector(".flex.flex-row.gap-1")?.childNodes;
    let dateStr = "";
    if (dateText) {
      for (const child of dateText) {
        if (child.nodeType === Node.TEXT_NODE) {
          dateStr = child.textContent?.trim() ?? "";
          break;
        }
      }
    }

    const preciseDate = wrapper.getAttribute("data-last-event-date");
    const dateMs = preciseDate
      ? new Date(preciseDate).getTime()
      : parseRelativeDate(dateStr);

    items.push({
      wrapper,
      score,
      name,
      dateMs,
      passed: !!row.querySelector(".text-green-500"),
    });
  }
  return items;
};

export async function initProjectsSort() {
  const enabled = await getConfig("PROFILE_PROJECTS_SORT");
  if (!enabled) return;

  const marksHeader = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".font-bold.text-black.uppercase.text-sm",
    ),
  ).find((el) => el.textContent?.trim() === "Marks");
  if (!marksHeader) return;

  const panel = marksHeader.closest<HTMLElement>(".bg-white");
  if (extractItems(panel).length < 2) return;

  const titleRow = marksHeader.parentElement;
  if (!titleRow) return;

  if (titleRow.querySelector(`#${HOST_ID}`)) return;

  const currentTheme = await getEffectiveTheme();
  const presetKey = await getConfig("PROFILE_THEME_PRESET");
  const preset = THEMES[presetKey] ?? THEMES["dark"];
  const primaryColor = `hsl(${preset.primary})`;
  const primaryContent = `hsl(${preset.primaryForeground})`;

  const host = document.createElement("span");
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: "open" });

  let field: SortField = "date";
  let asc = false;

  const style = document.createElement("style");
  style.textContent = sharedCSS;

  const wrap = document.createElement("div");
  wrap.setAttribute("data-theme", currentTheme);
  wrap.className = "flex items-center gap-1";

  const join = document.createElement("div");
  join.className = "join";

  const renderButtons = () => {
    join.replaceChildren();
    for (const f of FIELD_VALUES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm join-item";
      btn.style.height = "1.5rem";
      btn.style.minWidth = "2.25rem";
      btn.style.paddingLeft = "0.75rem";
      btn.style.paddingRight = "0.75rem";
      if (field === f) {
        btn.style.backgroundColor = primaryColor;
        btn.style.borderColor = primaryColor;
        btn.style.color = primaryContent;
      } else {
        btn.style.backgroundColor = "transparent";
        btn.style.borderColor =
          "color-mix(in oklab, var(--color-base-content) 20%, transparent)";
        btn.style.color = "var(--color-base-content)";
      }
      btn.title = `${FIELD_LABELS[f]}${
        field === f ? ` (${asc ? "asc" : "desc"})` : ""
      }`;
      const icon =
        f === "name"
          ? field === "name"
            ? asc
              ? SORT_AZ_SVG
              : SORT_ZA_SVG
            : SORT_AZ_SVG
          : field === "date"
            ? asc
              ? CAL_UP_SVG
              : CAL_DOWN_SVG
            : CAL_DOWN_SVG;
      btn.insertAdjacentHTML(
        "beforeend",
        icon.replace("<svg", '<svg width="16" height="16"'),
      );
      btn.addEventListener("click", () => {
        if (field === f) {
          asc = !asc;
        } else {
          field = f;
          asc = FIELD_DEFAULTS[f] === "asc";
        }
        applySort();
      });
      join.appendChild(btn);
    }
  };

  const applySort = () => {
    const items = extractItems(panel);
    if (items.length === 0) return;
    const sorter = makeSorter(field, asc);
    items.sort(sorter);

    const container = marksHeader
      .closest(".flex.flex-col.w-full.h-full")
      ?.querySelector<HTMLElement>(".flex.flex-col.gap-2");
    if (!container) return;

    for (const item of items) {
      container.appendChild(item.wrapper);
    }
    renderButtons();
  };

  wrap.appendChild(join);
  root.appendChild(style);
  root.appendChild(wrap);
  titleRow.appendChild(host);

  renderButtons();
  applySort();
}
