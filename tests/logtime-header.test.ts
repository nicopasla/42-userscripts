import { describe, it, expect, vi } from "vitest";
import { render } from "lit-html";
import {
  renderHeaderContent,
  CALENDAR_VIEWS,
} from "../src/features/logtime/render";
import { measureHeaderOverflow } from "../src/features/logtime/logtime";
import type { LogtimeConfig } from "../src/features/logtime/logtime";

function makeConfig(): LogtimeConfig {
  return {
    show_tacos: true,
    show_goal: false,
    show_average: false,
    emoji: "🍟",
    divisor: 1,
    rate: 1,
    max_earnings: 0,
    goal_hours: 100,
    show_days_mode: "avg",
    calendar_color: "#00bcba",
    labels_color: "#000000",
    disable_animations: false,
    calendar_view: "normal",
  } as unknown as LogtimeConfig;
}

function renderHeader(options: { collapsed?: boolean; view?: string }) {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  render(
    renderHeaderContent(
      "12h",
      {},
      makeConfig(),
      options.view ?? "normal",
      vi.fn(),
      "#00bcba",
      "#ffffff",
      options.collapsed ?? false,
    ),
    shadow,
  );
  return shadow;
}

describe("renderHeaderContent view switcher", () => {
  it("renders inline join buttons by default", () => {
    const shadow = renderHeader({});
    const join = shadow.querySelector(".lt-view-join");
    const dropdown = shadow.querySelector(".lt-view-dropdown");
    expect(join).toBeTruthy();
    expect(join?.querySelectorAll("button").length).toBe(CALENDAR_VIEWS.length);
    expect(dropdown).toBeTruthy();
    expect(dropdown?.classList.contains("lt-view-dropdown")).toBe(true);
  });

  it("marks the switcher collapsed and shows 4 dropdown items when collapsed", () => {
    const shadow = renderHeader({ collapsed: true });
    const switcher = shadow.querySelector(".lt-view-switcher");
    expect(switcher?.classList.contains("collapsed")).toBe(true);

    const menu = shadow.querySelector(".lt-view-dropdown ul");
    expect(menu).toBeTruthy();
    expect(menu?.querySelectorAll("li button").length).toBe(
      CALENDAR_VIEWS.length,
    );
    expect(menu?.textContent).toContain("Normal");
    expect(menu?.textContent).toContain("Carousel");
  });

  it("marks the active view in the dropdown menu", () => {
    const shadow = renderHeader({ collapsed: true, view: "heatmap" });
    const menu = shadow.querySelector(".lt-view-dropdown ul");
    const active = menu?.querySelector(".menu-active");
    expect(active?.textContent).toContain("Heatmap");
  });

  it("keeps the inline buttons for measurement when collapsed", () => {
    const shadow = renderHeader({ collapsed: true });
    const join = shadow.querySelector<HTMLElement>(".lt-view-join");
    expect(join).toBeTruthy();
    expect(join?.querySelectorAll("button").length).toBe(CALENDAR_VIEWS.length);
  });
});

describe("measureHeaderOverflow", () => {
  function makeHeader(opts: {
    clientWidth: number;
    title?: number;
    tacos?: number;
    join?: number;
    active?: number;
  }) {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const header = document.createElement("div");
    header.className = "lt-header";
    Object.defineProperty(header, "clientWidth", {
      value: opts.clientWidth,
      configurable: true,
    });

    const add = (cls: string, width?: number) => {
      const el = document.createElement("span");
      el.className = cls;
      if (width !== undefined) {
        el.style.width = `${width}px`;
        vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
          width,
        } as DOMRect);
      }
      header.appendChild(el);
      return el;
    };

    add("lt-title", opts.title);
    add("lt-tacos-badge", opts.tacos);
    add("lt-view-join", opts.join);
    add("lt-active-badge", opts.active);
    shadow.appendChild(header);
    return shadow;
  }

  it("returns true when the header content overflows the container", () => {
    const shadow = makeHeader({
      clientWidth: 200,
      title: 60,
      join: 180,
      active: 70,
    });
    expect(measureHeaderOverflow(shadow)).toBe(true);
  });

  it("returns false when the header content fits", () => {
    const shadow = makeHeader({
      clientWidth: 400,
      title: 60,
      join: 180,
      active: 70,
    });
    expect(measureHeaderOverflow(shadow)).toBe(false);
  });

  it("returns false when no header element exists", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    expect(measureHeaderOverflow(shadow)).toBe(false);
  });
});
