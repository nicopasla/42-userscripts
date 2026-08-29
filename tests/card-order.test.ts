/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://profile-v3.intra.42.fr/" }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ORDER = ["THURSDAY ROULETTE", "AGENDA", "PROJECTS"];

vi.mock("../src/config.ts", () => ({
  getConfig: vi.fn(async (key: string) => {
    if (key === "PROFILE_CARD_ORDER") return ORDER;
    if (key === "PROFILE_SHOW_ROULETTE") return true;
    if (key === "PROFILE_SHOW_ROULETTE_HISTORY") return true;
    return "token";
  }),
}));
vi.mock("../src/features/account/account.ts", () => ({
  getCloudLogin: vi.fn(async () => "me"),
}));
vi.mock("../src/utils/crypto.ts", () => ({
  hashLogin: vi.fn(async () => "hashed"),
}));

const intraCard = (title: string) => `
  <div class="bg-white md:h-96">
    <span class="font-bold uppercase text-sm">${title}</span>
  </div>`;

const titles = () =>
  Array.from(document.querySelectorAll<HTMLElement>(".dash-main > div")).map(
    (el) =>
      el.id === "ft-roulette-card"
        ? "THURSDAY ROULETTE"
        : el.textContent!.trim().toUpperCase(),
  );

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadModules() {
  vi.resetModules();
  return {
    initRouletteStats: (
      await import("../src/features/profile/roulette-stats.ts")
    ).initRouletteStats,
    optimizeLayout: (await import("../src/features/profile/layout.ts"))
      .optimizeLayout,
  };
}

function stubPendingWorker() {
  let respond: () => void = () => {};
  const workerResponse = new Promise<void>((resolve) => {
    respond = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      workerResponse.then(() => ({
        ok: true,
        json: async () => ({
          roulette: { entries: [] },
          evalStats: {
            byMonth: {},
            global: { total: 0, failed: 0, successPercentage: null },
          },
        }),
      })),
    ),
  );
  return () => respond();
}

describe("dashboard card order", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div class="dash-main">${intraCard(
      "Agenda",
    )}${intraCard("Projects")}</div>`;
  });

  it("moves the loading card into the user's configured slot", async () => {
    const respond = stubPendingWorker();
    const { initRouletteStats, optimizeLayout } = await loadModules();

    await initRouletteStats();
    await settle();
    await optimizeLayout();

    expect(titles(), "ordered while still loading").toEqual(ORDER);

    respond();
    await settle();
    await optimizeLayout();

    expect(titles(), "still ordered once filled").toEqual(ORDER);
  });

  it("waits for intra's own cards before taking a slot", async () => {
    document.body.innerHTML = `<div class="dash-main"></div>`;
    const respond = stubPendingWorker();
    const { initRouletteStats, optimizeLayout } = await loadModules();

    await initRouletteStats();
    await settle();

    expect(
      document.getElementById("ft-roulette-card"),
      "no lone card on an empty dashboard",
    ).toBeNull();

    document
      .querySelector(".dash-main")!
      .insertAdjacentHTML(
        "beforeend",
        `${intraCard("Agenda")}${intraCard("Projects")}`,
      );
    await settle();
    await optimizeLayout();

    expect(document.getElementById("ft-roulette-card")).not.toBeNull();
    expect(titles()).toEqual(ORDER);

    respond();
    await settle();
  });
});
