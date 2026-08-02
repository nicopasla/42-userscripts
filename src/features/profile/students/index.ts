import { render } from "lit-html";
import { getConfig } from "../../../config.ts";
import {
  hideFloatingTooltip,
  showFloatingTooltip,
} from "../../../utils/tooltip.ts";
import { getEffectiveTheme } from "../theme/theme-manager.ts";
import {
  INITIAL_VISIBLE_COUNT,
  PISCINE_MONTHS,
  WINDOW_STEP,
  fetchPisciners,
  fetchStudents,
  poolIntakes,
  sortEntries,
} from "./data.ts";
import {
  renderStudentsDialogTemplate,
  StudentsTemplateHandlers,
  StudentsTemplateState,
} from "./template.ts";
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

export async function openStudentsDialog() {
  const campusId = await getConfig("CLUSTERS_CAMPUS");
  if (campusId !== "12") return;

  const now = new Date();
  const currentYear = now.getFullYear();

  const presetKey = (await getConfig("PROFILE_THEME_PRESET")) || "dark";
  const effectiveTheme = await getEffectiveTheme();
  const currentTheme =
    presetKey !== "dark" && presetKey !== "light" ? presetKey : effectiveTheme;
  const isLight = effectiveTheme === "light";

  let tab: StudentsTab = "students";
  let view: StudentsView = "grid";
  let sortField: SortField = "name";
  let nameDir: SortDir = "asc";
  let dateDir: SortDir = "desc";
  let filter: StudentsFilter = "none";
  let poolIntake: { month: number; year: number } | null = null;
  let poolYear: number | null = null;
  let selectedMonth: PiscineMonth = PISCINE_MONTHS[0];
  let selectedYear = currentYear;

  const toggleFilter = (key: FilterKey) => {
    filter = filter === key ? "none" : key;
    visibleCount = INITIAL_VISIBLE_COUNT;
    rerender();
  };

  const savedView = (await chrome.storage.local.get("STUDENTS_VIEW")) as {
    STUDENTS_VIEW?: "grid" | "list";
  };
  if (
    savedView.STUDENTS_VIEW === "grid" ||
    savedView.STUDENTS_VIEW === "list"
  ) {
    view = savedView.STUDENTS_VIEW;
  }

  const setView = (v: StudentsView) => {
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

  const setSort = (field: SortField) => {
    if (sortField === field) {
      if (field === "name") nameDir = nameDir === "asc" ? "desc" : "asc";
      else dateDir = dateDir === "desc" ? "asc" : "desc";
    } else {
      sortField = field;
    }
    persistSort();
    entries = sortEntries(entries, tab, sortField, nameDir, dateDir);
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
  let visibleCount = INITIAL_VISIBLE_COUNT;
  let searchTimeout: number | null = null;
  let sentinelObserver: IntersectionObserver | null = null;

  const dialog = Object.assign(document.createElement("dialog"), {
    id: "students-dialog",
    className: "bg-transparent backdrop:bg-black/60",
  });
  Object.assign(dialog.style, {
    margin: "auto",
    width: "min(900px, calc(100dvw - 2rem))",
    height: "min(800px, calc(100dvh - 2rem))",
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
    hideFloatingTooltip();
    if (sentinelObserver) {
      sentinelObserver.disconnect();
      sentinelObserver = null;
    }
    if (searchTimeout !== null) window.clearTimeout(searchTimeout);
    dialog.close();
    dialog.remove();
  };

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  shadow.addEventListener("mouseover", (e) => {
    const tipTarget = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-tip]",
    );
    if (tipTarget?.dataset.tip) {
      showFloatingTooltip(tipTarget, tipTarget.dataset.tip, isLight, dialog);
    }
  });
  shadow.addEventListener("mouseout", (e) => {
    if ((e.target as HTMLElement).closest("[data-tip]")) hideFloatingTooltip();
  });

  shadow.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("details.dropdown")) return;
    const dd =
      shadow.querySelector<HTMLDetailsElement>("details.dropdown[open]");
    if (dd) dd.open = false;
  });

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
      entries = sortEntries(
        res.data.data || [],
        tab,
        sortField,
        nameDir,
        dateDir,
      );
      lastFetched = res.data.cached_at || 0;
      visibleCount = INITIAL_VISIBLE_COUNT;
    } else {
      entries = [];
      lastFetched = 0;
    }
    loading = false;
    rerender();
  };

  const switchTab = async (t: StudentsTab) => {
    if (tab === t) return;
    tab = t;
    query = "";
    filter = "none";
    poolIntake = null;
    poolYear = null;
    visibleCount = INITIAL_VISIBLE_COUNT;
    rerender();
    await load();
  };

  const handlers: StudentsTemplateHandlers = {
    onSwitchTab: (t) => {
      void switchTab(t);
    },
    onSetView: setView,
    onSetSort: setSort,
    onToggleFilter: toggleFilter,
    onClose: close,
    onSearchInput: (value) => {
      query = value;
      visibleCount = INITIAL_VISIBLE_COUNT;
      if (searchTimeout !== null) window.clearTimeout(searchTimeout);
      searchTimeout = window.setTimeout(() => rerender(), 150);
    },
    onPiscineMonth: (value) => {
      selectedMonth =
        PISCINE_MONTHS.find((m) => m.value === value) || PISCINE_MONTHS[0];
      saveSelection();
      void load();
    },
    onPiscineYear: (year) => {
      selectedYear = year;
      saveSelection();
      void load();
    },
    onPoolIntake: (value) => {
      poolIntake =
        value === 0
          ? null
          : (poolIntakes(entries, currentYear)[value - 1] ?? null);
      poolYear = null;
      visibleCount = INITIAL_VISIBLE_COUNT;
      rerender();
    },
    onPoolYear: (value) => {
      poolYear = value === 0 ? null : value;
      poolIntake = null;
      visibleCount = INITIAL_VISIBLE_COUNT;
      rerender();
    },
    onClearFilters: () => {
      filter = "none";
      poolIntake = null;
      poolYear = null;
      visibleCount = INITIAL_VISIBLE_COUNT;
      rerender();
    },
  };

  const buildState = (): StudentsTemplateState => ({
    currentTheme,
    tab,
    view,
    sortField,
    nameDir,
    dateDir,
    filter,
    poolIntake,
    poolYear,
    selectedMonth,
    selectedYear,
    entries,
    loading,
    lastFetched,
    query,
    authError,
    visibleCount,
    currentYear,
  });

  const rerender = () => {
    render(renderStudentsDialogTemplate(buildState(), handlers), shadow);

    const scrollArea = shadow.querySelector<HTMLElement>(".scroll-area");
    if (scrollArea && !scrollArea.dataset.ftTooltipScroll) {
      scrollArea.dataset.ftTooltipScroll = "1";
      scrollArea.addEventListener("scroll", hideFloatingTooltip, {
        passive: true,
      });
    }

    if (sentinelObserver) {
      sentinelObserver.disconnect();
      sentinelObserver = null;
    }
    const sentinel = shadow.querySelector<HTMLElement>(".sentinel");
    if (sentinel) {
      const root = shadow.querySelector<HTMLElement>(".scroll-area");
      sentinelObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            visibleCount += WINDOW_STEP;
            rerender();
          }
        },
        { root, rootMargin: "400px" },
      );
      sentinelObserver.observe(sentinel);
    }
  };

  rerender();
  document.body.appendChild(dialog);
  dialog.showModal();
  await load();
}
