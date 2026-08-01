import { html, render } from "lit-html";
import { sharedCSS } from "../../assets/shared-styles.ts";
import { getConfig } from "../../config.ts";
import { hashLogin } from "../../utils/crypto.ts";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import LIST_SVG from "../../assets/svg/list.svg?raw";
import GRID_SVG from "../../assets/svg/grid.svg?raw";
import SORT_AZ_SVG from "../../assets/svg/sort-az.svg?raw";
import SORT_ZA_SVG from "../../assets/svg/sort-za.svg?raw";
import CAL_DOWN_SVG from "../../assets/svg/calendar-arrow-down.svg?raw";
import CAL_UP_SVG from "../../assets/svg/calendar-arrow-up.svg?raw";

const WORKER_URL = "https://api.betterintra.com";

type SortField = "name" | "date";
type SortDir = "asc" | "desc";

interface StudentEntry {
  login: string;
  displayname: string;
  image_url: string;
  begin_at?: string | null;
}

interface StudentsResponse {
  cached_at?: number;
  data?: StudentEntry[];
}

interface Intake {
  month: number;
  year: number;
  label: string;
}

const PISCINE_MONTHS = [
  { value: 2, label: "February", color: "#ff6b6b" },
  { value: 3, label: "March", color: "#f06595" },
  { value: 7, label: "July", color: "#ffd43b" },
  { value: 8, label: "August", color: "#da77f2" },
];

function formatTimeAgo(ts: number): string {
  const secs = Date.now() / 1000 - ts;
  if (secs < 3) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}

function formatMonthYear(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function nextIntakes(now: Date): Intake[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const april = month <= 4 ? { month: 4, year } : { month: 4, year: year + 1 };
  const october =
    month <= 10 ? { month: 10, year } : { month: 10, year: year + 1 };
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return [april, october]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((i) => ({
      ...i,
      label: `${MONTH_NAMES[i.month - 1]} ${i.year}`,
    }));
}

function beginAtIntake(beginAt: string | null | undefined): Intake | null {
  if (!beginAt) return null;
  const d = new Date(beginAt);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: "" };
}

async function fetchStudents(): Promise<{
  data?: StudentsResponse;
  unauthorized?: boolean;
} | null> {
  return fetchEndpoint("students", new URLSearchParams());
}

async function fetchPisciners(year: number, month: number): Promise<{
  data?: StudentsResponse;
  unauthorized?: boolean;
} | null> {
  return fetchEndpoint("pisciners", new URLSearchParams({ year: String(year), month: String(month) }));
}

async function fetchEndpoint(
  path: "students" | "pisciners",
  params: URLSearchParams,
): Promise<{ data?: StudentsResponse; unauthorized?: boolean } | null> {
  try {
    const cloudLogin = await getConfig("CLOUD_LOGIN");
    const token = await getConfig("CLOUD_TOKEN");
    if (!cloudLogin || !token) return { unauthorized: true };

    params.set("_", String(Date.now()));
    params.set("login", await hashLogin(cloudLogin));

    const res = await fetch(`${WORKER_URL}/api/v1/${path}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { unauthorized: true };
    if (!res.ok) return null;
    const json = (await res.json()) as StudentsResponse | StudentEntry[];
    if (Array.isArray(json)) return { data: { data: json } };
    return { data: json as StudentsResponse };
  } catch {
    return null;
  }
}

export async function openStudentsDialog() {
  const campusId = await getConfig("CLUSTERS_CAMPUS");
  if (campusId !== "12") return;

  const now = new Date();
  const currentYear = now.getFullYear();

  const themePref = await getConfig("BETTER_INTRA_THEME");
  const isDark =
    themePref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themePref !== "light";
  const presetKey = (await getConfig("PROFILE_THEME_PRESET")) || "dark";
  const currentTheme =
    presetKey !== "dark" && presetKey !== "light"
      ? presetKey
      : isDark
        ? "dark"
        : "light";

  let tab: "students" | "pisciners" | "new" = "students";
  let view: "grid" | "list" = "grid";
  let sortField: SortField = "name";
  let nameDir: SortDir = "asc";
  let dateDir: SortDir = "desc";
  let selectedMonth = PISCINE_MONTHS[0];
  let selectedYear = currentYear;

  const savedView = (await chrome.storage.local.get("STUDENTS_VIEW")) as {
    STUDENTS_VIEW?: "grid" | "list";
  };
  if (
    savedView.STUDENTS_VIEW === "grid" ||
    savedView.STUDENTS_VIEW === "list"
  ) {
    view = savedView.STUDENTS_VIEW;
  }

  const setView = (v: "grid" | "list") => {
    if (view === v) return;
    view = v;
    chrome.storage.local.set({ STUDENTS_VIEW: view });
    rerender();
  };

  const savedSort = (await chrome.storage.local.get("STUDENTS_SORT")) as {
    STUDENTS_SORT?: { field?: SortField; nameDir?: SortDir; dateDir?: SortDir };
  };
  const savedSortData = savedSort.STUDENTS_SORT;
  if (savedSortData) {
    if (savedSortData.field === "name" || savedSortData.field === "date")
      sortField = savedSortData.field;
    if (savedSortData.nameDir === "asc" || savedSortData.nameDir === "desc")
      nameDir = savedSortData.nameDir;
    if (savedSortData.dateDir === "asc" || savedSortData.dateDir === "desc")
      dateDir = savedSortData.dateDir;
  }

  const persistSort = () => {
    chrome.storage.local.set({
      STUDENTS_SORT: { field: sortField, nameDir, dateDir },
    });
  };

  const sortEntries = (list: StudentEntry[]): StudentEntry[] =>
    [...list].sort((a, b) => {
      if (tab !== "pisciners" && sortField === "date") {
        const at = a.begin_at ? new Date(a.begin_at).getTime() : 0;
        const bt = b.begin_at ? new Date(b.begin_at).getTime() : 0;
        const diff = bt - at;
        const result = dateDir === "desc" ? diff : -diff;
        return result || a.login.localeCompare(b.login);
      }
      const an = `${a.displayname || a.login}`.toLowerCase();
      const bn = `${b.displayname || b.login}`.toLowerCase();
      const cmp = an.localeCompare(bn) || a.login.localeCompare(b.login);
      return nameDir === "asc" ? cmp : -cmp;
    });

  const setSort = (field: SortField) => {
    if (sortField === field) {
      if (field === "name") nameDir = nameDir === "asc" ? "desc" : "asc";
      else dateDir = dateDir === "desc" ? "asc" : "desc";
    } else {
      sortField = field;
    }
    persistSort();
    entries = sortEntries(entries);
    rerender();
  };

  const saved = (await chrome.storage.local.get("STUDENTS_SELECTION")) as {
    STUDENTS_SELECTION?: { month: number; year: number };
  };
  if (saved.STUDENTS_SELECTION) {
    const m = PISCINE_MONTHS.find(
      (x) => x.value === saved.STUDENTS_SELECTION!.month,
    );
    if (m) selectedMonth = m;
    const y = saved.STUDENTS_SELECTION.year;
    if (y >= 2023 && y <= currentYear) selectedYear = y;
  }

  const saveSelection = () => {
    chrome.storage.local.set({
      STUDENTS_SELECTION: {
        month: selectedMonth.value,
        year: selectedYear,
      },
    });
  };

  let entries: StudentEntry[] = [];
  let loading = true;
  let lastFetched = 0;
  let query = "";
  let authError = false;

  const dialog = Object.assign(document.createElement("dialog"), {
    id: "students-dialog",
    className: "bg-transparent backdrop:bg-black/60",
  });
  Object.assign(dialog.style, {
    margin: "auto",
    width: "min(680px, calc(100dvw - 2rem))",
    height: "min(640px, calc(100dvh - 2rem))",
    borderRadius: "1rem",
    overflow: "hidden",
    padding: "0",
    border: "none",
    background: "transparent",
  });

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display:flex;flex-direction:column;height:100%;overflow:hidden;";
  dialog.appendChild(wrapper);

  const shadow = wrapper.attachShadow({ mode: "closed" });

  const close = () => {
    dialog.close();
    dialog.remove();
  };

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  const yearOptions = (): number[] => {
    const years: number[] = [];
    for (let y = currentYear; y >= 2023; y--) {
      years.push(y);
    }
    return years;
  };

  const load = async () => {
    loading = true;
    authError = false;
    rerender();
    let res: Awaited<ReturnType<typeof fetchStudents>>;
    if (tab === "pisciners") {
      res = await fetchPisciners(selectedYear, selectedMonth.value);
    } else {
      res = await fetchStudents();
    }
    if (res?.unauthorized) {
      entries = [];
      lastFetched = 0;
      authError = true;
    } else if (res?.data) {
      entries = sortEntries(res.data.data || []);
      lastFetched = res.data.cached_at || 0;
    } else {
      entries = [];
      lastFetched = 0;
    }
    loading = false;
    rerender();
  };

  const switchTab = async (t: "students" | "pisciners" | "new") => {
    if (tab === t) return;
    tab = t;
    query = "";
    rerender();
    await load();
  };

  function renderTemplate() {
    const years = yearOptions();
    const ago = lastFetched ? formatTimeAgo(lastFetched) : "";
    const q = query.trim().toLowerCase();
    const intakes = nextIntakes(new Date());
    const inFutureIntake = (e: StudentEntry): boolean => {
      const intake = beginAtIntake(e.begin_at);
      return (
        !!intake &&
        intakes.some((i) => i.month === intake.month && i.year === intake.year)
      );
    };
    const intakeFiltered =
      tab === "new"
        ? entries.filter(inFutureIntake)
        : tab === "students"
          ? entries.filter((e) => !inFutureIntake(e))
          : entries;
    const filtered = intakeFiltered.filter((e) =>
      !q || `${e.login} ${e.displayname}`.toLowerCase().includes(q),
    );
    const cursusLabel =
      tab === "pisciners"
        ? "Piscine Brussels"
        : tab === "new"
          ? "Future students"
          : "42 Cursus";
    const dateLabel =
      tab === "pisciners"
        ? `${selectedMonth.label} ${selectedYear}`
        : tab === "new"
          ? intakes.map((i) => i.label).join(" · ")
          : "all students";
    const renderRows = (rows: StudentEntry[]) => html`
      <div class="${view}">
        ${rows.map(
          (r) => html`<div
            class="row"
            @click="${() => {
              window.open(
                `https://profile.intra.42.fr/users/${r.login}`,
                "_blank",
              );
            }}"
          >
            <img
              class="avatar"
              src="${r.image_url}"
              alt="${r.login}"
              loading="lazy"
            />
            <div class="info">
              <div class="displayname">${r.displayname || r.login}</div>
              <div class="login">${r.login}</div>
            </div>
            ${formatMonthYear(r.begin_at)
              ? html`<span class="date">${formatMonthYear(r.begin_at)}</span>`
              : ""}
          </div>`,
        )}
      </div>
    `;
    return html`
      <style>
        :host {
          display: block;
        }
        ${sharedCSS}
        .row {
          border-radius: 0.5rem;
          cursor: pointer;
          min-width: 0;
        }
        .row:hover {
          background: var(--color-base-200);
        }
        .grid .row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
        }
        .list .row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
        }
        .avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .info {
          min-width: 0;
        }
        .grid .info {
          width: 100%;
          text-align: center;
        }
        .list .info {
          flex: 1;
          text-align: left;
        }
        .displayname {
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--color-base-content);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .login {
          font-size: 0.7rem;
          opacity: 0.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .date {
          font-size: 0.7rem;
          opacity: 0.6;
          font-weight: 600;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .grid .date {
          text-align: center;
          width: 100%;
        }
        .list .date {
          margin-left: auto;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .tab-btn {
          flex: 1;
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.4rem;
          border-radius: 0.5rem;
          cursor: pointer;
          color: var(--color-base-content);
          background: transparent;
          border: none;
        }
        .tab-btn.active {
          background: var(--color-primary);
          color: var(--color-primary-content);
        }
      </style>
      <div
        data-theme="${currentTheme}"
        class="flex flex-col bg-base-100 rounded-xl"
        style="height:100%;"
      >
        <div class="sticky top-0 z-10 bg-base-100 rounded-t-xl">
          <div class="flex items-center gap-2 p-3">
            <div
              class="flex flex-1 gap-1 rounded-lg bg-base-200 p-1"
              style="border-radius:var(--radius-field)"
            >
              <button
                class="tab-btn ${tab === "students" ? "active" : ""}"
                @click="${() => switchTab("students")}"
              >
                Students
              </button>
              <button
                class="tab-btn ${tab === "new" ? "active" : ""}"
                @click="${() => switchTab("new")}"
              >
                Future students
              </button>
              <button
                class="tab-btn ${tab === "pisciners" ? "active" : ""}"
                @click="${() => switchTab("pisciners")}"
              >
                Pisciners
              </button>
            </div>
            ${ago
              ? html`<span
                  class="btn btn-accent border border-base-content/20 flex-shrink-0"
                  >Updated ${ago === "now" ? ago : ago + " ago"}</span
                >`
              : ""}
            <button
              class="btn btn-circle btn-ghost btn-sm text-xl ml-auto"
              @click="${close}"
            >
              ✕
            </button>
          </div>
          <div class="flex items-center gap-2 px-3 pb-3">
            <input
              class="input input-sm w-64"
              type="search"
              placeholder="Search..."
              .value="${query}"
              @input="${(e: Event) => {
                query = (e.target as HTMLInputElement).value;
                rerender();
              }}"
            />
            <span
              class="badge badge-sm badge-accent h-8 flex-shrink-0 font-bold"
              style="white-space:nowrap;border-radius:var(--radius-field)"
              title="${cursusLabel} — ${dateLabel}"
              >${intakeFiltered.length}</span
            >
            ${tab === "pisciners"
              ? html`
                  <select
                    class="select select-sm w-32"
                    @change="${async (e: Event) => {
                      const v = Number((e.target as HTMLSelectElement).value);
                      selectedMonth =
                        PISCINE_MONTHS.find((m) => m.value === v) ||
                        PISCINE_MONTHS[0];
                      saveSelection();
                      await load();
                    }}"
                  >
                    ${PISCINE_MONTHS.map(
                      (m) =>
                        html`<option
                          value="${m.value}"
                          ?selected="${m.value === selectedMonth.value}"
                          style="color:${m.color};font-weight:600;"
                        >
                          ${m.label}
                        </option>`,
                    )}
                  </select>
                  <select
                    class="select select-sm w-20"
                    @change="${async (e: Event) => {
                      selectedYear = Number(
                        (e.target as HTMLSelectElement).value,
                      );
                      saveSelection();
                      await load();
                    }}"
                  >
                    ${years.map(
                      (y) =>
                        html`<option
                          value="${y}"
                          ?selected="${y === selectedYear}"
                        >
                          ${y}
                        </option>`,
                    )}
                  </select>
                `
              : ""}
            <div class="join ml-auto">
              <button
                class="btn btn-sm join-item ${view === "grid" ? "btn-primary" : "btn-outline border-base-content/20"}"
                title="Grid view"
                @click="${() => setView("grid")}"
              >
                ${unsafeHTML(
                  GRID_SVG.replace("<svg", '<svg width="16" height="16"'),
                )}
              </button>
              <button
                class="btn btn-sm join-item ${view === "list" ? "btn-primary" : "btn-outline border-base-content/20"}"
                title="List view"
                @click="${() => setView("list")}"
              >
                ${unsafeHTML(
                  LIST_SVG.replace("<svg", '<svg width="16" height="16"'),
                )}
              </button>
            </div>
            <div class="join">
              <button
                class="btn btn-sm join-item ${sortField === "name" ? "btn-primary" : "btn-outline border-base-content/20"}"
                title="${nameDir === "asc" ? "Name A → Z (click to invert)" : "Name Z → A (click to invert)"}"
                @click="${() => setSort("name")}"
              >
                ${unsafeHTML(
                  (nameDir === "asc" ? SORT_AZ_SVG : SORT_ZA_SVG).replace(
                    "<svg",
                    '<svg width="16" height="16"',
                  ),
                )}
              </button>
              ${tab !== "pisciners"
                ? html`<button
                    class="btn btn-sm join-item ${sortField === "date" ? "btn-primary" : "btn-outline border-base-content/20"}"
                    title="${dateDir === "desc" ? "Date (newest first)" : "Date (oldest first)"}"
                    @click="${() => setSort("date")}"
                  >
                    ${unsafeHTML(
                      (dateDir === "desc" ? CAL_DOWN_SVG : CAL_UP_SVG).replace(
                        "<svg",
                        '<svg width="16" height="16"',
                      ),
                    )}
                  </button>`
                : ""}
            </div>
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto p-3">
          ${loading
            ? html`<div class="flex items-center justify-center p-8">
                <span class="loading loading-spinner loading-lg"></span>
              </div>`
            : authError
              ? html`<div class="text-center p-6 text-base-content/50">
                  Requires a connected 42 account
                </div>`
              : filtered.length === 0
                ? html`<div class="text-center p-6 text-base-content/50">
                    ${entries.length === 0 ? "No data" : "No results"}
                  </div>`
                : tab === "new"
                  ? html`<div class="flex flex-col gap-5">
                      ${intakes.map((i) => {
                        const rows = filtered.filter((e) => {
                          const intake = beginAtIntake(e.begin_at);
                          return (
                            intake &&
                            intake.month === i.month &&
                            intake.year === i.year
                          );
                        });
                        if (rows.length === 0) return html``;
                        return html`<div>
                          <div
                            class="flex items-center gap-2 mb-2 px-1"
                          >
                            <span
                              class="text-xs opacity-50 font-semibold uppercase tracking-wider"
                            >
                              ${i.label}
                            </span>
                            <span
                              class="badge badge-sm"
                              style="border-radius:var(--radius-field)"
                              >${rows.length}</span
                            >
                          </div>
                          ${renderRows(rows)}
                        </div>`;
                      })}
                    </div>`
                  : renderRows(filtered)}
        </div>
      </div>
    `;
  }

  const rerender = () => {
    render(renderTemplate(), shadow);
  };

  rerender();
  document.body.appendChild(dialog);
  dialog.showModal();
  await load();
}
