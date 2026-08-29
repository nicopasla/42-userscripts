/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://profile-v3.intra.42.fr/" }
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config.ts", () => ({
  getConfig: vi.fn(async (key: string) =>
    key === "PROFILE_SHOW_MARKS" ? true : "",
  ),
}));
vi.mock("../src/features/account/account.ts", () => ({
  getCloudLogin: vi.fn(async () => "me"),
}));
vi.mock("../src/utils/crypto.ts", () => ({
  hashLogin: vi.fn(async () => "hashed"),
}));

import { initMarks } from "../src/features/profile/marks.ts";

const projectsCard = () => `
  <div class="bg-white md:h-96">
    <div class="flex flex-col w-full h-full">
      <span class="font-bold uppercase text-sm">Projects</span>
      <div class="h-full"><ul><li>libft</li></ul></div>
    </div>
  </div>`;

const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

describe("marks list", () => {
  beforeEach(() => {
    document.body.innerHTML = projectsCard();
    sessionStorage.setItem("ft_intrapy_token", "token");
    sessionStorage.setItem("ft_active_cursus_id", "21");
  });

  it("holds the list space with placeholders until the intra API answers", async () => {
    let respond: () => void = () => {};
    const marksResponse = new Promise<void>((resolve) => {
      respond = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        marksResponse.then(() => ({
          ok: true,
          json: async () => [
            {
              projects_user_id: 1,
              project_name: "libft",
              project_slug: "libft",
              final_mark: 125,
              last_event_date: "2026-08-20T10:00:00",
              is_validated: true,
              occurrence: 0,
              teams: [],
            },
          ],
        })),
      ),
    );

    const done = initMarks();
    await settle();

    const skeleton = document.getElementById("ft-marks-skeleton");
    expect(skeleton, "placeholder rows are shown while loading").not.toBeNull();
    expect(skeleton!.querySelectorAll(".ft-skeleton").length).toBeGreaterThan(0);

    respond();
    await done;
    await settle();

    expect(document.getElementById("ft-marks-skeleton")).toBeNull();
    const injected = document.getElementById("ft-marks-injected");
    expect(injected, "the real list replaced the placeholders").not.toBeNull();
    expect(injected!.textContent).toContain("libft");
  });
});
