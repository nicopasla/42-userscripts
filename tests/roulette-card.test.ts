/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://profile-v3.intra.42.fr/" }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config.ts", () => ({
  getConfig: vi.fn(async (key: string) =>
    key === "PROFILE_SHOW_ROULETTE" || key === "PROFILE_SHOW_ROULETTE_HISTORY"
      ? true
      : "token",
  ),
}));
vi.mock("../src/features/account/account.ts", () => ({
  getCloudLogin: vi.fn(async () => "me"),
}));
vi.mock("../src/utils/crypto.ts", () => ({
  hashLogin: vi.fn(async () => "hashed"),
}));

import { initRouletteStats } from "../src/features/profile/roulette-stats.ts";

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

describe("roulette card", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div class="dash-main"><div class="bg-white md:h-96">' +
      '<span class="font-bold uppercase text-sm">Agenda</span></div></div>';
  });

  it("mounts the card with placeholders, then fills it in place", async () => {
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
            roulette: {
              entries: [
                {
                  historic_id: 1,
                  sum: 42,
                  total: 42,
                  created_at: "2026-08-20T06:00:00Z",
                },
              ],
            },
            evalStats: {
              byMonth: {},
              global: { total: 7, failed: 1, successPercentage: 85 },
            },
          }),
        })),
      ),
    );

    await initRouletteStats();
    await nextFrame();
    await nextFrame();

    const card = document.getElementById("ft-roulette-card");
    expect(card, "card is mounted before the worker responds").not.toBeNull();
    expect(card!.textContent).toContain("Thursday Roulette");
    expect(card!.querySelectorAll(".ft-skeleton").length).toBeGreaterThan(0);

    respond();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const filled = document.getElementById("ft-roulette-card")!;
    expect(filled, "the same node is filled, not a new card").toBe(card);
    expect(filled.querySelectorAll(".ft-skeleton").length).toBe(0);
    expect(filled.textContent).toContain("42");
    expect(filled.textContent).toContain("85%");
  });
});
