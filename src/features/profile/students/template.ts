import { html, TemplateResult } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { sharedCSS } from "../../../assets/shared-styles.ts";
import LIST_SVG from "../../../assets/svg/list.svg?raw";
import GRID_SVG from "../../../assets/svg/grid.svg?raw";
import SKULL_SVG from "../../../assets/svg/skull.svg?raw";
import GRADUATION_CAP_SVG from "../../../assets/svg/graduation-cap.svg?raw";
import POOL_SVG from "../../../assets/svg/pool.svg?raw";
import ENTRY_DATE_SVG from "../../../assets/svg/entry-date.svg?raw";
import FREEZE_SVG from "../../../assets/svg/freeze.svg?raw";
import SORT_AZ_SVG from "../../../assets/svg/sort-az.svg?raw";
import SORT_ZA_SVG from "../../../assets/svg/sort-za.svg?raw";
import CAL_DOWN_SVG from "../../../assets/svg/calendar-arrow-down.svg?raw";
import CAL_UP_SVG from "../../../assets/svg/calendar-arrow-up.svg?raw";
import FILTER_SVG from "../../../assets/svg/filter.svg?raw";
import FILTER_CLEAR_SVG from "../../../assets/svg/filter-clear.svg?raw";
import CHECK_SVG from "../../../assets/svg/check.svg?raw";
import {
  PISCINE_MONTHS,
  beginAtIntake,
  formatAlumniDate,
  formatBlackholeDate,
  formatMonthYear,
  formatPool,
  formatPoolFull,
  formatShortDate,
  formatTimeAgo,
  isBlackholed,
  isFrozen,
  formatLevel,
  isCurrentPiscineMonth,
  nextIntakes,
  poolIntakes,
  poolMonthName,
  poolYearOptions,
  yearOptions,
} from "./data.ts";
import type {
  FilterKey,
  PiscineMonth,
  SortField,
  SortDir,
  StudentEntry,
  StudentsFilter,
  StudentsTab,
  StudentsView,
} from "./data.ts";

export interface StudentsTemplateState {
  currentTheme: string;
  tab: StudentsTab;
  view: StudentsView;
  sortField: SortField;
  nameDir: SortDir;
  dateDir: SortDir;
  filter: StudentsFilter;
  poolIntake: { month: number; year: number } | null;
  poolYear: number | null;
  selectedMonth: PiscineMonth;
  selectedYear: number;
  entries: StudentEntry[];
  loading: boolean;
  lastFetched: number;
  query: string;
  authError: boolean;
  visibleCount: number;
  currentYear: number;
}

export interface StudentsTemplateHandlers {
  onSwitchTab: (tab: StudentsTab) => void;
  onSetView: (view: StudentsView) => void;
  onSetSort: (field: SortField) => void;
  onToggleFilter: (key: FilterKey) => void;
  onClose: () => void;
  onSearchInput: (value: string) => void;
  onPiscineMonth: (value: number) => void;
  onPiscineYear: (year: number) => void;
  onPoolIntake: (value: number) => void;
  onPoolYear: (value: number) => void;
  onClearFilters: () => void;
}

const STATUS_FILTERS: Array<{
  key: FilterKey;
  label: string;
  icon: string;
  color: string;
}> = [
  {
    key: "blackhole",
    label: "Blackholed",
    icon: SKULL_SVG,
    color: "btn-error",
  },
  {
    key: "alumni",
    label: "Alumni",
    icon: GRADUATION_CAP_SVG,
    color: "btn-secondary",
  },
  {
    key: "freeze",
    label: "Frozen",
    icon: FREEZE_SVG,
    color: "btn-info",
  },
];

function renderFilterMenu(
  state: StudentsTemplateState,
  handlers: StudentsTemplateHandlers,
): TemplateResult {
  const { filter, poolIntake, poolYear } = state;
  const poolYears = poolYearOptions(state.entries, state.currentYear);
  const intakes = poolIntakes(state.entries, state.currentYear);

  return html`
    <div
      class="dropdown-content students-filter-menu z-50 flex w-64 flex-col gap-1 rounded-box bg-base-100 p-2 shadow-2xl"
    >
      <span class="students-filter-menu__label">Piscine</span>
      <select
        class="select select-sm w-full"
        @change="${(e: Event) =>
          handlers.onPoolIntake(Number((e.target as HTMLSelectElement).value))}"
      >
        <option value="0" ?selected="${poolIntake === null}">
          All piscines
        </option>
        ${intakes.map(
          (i, idx) =>
            html`<option
              value="${idx + 1}"
              ?selected="${poolIntake?.month === i.month &&
              poolIntake?.year === i.year}"
            >
              ${i.label}
            </option>`,
        )}
      </select>
      <span class="students-filter-menu__label">Year</span>
      <select
        class="select select-sm w-full"
        @change="${(e: Event) =>
          handlers.onPoolYear(Number((e.target as HTMLSelectElement).value))}"
      >
        <option value="0" ?selected="${poolYear === null}">All years</option>
        ${poolYears.map(
          (y) =>
            html`<option value="${y}" ?selected="${poolYear === y}">
              ${y}
            </option>`,
        )}
      </select>
      <div class="divider my-1"></div>
      <span class="students-filter-menu__label">Status</span>
      ${STATUS_FILTERS.map(
        (f) => html`
          <button
            class="btn btn-md justify-start ${f.color} ${filter !== "none" &&
            filter !== f.key
              ? "opacity-40"
              : ""}"
            @click="${() => handlers.onToggleFilter(f.key)}"
          >
            ${unsafeHTML(f.icon.replace("<svg", '<svg width="16" height="16"'))}
            ${f.label}
            ${filter === f.key
              ? html`<span class="ml-auto"
                  >${unsafeHTML(
                    CHECK_SVG.replace("<svg", '<svg width="14" height="14"'),
                  )}</span
                >`
              : ""}
          </button>
        `,
      )}
    </div>
  `;
}

export function renderStudentsDialogTemplate(
  state: StudentsTemplateState,
  handlers: StudentsTemplateHandlers,
): TemplateResult {
  const { currentTheme, tab, view, sortField, nameDir, dateDir, filter } =
    state;
  const {
    selectedMonth,
    selectedYear,
    poolIntake,
    poolYear,
    entries,
    loading,
    lastFetched,
    query,
    authError,
    visibleCount,
    currentYear,
  } = state;

  const years = yearOptions(currentYear);
  const hasActiveFilters =
    filter !== "none" || poolIntake != null || poolYear != null;
  const ago = lastFetched ? formatTimeAgo(lastFetched) : "";
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const q = normalize(query.trim());
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
  const activeCount = intakeFiltered.filter((e) => e.active !== false).length;
  const filtered = intakeFiltered.filter((e) => {
    if (filter === "blackhole" && !isBlackholed(e)) return false;
    if (filter === "alumni" && !e.alumni) return false;
    if (filter === "freeze" && !isFrozen(e)) return false;
    if (tab === "students") {
      if (poolIntake != null) {
        if (
          e.pool_year !== String(poolIntake.year) ||
          e.pool_month?.toLowerCase() !== poolMonthName(poolIntake.month)
        )
          return false;
      } else if (poolYear != null && e.pool_year !== String(poolYear)) {
        return false;
      }
    }
    return !q || normalize(`${e.login} ${e.displayname}`).includes(q);
  });
  const display =
    filter === "blackhole"
      ? [...filtered].sort(
          (a, b) =>
            new Date(b.blackholed_at!).getTime() -
            new Date(a.blackholed_at!).getTime(),
        )
      : filter === "alumni"
        ? [...filtered].sort((a, b) => {
            const ta = a.alumnized_at
              ? new Date(a.alumnized_at).getTime()
              : 0;
            const tb = b.alumnized_at
              ? new Date(b.alumnized_at).getTime()
              : 0;
            return tb - ta;
          })
        : filtered;
  const windowed = display.slice(0, visibleCount);
  const hasMore = display.length > windowed.length;
  const cursusLabel =
    tab === "pisciners"
      ? "Piscine Brussels"
      : tab === "new"
        ? "Future students"
        : "42 Cursus";
  const countLabel =
    tab === "pisciners"
      ? "pisciners"
      : tab === "new"
        ? "future students"
        : "students";
  const dateLabel =
    tab === "pisciners"
      ? `${selectedMonth.label} ${selectedYear}`
      : tab === "new"
        ? intakes.map((i) => i.label).join(" · ")
        : "all students";
  const hidePiscineLevel =
    tab === "pisciners" &&
    isCurrentPiscineMonth(selectedMonth.value, selectedYear);
  const renderRows = (rows: StudentEntry[]) => html`
    <div class="${view}">
      ${rows.map(
        (r) =>
          html`<div
            class="row ${(tab === "students" || tab === "pisciners") &&
            r.active === false
              ? "inactive"
              : ""}"
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
              <div class="displayname">
                <span class="displayname-name"
                  >${r.displayname || r.login}</span
                >
                ${isBlackholed(r) && tab !== "pisciners"
                  ? html`<span
                      class="blackhole-badge${view === "list"
                        ? " with-text"
                        : ""}"
                      data-tip="${formatBlackholeDate(r.blackholed_at)}"
                    >
                      ${unsafeHTML(
                        SKULL_SVG.replace(
                          "<svg",
                          '<svg width="16" height="16"',
                        ),
                      )}
                      ${view === "list" ? formatShortDate(r.blackholed_at) : ""}
                    </span>`
                  : ""}
                ${isFrozen(r) && tab !== "new" && tab !== "pisciners"
                  ? html`<span
                      class="freeze-badge${view === "list" ? " with-text" : ""}"
                      data-tip="Frozen"
                    >
                      ${unsafeHTML(
                        FREEZE_SVG.replace(
                          "<svg",
                          '<svg width="16" height="16"',
                        ),
                      )}
                      ${view === "list" ? "Frozen" : ""}
                    </span>`
                  : ""}
                ${r.alumni && tab !== "pisciners"
                  ? html`<span
                      class="alumni-badge${view === "list" ? " with-text" : ""}"
                      data-tip="${formatAlumniDate(r.alumnized_at)}"
                    >
                      ${unsafeHTML(
                        GRADUATION_CAP_SVG.replace(
                          "<svg",
                          '<svg width="16" height="16"',
                        ),
                      )}
                      ${view === "list" ? formatShortDate(r.alumnized_at) : ""}
                    </span>`
                  : ""}
              </div>
              <div class="login">${r.login}</div>
            </div>
            <div class="row-meta">
              ${tab !== "new" &&
              !hidePiscineLevel &&
              typeof r.level === "number"
                ? html`<span
                    class="level-badge"
                    data-tip="Level in ${tab === "pisciners"
                      ? "piscine"
                      : "42 cursus"}"
                  >
                    ${formatLevel(r.level)}
                  </span>`
                : ""}
              ${tab !== "pisciners" && formatPool(r)
                ? html`<span
                    class="pool-badge"
                    data-tip="Pool in ${formatPoolFull(r)}"
                  >
                    ${unsafeHTML(
                      POOL_SVG.replace("<svg", '<svg width="14" height="14"'),
                    )}
                    ${view === "list" ? formatPoolFull(r) : formatPool(r)}
                  </span>`
                : ""}
              ${tab !== "pisciners" && formatMonthYear(r.begin_at)
                ? html`<span
                    class="date-badge"
                    data-tip="Entry on ${formatShortDate(r.begin_at)}"
                  >
                    ${unsafeHTML(
                      ENTRY_DATE_SVG.replace(
                        "<svg",
                        '<svg width="14" height="14"',
                      ),
                    )}
                    ${view === "list"
                      ? formatShortDate(r.begin_at)
                      : formatMonthYear(r.begin_at)}
                  </span>`
                : ""}
            </div>
          </div>`,
      )}
    </div>
  `;
  return html`
    <style>
      :host {
        display: block;
      }
      ${sharedCSS} .row {
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
        padding: 0.6rem;
        border: 1px solid var(--color-base-300);
        border-radius: 0.75rem;
      }
      .grid .row:hover {
        border-color: var(--color-primary);
      }
      .list .row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1rem;
      }
      .avatar {
        width: 2.75rem;
        height: 2.75rem;
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
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--color-base-content);
      }
      .displayname-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .grid .displayname {
        justify-content: center;
      }
      .blackhole-badge,
      .freeze-badge,
      .alumni-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 9999px;
        padding: 0.3rem;
        line-height: 0;
      }
      .blackhole-badge {
        color: var(--color-error-content);
        background: var(--color-error);
      }
      .blackhole-badge.with-text,
      .freeze-badge.with-text,
      .alumni-badge.with-text {
        gap: 0.3rem;
        height: 1.6rem;
        padding: 0 0.5rem;
        line-height: normal;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .freeze-badge {
        color: var(--color-info-content);
        background: var(--color-info);
      }
      .alumni-badge {
        color: var(--color-secondary-content);
        background: var(--color-secondary);
      }
      .blackhole-badge svg,
      .freeze-badge svg,
      .alumni-badge svg {
        fill: currentColor;
      }
      .row.inactive {
        opacity: 0.45;
      }
      .login {
        font-size: 0.8rem;
        opacity: 0.5;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-shrink: 0;
      }
      .grid .row-meta {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        text-align: center;
        width: 100%;
      }
      .grid .row-meta .pool-badge,
      .grid .row-meta .date-badge,
      .grid .row-meta .level-badge {
        font-size: 0.7rem;
        height: 1.5rem;
        padding: 0 0.4rem;
      }
      .list .row-meta {
        margin-left: auto;
      }
      .pool-badge,
      .date-badge,
      .level-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        height: 1.8rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-base-content);
        background: var(--color-base-200);
        border-radius: var(--radius-field);
        padding: 0 0.6rem;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .pool-badge {
        color: var(--color-info-content);
        background: color-mix(in oklch, var(--color-info) 60%, transparent);
      }
      .date-badge {
        background: color-mix(in oklch, var(--color-accent) 40%, transparent);
      }
      .level-badge {
        color: var(--color-primary-content);
        background: color-mix(in oklch, var(--color-primary) 45%, transparent);
      }
      .pool-badge svg,
      .date-badge svg,
      .level-badge svg {
        fill: currentColor;
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
      .updated-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 700;
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-field);
        background: var(--color-accent);
        color: var(--color-accent-content);
        white-space: nowrap;
        flex-shrink: 0;
        cursor: default;
      }
      .students-filter-menu {
        border: 1px solid
          color-mix(in oklch, var(--color-base-content) 30%, transparent);
      }
      .students-filter-menu__label {
        padding: 0.25rem 0.5rem 0;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.6;
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
              @click="${() => handlers.onSwitchTab("students")}"
            >
              Students
            </button>
            <button
              class="tab-btn ${tab === "new" ? "active" : ""}"
              @click="${() => handlers.onSwitchTab("new")}"
            >
              Future students
            </button>
            <button
              class="tab-btn ${tab === "pisciners" ? "active" : ""}"
              @click="${() => handlers.onSwitchTab("pisciners")}"
            >
              Pisciners
            </button>
          </div>
          ${ago
            ? html`<span class="updated-badge"
                >Updated ${ago === "now" ? ago : ago + " ago"}</span
              >`
            : ""}
          <button
            class="btn btn-circle btn-ghost btn-sm text-xl ml-auto"
            @click="${handlers.onClose}"
          >
            ✕
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 px-3 pb-3">
          <input
            class="input input-sm w-64"
            type="search"
            placeholder="Search..."
            .value="${query}"
            @input="${(e: Event) =>
              handlers.onSearchInput((e.target as HTMLInputElement).value)}"
          />
          ${tab === "students"
            ? html`<div class="indicator">
                  ${hasActiveFilters
                    ? html`<span
                        class="indicator-item badge badge-xs ${filter ===
                        "blackhole"
                          ? "badge-error"
                          : filter === "alumni"
                            ? "badge-secondary"
                            : filter === "freeze"
                              ? "badge-info"
                              : "badge-error"}"
                        style="border-radius:var(--radius-field)"
                      ></span>`
                    : ""}
                  <details class="dropdown dropdown-end">
                    <summary
                      class="btn btn-sm btn-square list-none ${hasActiveFilters
                        ? "btn-accent"
                        : "btn-outline btn-accent"}"
                      data-tip="Filters"
                    >
                      ${unsafeHTML(
                        FILTER_SVG.replace(
                          "<svg",
                          '<svg width="16" height="16"',
                        ),
                      )}
                    </summary>
                    ${renderFilterMenu(state, handlers)}
                  </details>
                </div>
                ${hasActiveFilters
                  ? html`<button
                      class="btn btn-sm btn-outline"
                      data-tip="Clear filters"
                      @click="${handlers.onClearFilters}"
                    >
                      ${unsafeHTML(
                        FILTER_CLEAR_SVG.replace(
                          "<svg",
                          '<svg width="16" height="16"',
                        ),
                      )}
                      Clear filters
                    </button>`
                  : ""}
                <div class="mx-0.5 h-6 w-px bg-base-content/20"></div>`
            : ""}
          <span
            class="badge badge-sm badge-accent h-8 flex-shrink-0 font-bold"
            style="white-space:nowrap;border-radius:var(--radius-field)"
            data-tip="${cursusLabel} — ${dateLabel}"
            >${intakeFiltered.length} ${countLabel}</span
          >
          ${tab === "students"
            ? html`<span
                class="badge badge-sm badge-success h-8 flex-shrink-0 font-bold"
                style="white-space:nowrap;border-radius:var(--radius-field)"
                data-tip="Active students"
                >${activeCount} active students</span
              >`
            : ""}
          <div class="ml-auto flex items-center gap-2">
            ${tab === "pisciners"
              ? html`
                  <select
                    class="select select-sm w-32"
                    @change="${(e: Event) =>
                      handlers.onPiscineMonth(
                        Number((e.target as HTMLSelectElement).value),
                      )}"
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
                    @change="${(e: Event) =>
                      handlers.onPiscineYear(
                        Number((e.target as HTMLSelectElement).value),
                      )}"
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
                  <div class="h-6 w-px bg-base-content/20 mx-0.5"></div>
                `
              : ""}
            <div class="join">
              <button
                class="btn btn-sm join-item ${view === "grid"
                  ? "btn-primary"
                  : "btn-outline border-base-content/20"}"
                data-tip="Grid view"
                @click="${() => handlers.onSetView("grid")}"
              >
                ${unsafeHTML(
                  GRID_SVG.replace("<svg", '<svg width="16" height="16"'),
                )}
              </button>
              <button
                class="btn btn-sm join-item ${view === "list"
                  ? "btn-primary"
                  : "btn-outline border-base-content/20"}"
                data-tip="List view"
                @click="${() => handlers.onSetView("list")}"
              >
                ${unsafeHTML(
                  LIST_SVG.replace("<svg", '<svg width="16" height="16"'),
                )}
              </button>
            </div>
            <div class="join">
              <button
                class="btn btn-sm join-item ${sortField === "name"
                  ? "btn-primary"
                  : "btn-outline border-base-content/20"}"
                data-tip="${nameDir === "asc"
                  ? "Name A → Z (click to invert)"
                  : "Name Z → A (click to invert)"}"
                @click="${() => handlers.onSetSort("name")}"
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
                    class="btn btn-sm join-item ${sortField === "date"
                      ? "btn-primary"
                      : "btn-outline border-base-content/20"}"
                    data-tip="${dateDir === "desc"
                      ? "Date (newest first)"
                      : "Date (oldest first)"}"
                    @click="${() => handlers.onSetSort("date")}"
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
      </div>
      <div class="scroll-area flex-1 min-h-0 overflow-y-auto p-3">
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
              : html`${tab === "new"
                  ? html`<div class="flex flex-col gap-5">
                      ${intakes.map((i) => {
                        const rows = windowed.filter((e) => {
                          const intake = beginAtIntake(e.begin_at);
                          return (
                            intake &&
                            intake.month === i.month &&
                            intake.year === i.year
                          );
                        });
                        if (rows.length === 0) return html``;
                        return html`<div>
                          <div class="flex items-center gap-2 mb-2 px-1">
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
                  : renderRows(windowed)}
                ${hasMore
                  ? html`<div class="sentinel" aria-hidden="true"></div>`
                  : ""}`}
      </div>
    </div>
  `;
}
