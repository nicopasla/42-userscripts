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
import FORTY_TWO_SVG from "../../../assets/svg/42_Logo.svg?raw";
import {
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
  nextIntakes,
  piscineMonthName,
  poolIntakes,
  poolMonthName,
  poolYearOptions,
} from "./data.ts";
import type {
  FilterKey,
  PiscineEntry,
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
  piscineList: PiscineEntry[];
  piscineListLoading: boolean;
  selectedPiscine: { year: number; month: number; cursus: number } | null;
  entries: StudentEntry[];
  loading: boolean;
  lastFetched: number;
  query: string;
  authError: boolean;
  visibleCount: number;
  currentYear: number;
  copiedLogin: string | null;
}

export interface StudentsTemplateHandlers {
  onSwitchTab: (tab: StudentsTab) => void;
  onSetView: (view: StudentsView) => void;
  onSetSort: (field: SortField) => void;
  onToggleFilter: (key: FilterKey) => void;
  onClose: () => void;
  onSearchInput: (value: string) => void;
  onSelectPiscine: (year: number, month: number, cursus: number) => void;
  onBackToPiscines: () => void;
  onPoolIntake: (value: number) => void;
  onPoolYear: (value: number) => void;
  onClearFilters: () => void;
  onCopyLogin: (login: string) => void;
  onConnect: () => void;
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
  poolEntries: StudentEntry[],
): TemplateResult {
  const { filter, poolIntake, poolYear, tab } = state;
  const poolYears = poolYearOptions(poolEntries, state.currentYear);
  const intakes = poolIntakes(poolEntries, state.currentYear);

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
      ${tab === "students"
        ? html`<span class="students-filter-menu__label">Status</span>
            ${STATUS_FILTERS.map(
              (f) => html`
                <button
                  class="btn btn-md justify-start ${f.color} ${filter !==
                    "none" && filter !== f.key
                    ? "opacity-40"
                    : ""}"
                  @click="${() => handlers.onToggleFilter(f.key)}"
                >
                  ${unsafeHTML(
                    f.icon.replace("<svg", '<svg width="16" height="16"'),
                  )}
                  ${f.label}
                  ${filter === f.key
                    ? html`<span class="ml-auto"
                        >${unsafeHTML(
                          CHECK_SVG.replace(
                            "<svg",
                            '<svg width="14" height="14"',
                          ),
                        )}</span
                      >`
                    : ""}
                </button>
              `,
            )}`
        : ""}
    </div>
  `;
}

function renderConnectBanner(onConnect: () => void): TemplateResult {
  return html`
    <div class="flex flex-col items-center gap-4 py-12 px-6 text-center">
      <p class="text-base-content/60">
        Students data requires a connected 42 account
      </p>
      <button
        type="button"
        class="btn bg-[#00babc] text-white border-none hover:bg-[#1fd2d4] flex items-center justify-center gap-3"
        style="height:3rem; min-width:15rem; font-size:1rem;"
        @click="${onConnect}"
      >
        <span class="font-bold tracking-wide">Connect with</span>
        <span
          class="size-8 flex items-center justify-center [&_polygon]:fill-current"
        >
          ${unsafeHTML(FORTY_TWO_SVG)}
        </span>
      </button>
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
    piscineList,
    piscineListLoading,
    selectedPiscine,
    poolIntake,
    poolYear,
    entries,
    loading,
    lastFetched,
    query,
    authError,
    visibleCount,
    currentYear,
    copiedLogin,
  } = state;

  const hasActiveFilters =
    filter !== "none" || poolIntake != null || poolYear != null;
  const showPoolFilter = tab === "students" || tab === "new";
  const showRosterControls = tab !== "pisciners" || selectedPiscine != null;
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
    if (poolIntake != null) {
      if (
        e.pool_year !== String(poolIntake.year) ||
        e.pool_month?.toLowerCase() !== poolMonthName(poolIntake.month)
      )
        return false;
    } else if (poolYear != null && e.pool_year !== String(poolYear)) {
      return false;
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
            const ta = a.alumnized_at ? new Date(a.alumnized_at).getTime() : 0;
            const tb = b.alumnized_at ? new Date(b.alumnized_at).getTime() : 0;
            return tb - ta;
          })
        : filtered;
  const windowed = display.slice(0, visibleCount);
  const hasMore = display.length > windowed.length;
  const showPiscineGrid = tab === "pisciners" && selectedPiscine == null;
  const piscineListFiltered = showPiscineGrid
    ? piscineList.filter((p) => {
        if (!q) return true;
        return normalize(
          `${piscineMonthName(p.month)} ${p.year}`,
        ).includes(q);
      })
    : [];
  const cursusLabel =
    tab === "pisciners"
      ? "Piscine Brussels"
      : tab === "new"
        ? "Future students"
        : "42 Cursus";
  const countLabel =
    tab === "pisciners"
      ? selectedPiscine
        ? "pisciners"
        : "piscines"
      : tab === "new"
        ? "future students"
        : "students";
  const countValue = showPiscineGrid
    ? piscineListFiltered.length
    : intakeFiltered.length;
  const dateLabel =
    tab === "pisciners"
      ? selectedPiscine
        ? `${piscineMonthName(selectedPiscine.month)} ${selectedPiscine.year}`
        : "all piscines"
      : tab === "new"
        ? intakes.map((i) => i.label).join(" · ")
        : "all students";
  const renderRows = (rows: StudentEntry[]) => html`
    <div class="${view}">
      ${rows.map(
        (r) =>
          html`<div
            class="row ${tab === "students" && r.active === false
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
              <div
                class="login ${r.login === copiedLogin ? "copied" : ""}"
                data-tip="Copy login"
                @click="${(e: Event) => {
                  e.stopPropagation();
                  handlers.onCopyLogin(r.login);
                }}"
              >
                ${r.login === copiedLogin ? "Copied ✓" : r.login}
              </div>
            </div>
            <div class="row-meta">
              ${tab !== "new" && typeof r.level === "number"
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
        cursor: copy;
        border-radius: 0.25rem;
        display: inline-block;
        max-width: 100%;
        vertical-align: bottom;
      }
      .login:hover {
        opacity: 1;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .login.copied {
        color: var(--color-success);
        font-weight: 700;
        opacity: 1;
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
      .grid .piscine-card {
        padding: 0.9rem 0.5rem;
        gap: 0.15rem;
      }
      .piscine-card__month {
        font-size: 0.9rem;
        font-weight: 700;
      }
      .piscine-card__year {
        font-size: 0.8rem;
        opacity: 0.6;
      }
      .piscine-card__count {
        margin-top: 0.25rem;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
        color: var(--color-accent-content);
        background: color-mix(in oklch, var(--color-accent) 40%, transparent);
        border-radius: var(--radius-field);
        padding: 0.1rem 0.5rem;
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
          ${showPoolFilter
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
                    ${renderFilterMenu(
                      state,
                      handlers,
                      tab === "new" ? intakeFiltered : entries,
                    )}
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
                      Clear
                    </button>`
                  : ""}
                <div class="mx-0.5 h-6 w-px bg-base-content/20"></div>`
            : ""}
          <span
            class="badge badge-sm badge-accent h-8 flex-shrink-0 font-bold"
            style="white-space:nowrap;border-radius:var(--radius-field)"
            data-tip="${cursusLabel} — ${dateLabel}"
            >${countValue} ${countLabel}</span
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
            ${tab === "pisciners" && selectedPiscine
              ? html`
                  <button
                    class="btn btn-sm btn-outline"
                    @click="${handlers.onBackToPiscines}"
                  >
                    ← Piscines
                  </button>
                  <div class="h-6 w-px bg-base-content/20 mx-0.5"></div>
                `
              : ""}
            ${showRosterControls
              ? html`<div class="join">
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
            `
              : ""}
            ${showRosterControls
              ? html`<div class="join">
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
            `
              : ""}
          </div>
        </div>
      </div>
      <div class="scroll-area flex-1 min-h-0 overflow-y-auto p-3">
        ${showPiscineGrid
          ? piscineListLoading
            ? html`<div class="flex items-center justify-center p-8">
                <span class="loading loading-spinner loading-lg"></span>
              </div>`
            : authError
              ? renderConnectBanner(handlers.onConnect)
              : piscineListFiltered.length === 0
                ? html`<div class="text-center p-6 text-base-content/50">
                    ${piscineList.length === 0
                      ? "No piscine data"
                      : "No results"}
                  </div>`
                : html`<div class="grid">
                    ${piscineListFiltered.map((p) => html`<div
                      class="row piscine-card"
                      @click="${() =>
                        handlers.onSelectPiscine(p.year, p.month, p.cursus)}"
                    >
                      <span class="piscine-card__month"
                        >${piscineMonthName(p.month)}</span
                      >
                      <span class="piscine-card__year">${p.year}</span>
                      <span class="piscine-card__count"
                        >${p.count}
                        ${p.count === 1 ? "pisciner" : "pisciners"}</span
                      >
                    </div>`)}
                  </div>`
          : loading
            ? html`<div class="flex items-center justify-center p-8">
                <span class="loading loading-spinner loading-lg"></span>
              </div>`
            : authError
              ? renderConnectBanner(handlers.onConnect)
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
