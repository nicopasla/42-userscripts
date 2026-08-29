/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://profile-v3.intra.42.fr/users/bob" }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const FUTURE = new Date(Date.now() + 7 * 86400000).toISOString();

const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadFreeze() {
  vi.resetModules();
  return (await import("../src/features/profile/freeze.ts")).initFreezeCard;
}

describe("freeze card", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="flex flex-col lg:flex-row gap-6 md:gap-8">
        <div id="profile-card"></div>
      </div>`;
    sessionStorage.setItem("ft_intrapy_token", "token");
    await chrome.storage.local.set({
      FREEZE_CACHE: JSON.stringify({ bob: FUTURE }),
    });
  });

  it("draws the cached freeze before the intra API answers", async () => {
    let respond: () => void = () => {};
    const cursusResponse = new Promise<void>((resolve) => {
      respond = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        cursusResponse.then(() => ({
          ok: true,
          json: async () => [{ freeze_until: FUTURE }],
        })),
      ),
    );

    const initFreezeCard = await loadFreeze();
    const done = initFreezeCard();
    await settle();

    const card = document.getElementById("ft-freeze-card");
    expect(card, "cached freeze is drawn immediately").not.toBeNull();
    expect(card!.dataset.freezeUntil).toBe(FUTURE);

    respond();
    await done;
    await settle();

    const confirmed = document.getElementById("ft-freeze-card");
    expect(confirmed, "the confirmed card is kept").not.toBeNull();
    expect(confirmed).toBe(card);
  });

  it("drops the card when the user is no longer frozen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => [{ freeze_until: null }] })),
    );

    const initFreezeCard = await loadFreeze();
    await initFreezeCard();
    await settle();

    expect(document.getElementById("ft-freeze-card")).toBeNull();
    const stored = await chrome.storage.local.get("FREEZE_CACHE");
    expect(JSON.parse(stored.FREEZE_CACHE as string).bob).toBeUndefined();
  });
});
