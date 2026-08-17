import { describe, it, expect } from "vitest";
import {
  sortActiveUsers,
  ACTIVE_SORT_DEFAULT,
} from "../src/features/clusters/map-dialog/render";

function entry(login: string, beginAt: string) {
  return {
    host: `c1-r1-${login}`,
    login,
    cdn_uri: "",
    begin_at: beginAt,
    end_at: null,
  };
}

const alice = { ...entry("alice", "2026-08-17T09:00:00Z"), cdn_uri: "" };
const bob = { ...entry("bob", "2026-08-17T10:30:00Z"), cdn_uri: "" };
const carol = { ...entry("carol", "2026-08-17T09:00:00Z"), cdn_uri: "" };

describe("sortActiveUsers", () => {
  it("sorts by login ascending by default", () => {
    const result = sortActiveUsers(
      [bob, alice],
      ACTIVE_SORT_DEFAULT.mode,
      ACTIVE_SORT_DEFAULT.nameDir,
      ACTIVE_SORT_DEFAULT.sinceDir,
    );
    expect(result.map((e) => e.login)).toEqual(["alice", "bob"]);
  });

  it("sorts by login descending", () => {
    const result = sortActiveUsers(
      [alice, bob],
      "name",
      "desc",
      ACTIVE_SORT_DEFAULT.sinceDir,
    );
    expect(result.map((e) => e.login)).toEqual(["bob", "alice"]);
  });

  it("sorts by connection time newest first by default", () => {
    const result = sortActiveUsers(
      [alice, bob],
      "since",
      "asc",
      ACTIVE_SORT_DEFAULT.sinceDir,
    );
    expect(result.map((e) => e.login)).toEqual(["bob", "alice"]);
  });

  it("sorts by connection time oldest first when sinceDir is asc", () => {
    const result = sortActiveUsers([bob, alice], "since", "asc", "asc");
    expect(result.map((e) => e.login)).toEqual(["alice", "bob"]);
  });

  it("tie-breaks equal connection times by login", () => {
    const result = sortActiveUsers(
      [carol, alice],
      "since",
      "asc",
      ACTIVE_SORT_DEFAULT.sinceDir,
    );
    expect(result.map((e) => e.login)).toEqual(["alice", "carol"]);
  });

  it("does not mutate the input array", () => {
    const input = [bob, alice];
    sortActiveUsers(input, "name", "asc", "desc");
    expect(input.map((e) => e.login)).toEqual(["bob", "alice"]);
  });
});
