import { describe, it, expect } from "vitest";
import {
  isFutureStudent,
  groupFutureIntakes,
} from "../src/features/profile/students/data";
import type { StudentEntry } from "../src/features/profile/students/data";

const entry = (beginAt: string | null, login = "abc"): StudentEntry => ({
  login,
  displayname: login,
  image_url: "",
  begin_at: beginAt,
  blackholed_at: null,
  active: true,
  alumni: false,
  pool_month: null,
  pool_year: null,
});

describe("isFutureStudent", () => {
  it("is true for a future begin_at", () => {
    expect(isFutureStudent(entry("2099-10-01T00:00:00Z"))).toBe(true);
  });

  it("is false for a past begin_at", () => {
    expect(isFutureStudent(entry("2020-01-01T00:00:00Z"))).toBe(false);
  });

  it("is false for a null begin_at", () => {
    expect(isFutureStudent(entry(null))).toBe(false);
  });

  it("is false when begin_at equals now", () => {
    const now = Date.now();
    expect(isFutureStudent(entry(new Date(now).toISOString()), now)).toBe(false);
  });
});

describe("groupFutureIntakes", () => {
  it("groups future entries by month/year, sorted ascending", () => {
    const groups = groupFutureIntakes([
      entry("2099-10-01T00:00:00Z", "oct"),
      entry("2099-04-05T00:00:00Z", "apr"),
      entry("2100-10-01T00:00:00Z", "oct2"),
      entry("2099-10-20T00:00:00Z", "oct3"),
    ]);
    expect(groups.map((g) => `${g.year}-${String(g.month).padStart(2, "0")}`)).toEqual(
      ["2099-04", "2099-10", "2100-10"],
    );
    expect(groups[0].label).toBe("April 2099");
    expect(groups[1].label).toBe("October 2099");
  });

  it("skips past and invalid begin_at entries", () => {
    const groups = groupFutureIntakes([
      entry("2020-01-01T00:00:00Z", "past"),
      entry("not-a-date", "bad"),
      entry(null, "null"),
      entry("2099-01-15T00:00:00Z", "ok"),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["January 2099"]);
  });
});