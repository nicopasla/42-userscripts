import { describe, it, expect } from "vitest";
import {
  parseSubjectLink,
  normalizeUrl,
  decide,
  formatShortDate,
  formatRelativeTime,
} from "../src/features/subjects/fingerprint";
import { maybeRenderBadge } from "../src/features/subjects/tracker";

describe("parseSubjectLink", () => {
  it("parses a cdn subject link", () => {
    const link = parseSubjectLink(
      "https://cdn.example.com/pdf/pdf/900001/en.subject.example.pdf",
    );
    expect(link).toEqual({
      url: "https://cdn.example.com/pdf/pdf/900001/en.subject.example.pdf",
      subjectId: "900001",
      lang: "en",
      filename: "en.subject.example.pdf",
    });
  });

  it("rejects non-pdf attachments", () => {
    expect(
      parseSubjectLink(
        "https://cdn.example.com/document/document/900003/generator.tar.gz",
      ),
    ).toBeNull();
  });

  it("normalizes away query strings and fragments", () => {
    const link = parseSubjectLink(
      "https://cdn.example.com/pdf/pdf/900002/en.subject.example.pdf?download=1#top",
    );
    expect(link?.url).toBe(
      "https://cdn.example.com/pdf/pdf/900002/en.subject.example.pdf",
    );
    expect(link?.subjectId).toBe("900002");
  });

  it("returns null lang when the filename has no language prefix", () => {
    const link = parseSubjectLink(
      "https://cdn.example.com/pdf/pdf/900002/subject.example.pdf",
    );
    expect(link?.lang).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("keeps origin and path only", () => {
    expect(normalizeUrl("https://x.intra.42.fr/a/b?q=1#h")).toBe(
      "https://x.intra.42.fr/a/b",
    );
  });
});

describe("decide", () => {
  const next = {
    url: "https://cdn.example.com/pdf/pdf/900010/en.subject.example.pdf",
    subjectId: "900010",
    lang: "en",
    createdAt: null,
    modifiedAt: null,
  };

  it("returns first when there is no previous record", () => {
    expect(decide(null, next)).toBe("first");
  });

  it("returns first when the previous record has no url", () => {
    expect(decide({ url: undefined }, next)).toBe("first");
  });

  it("returns known when the url is unchanged", () => {
    expect(decide(next, next)).toBe("known");
  });

  it("returns changed when the url differs", () => {
    expect(
      decide(
        {
          url: "https://cdn.example.com/pdf/pdf/900010/en.subject.example.pdf",
        },
        {
          ...next,
          url: "https://cdn.example.com/pdf/pdf/900011/en.subject.example.pdf",
        },
      ),
    ).toBe("changed");
  });
});

describe("formatShortDate", () => {
  it("formats as DD/MM/YY in UTC", () => {
    expect(formatShortDate(Date.UTC(2026, 7, 11, 16, 19, 24))).toBe("11/08/26");
  });
});

describe("formatRelativeTime", () => {
  const NOW = Date.UTC(2026, 7, 11, 16, 19, 24);

  it("returns 'just now' for fresh timestamps", () => {
    expect(formatRelativeTime(NOW - 5_000, NOW)).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    expect(formatRelativeTime(NOW - 3 * 3_600_000, NOW)).toBe("3h ago");
  });

  it("returns days ago", () => {
    expect(formatRelativeTime(NOW - 2 * 86_400_000, NOW)).toBe("2d ago");
  });

  it("falls back to an absolute date after a week", () => {
    expect(formatRelativeTime(NOW - 10 * 86_400_000, NOW)).toBe("01/08/26");
  });
});

describe("maybeRenderBadge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mount() {
    const summary = document.createElement("div");
    summary.className = "project-summary";
    const anchor = document.createElement("a");
    summary.appendChild(anchor);
    document.body.appendChild(summary);
    return { summary, anchor };
  }

  it("renders nothing without a button or a change date", () => {
    maybeRenderBadge("foo", {}, null);
    expect(document.getElementById("ft-subject-update-host")).toBeNull();
  });

  it("appends the badge to the end of the project summary", () => {
    const { summary, anchor } = mount();
    maybeRenderBadge("python-module-10", { versionDate: Date.now() }, anchor);
    const badge = document.getElementById("ft-subject-update-host");
    expect(badge).toBeTruthy();
    expect(summary.lastElementChild).toBe(badge);
  });

  it("writes 'Subject updated' with a relative time for a baseline date", () => {
    const { anchor } = mount();
    maybeRenderBadge("python-module-10", { versionDate: Date.now() }, anchor);
    const badge = document.getElementById("ft-subject-update-host");
    const shadowText = badge?.shadowRoot?.textContent ?? "";
    expect(shadowText).toContain("Subject updated");
    expect(shadowText).toContain("just now");
  });

  it("writes 'Subject updated' with relative time when a change was recorded", () => {
    const { anchor } = mount();
    maybeRenderBadge(
      "python-module-10",
      { changedAt: Date.now() - 3 * 3_600_000 },
      anchor,
    );
    const badge = document.getElementById("ft-subject-update-host");
    const shadowText = badge?.shadowRoot?.textContent ?? "";
    expect(shadowText).toContain("Subject updated");
    expect(shadowText).toContain("3h ago");
  });

  it("falls back to an absolute date after a week", () => {
    const { anchor } = mount();
    maybeRenderBadge(
      "python-module-10",
      { versionDate: Date.UTC(2026, 7, 11, 16, 19, 24) },
      anchor,
    );
    const badge = document.getElementById("ft-subject-update-host");
    const shadowText = badge?.shadowRoot?.textContent ?? "";
    expect(shadowText).toContain("Subject updated");
    expect(shadowText).toContain("11/08/26");
    expect(shadowText).not.toContain("ago");
  });

  it("colors the badge red within 7 days", () => {
    const { anchor } = mount();
    maybeRenderBadge("python-module-10", { versionDate: Date.now() }, anchor);
    const badge = document.getElementById("ft-subject-update-host");
    const pill = badge?.shadowRoot?.querySelector<HTMLElement>(
      'span[style*="background"]',
    );
    expect(pill?.style.background).toContain("var(--color-error");
  });

  it("colors the badge neutral after 30 days", () => {
    const { anchor } = mount();
    maybeRenderBadge(
      "python-module-10",
      { versionDate: Date.now() - 45 * 86_400_000 },
      anchor,
    );
    const badge = document.getElementById("ft-subject-update-host");
    const pill = badge?.shadowRoot?.querySelector<HTMLElement>(
      'span[style*="background"]',
    );
    expect(pill?.style.background).not.toContain("var(--color-error");
    expect(pill?.style.background).not.toContain("var(--color-warning");
  });
});
