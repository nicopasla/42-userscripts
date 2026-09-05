import { describe, it, expect, beforeEach } from "vitest";
import { wrapTitleBadges } from "../src/features/profile/badges";

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
