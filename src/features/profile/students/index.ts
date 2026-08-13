import { render } from "lit-html";
import { getConfig } from "../../../config.ts";
import { clearAuthFailed, loginWith42 } from "../../account/account.ts";
import {
  TOOLTIP_SHOW_DELAY,
  hideFloatingTooltip,
  showFloatingTooltip,
} from "../../../utils/tooltip.ts";
import { getEffectiveTheme } from "../theme/theme-manager.ts";
import {
  INITIAL_VISIBLE_COUNT,
  WINDOW_STEP,
  fetchPiscines,
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
  PiscineEntry,
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
  let selectedPiscine: { year: number; month: number; cursus: number } | null =
    null;

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

  let entries: StudentEntry[] = [];
  let piscineList: PiscineEntry[] = [];
  let piscineListLoading = false;
  let piscineListLoaded = false;
  let loading = true;
  let lastFetched = 0;
  let query = "";
  let authError = false;
  let visibleCount = INITIAL_VISIBLE_COUNT;
  let searchTimeout: number | null = null;
  let copiedLogin: string | null = null;
  let copiedLoginTimeout: number | null = null;
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
    if (tooltipShowTimer !== null) window.clearTimeout(tooltipShowTimer);
    if (sentinelObserver) {
      sentinelObserver.disconnect();
      sentinelObserver = null;
    }
    if (searchTimeout !== null) window.clearTimeout(searchTimeout);
    if (copiedLoginTimeout !== null) window.clearTimeout(copiedLoginTimeout);
    dialog.close();
    dialog.remove();
  };

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  let tooltipShowTimer: number | null = null;

  shadow.addEventListener("mouseover", (e) => {
    const tipTarget = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-tip]",
    );
    if (!tipTarget?.dataset.tip) return;
    const tipText = tipTarget.dataset.tip;
    if (tooltipShowTimer !== null) window.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = window.setTimeout(() => {
      tooltipShowTimer = null;
      showFloatingTooltip(tipTarget, tipText, isLight, dialog);
    }, TOOLTIP_SHOW_DELAY);
  });
  shadow.addEventListener("mouseout", (e) => {
    if ((e.target as HTMLElement).closest("[data-tip]")) {
      if (tooltipShowTimer !== null) {
        window.clearTimeout(tooltipShowTimer);
        tooltipShowTimer = null;
      }
      hideFloatingTooltip();
    }
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
    if (tab === "pisciners" && selectedPiscine) {
      res = await fetchPisciners(
        selectedPiscine.year,
        selectedPiscine.month,
        selectedPiscine.cursus,
      );
    } else if (tab === "pisciners") {
      res = null;
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

  const loadPiscineList = async () => {
    if (piscineListLoaded) {
      rerender();
      return;
    }
    piscineListLoading = true;
    rerender();
    const res = await fetchPiscines();
    if (res?.unauthorized) {
      piscineList = [];
      authError = true;
    } else if (res?.data) {
      piscineList = res.data.data || [];
    } else {
      piscineList = [];
    }
    piscineListLoading = false;
    piscineListLoaded = true;
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
    if (tab === "pisciners") {
      selectedPiscine = null;
      rerender();
      await loadPiscineList();
      return;
    }
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
    onSelectPiscine: (year, month, cursus) => {
      selectedPiscine = { year, month, cursus };
      visibleCount = INITIAL_VISIBLE_COUNT;
      void load();
    },
    onBackToPiscines: () => {
      selectedPiscine = null;
      visibleCount = INITIAL_VISIBLE_COUNT;
      rerender();
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
    onCopyLogin: (login) => {
      void navigator.clipboard.writeText(login);
      copiedLogin = login;
      if (copiedLoginTimeout !== null) window.clearTimeout(copiedLoginTimeout);
      copiedLoginTimeout = window.setTimeout(() => {
        copiedLoginTimeout = null;
        copiedLogin = null;
        rerender();
      }, 1500);
      rerender();
    },
    onConnect: () => {
      void loginWith42(async () => {
        await clearAuthFailed();
        window.location.reload();
      });
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
    piscineList,
    piscineListLoading,
    selectedPiscine,
    entries,
    loading,
    lastFetched,
    query,
    authError,
    visibleCount,
    currentYear,
    copiedLogin,
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
