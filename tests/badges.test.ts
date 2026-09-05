import { describe, it, expect, beforeEach } from "vitest";
import {
  wrapTitleBadges,
  getTitleBadges,
  applyBadgeLayout,
} from "../src/features/profile/badges";
import { badgeColorCss } from "../src/features/profile/visuals";
import { TITLE_BADGE_SELECTOR } from "../src/features/profile/selectors";

function badge(title: string): string {
  return `<div class="inline-flex items-center text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-primary hover:bg-primary/80 border-transparent text-primary-foreground flex-shrink-0 mx-1 px-3.5 py-1.5 rounded border shadow-base">${title}</div>`;
}

describe("wrapTitleBadges", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps the native title badge row", () => {
    document.body.innerHTML = `
      <div class="py-2 flex gap-2 w-full overflow-x-auto" style="scrollbar-color: rgb(181, 22, 63) transparent; scrollbar-width: thin;">
        ${badge("BADGE ONE")}
        ${badge("BADGE TWO")}
        ${badge("BADGE THREE")}
        ${badge("BADGE FOUR")}
        ${badge("BADGE FIVE")}
        ${badge("BADGE SIX")}
      </div>
    `;
    wrapTitleBadges(document);

    const row = document.querySelector<HTMLElement>(".overflow-x-auto")!;
    expect(row.style.getPropertyValue("flex-wrap")).toBe("wrap");
    expect(row.style.getPropertyPriority("flex-wrap")).toBe("important");
  });

  it("does nothing when there are no badges", () => {
    document.body.innerHTML = `<div class="py-2 flex gap-2 w-full overflow-x-auto" style="scrollbar-width: thin;"></div>`;
    wrapTitleBadges(document);

    const row = document.querySelector<HTMLElement>(".overflow-x-auto")!;
    expect(row.style.getPropertyValue("flex-wrap")).toBe("");
  });

  it("leaves unrelated flex rows untouched", () => {
    document.body.innerHTML = `
      <div class="flex gap-2">not badges</div>
      <div class="py-2 flex gap-2 w-full overflow-x-auto">${badge("BADGE ONE")}</div>
    `;
    wrapTitleBadges(document);

    const rows = document.querySelectorAll<HTMLElement>(
      "[class*='overflow-x-auto'], .flex",
    );
    for (const row of rows) {
      const text = row.textContent || "";
      if (text.includes("BADGE ONE")) {
        expect(row.style.getPropertyValue("flex-wrap")).toBe("wrap");
      } else if (text.includes("not badges")) {
        expect(row.style.getPropertyValue("flex-wrap")).toBe("");
      }
    }
  });
});

describe("badgeColorCss", () => {
  it("returns empty when no color is set", () => {
    expect(badgeColorCss("")).toBe("");
    expect(badgeColorCss(undefined)).toBe("");
  });

  it("sets background and border-color, not text color", () => {
    const css = badgeColorCss("#613583");
    expect(css).toContain("background-color: #613583 !important");
    expect(css).toContain("border-color: #613583 !important");
    expect(css).not.toContain(" color:");
  });
});

describe("TITLE_BADGE_SELECTOR", () => {
  it("matches the native title badge markup", () => {
    document.body.innerHTML = `
      <div class="py-2 flex gap-2 w-full overflow-x-auto">
        ${badge("BADGE ONE")}
      </div>
    `;
    const match = document.querySelector(TITLE_BADGE_SELECTOR);
    expect(match).toBeTruthy();
    expect(match!.textContent).toBe("BADGE ONE");
  });
});

describe("getTitleBadges", () => {
  it("extracts badge titles in DOM order", () => {
    document.body.innerHTML = `
      <div class="py-2 flex gap-2 w-full overflow-x-auto">
        ${badge("ALPHA")}
        ${badge("BETA")}
        ${badge("GAMMA")}
      </div>
    `;
    const titles = getTitleBadges(document).map((b) => b.title);
    expect(titles).toEqual(["ALPHA", "BETA", "GAMMA"]);
  });

  it("returns an empty array when there are no badges", () => {
    document.body.innerHTML = `<div class="py-2 flex gap-2"></div>`;
    expect(getTitleBadges(document)).toEqual([]);
  });
});

describe("applyBadgeLayout", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const setup = (titles: string[]) => {
    document.body.innerHTML = `
      <div class="py-2 flex gap-2 w-full overflow-x-auto">
        ${titles.map((t) => badge(t)).join("")}
      </div>
    `;
  };

  it("hides badges prefixed with '-'", () => {
    setup(["ALPHA", "BETA", "GAMMA"]);
    applyBadgeLayout(document, { order: ["-BETA"], wrap: true });

    const badges = getTitleBadges(document);
    const beta = badges.find((b) => b.title === "BETA")!;
    expect(beta.el.style.display).toBe("none");
    const alpha = badges.find((b) => b.title === "ALPHA")!;
    expect(alpha.el.style.display).not.toBe("none");
  });

  it("sets wrap to nowrap when wrap is false", () => {
    setup(["ALPHA"]);
    applyBadgeLayout(document, { order: [], wrap: false });
    const row = document.querySelector<HTMLElement>(".overflow-x-auto")!;
    expect(row.style.getPropertyValue("flex-wrap")).toBe("nowrap");
  });

  it("reorders badges to match the configured order", () => {
    setup(["ALPHA", "BETA", "GAMMA"]);
    applyBadgeLayout(document, { order: ["GAMMA", "ALPHA"], wrap: true });

    const titles = getTitleBadges(document).map((b) => b.title);
    expect(titles).toEqual(["GAMMA", "ALPHA", "BETA"]);
  });
});
