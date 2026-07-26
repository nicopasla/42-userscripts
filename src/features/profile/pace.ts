import { getMondayWeekStart } from "../logtime/heatmap.ts";

let paceData: Record<string, string> | null = null;
let pacePollAttempts = 0;
let paceInitialized = false;

function getWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const week = Math.ceil(
    ((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000 + 1) /
      7,
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseTimeToMin(timeStr: string): number {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h * 60 + m + Math.round(s / 60);
}

function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseDays(el: SVGTextElement): number {
  const m = el.textContent?.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function applyDaysView(
  titleEl: HTMLElement,
  countText: SVGTextElement,
  totalText: SVGTextElement,
  path: SVGPathElement | null,
  elapsed: number,
  total: number,
  circumference: number,
  timeLeft: boolean,
) {
  if (timeLeft) {
    const remaining = Math.max(0, total - elapsed);
    titleEl.textContent = "Time left";
    countText.textContent = `${remaining} days`;
    totalText.textContent = `Of ${total}`;
    path?.setAttribute(
      "stroke-dashoffset",
      String(circumference * (remaining / total)),
    );
  } else {
    titleEl.textContent = "Elapsed time";
    countText.textContent = `${elapsed} days`;
    totalText.textContent = `On ${total}`;
    path?.setAttribute(
      "stroke-dashoffset",
      String(circumference * (1 - elapsed / total)),
    );
  }
}

function setupDaysToggle(barsContainer: HTMLElement) {
  const row = barsContainer.closest<HTMLElement>(".flex.flex-row.items-center");
  if (!row || row.dataset.ftDaysToggle === "true") return;
  row.dataset.ftDaysToggle = "true";

  const ringSection = row.querySelector<HTMLElement>(".w-2\\/5");
  if (!ringSection) return;

  const svg = ringSection.querySelector("svg");
  const titleEl = ringSection.querySelector("p");
  const texts = svg?.querySelectorAll("text");
  if (!svg || !titleEl || !texts || texts.length < 2) return;

  const countText = texts[0];
  const totalText = texts[1];
  const path = svg.querySelector<SVGPathElement>(".stroke-legacy-main");
  const circumference = parseFloat(
    path?.getAttribute("stroke-dasharray") || "0",
  );
  const originalElapsed = parseDays(countText);
  const totalDays = parseDays(totalText);
  if (!totalDays || !circumference) return;

  let showTimeLeft = false;

  svg.style.cursor = "pointer";
  svg.addEventListener("click", () => {
    showTimeLeft = !showTimeLeft;
    applyDaysView(
      titleEl,
      countText,
      totalText,
      path,
      originalElapsed,
      totalDays,
      circumference,
      showTimeLeft,
    );
  });
}

function updatePaceBars() {
  if (!paceData) return;
  if (pacePollAttempts > 300) return;
  pacePollAttempts++;

  const barsContainer = document.querySelector<HTMLElement>(
    ".flex.flex-wrap-reverse",
  );
  if (!barsContainer) {
    requestAnimationFrame(updatePaceBars);
    return;
  }

  const bars = barsContainer.querySelectorAll<HTMLElement>(".rounded-3xl");
  if (bars.length !== 4) {
    requestAnimationFrame(updatePaceBars);
    return;
  }

  const labelsContainer =
    barsContainer.parentElement?.querySelector<HTMLElement>(".h-8.flex");
  if (!labelsContainer) {
    requestAnimationFrame(updatePaceBars);
    return;
  }

  const labelEls = labelsContainer.querySelectorAll(":scope > div");
  if (labelEls.length !== 4) {
    requestAnimationFrame(updatePaceBars);
    return;
  }

  pacePollAttempts = 0;
  setupDaysToggle(barsContainer);

  const currentMonday = getMondayWeekStart(new Date());

  const weeks: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getWeekKey(d));
  }

  const weekTotals: Record<string, number> = {};
  for (const [dateStr, timeStr] of Object.entries(paceData)) {
    const date = new Date(dateStr + "T00:00:00");
    const wk = getWeekKey(date);
    weekTotals[wk] = (weekTotals[wk] || 0) + parseTimeToMin(timeStr);
  }

  const maxY = 60;
  const weekMins: number[] = [];
  const mainColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--legacy-main")
      .trim() || "hsl(180, 100%, 37%)";
  for (let i = 0; i < 4; i++) {
    const totalMin = weekTotals[weeks[i]] || 0;
    weekMins.push(totalMin);
    const percent = Math.min((totalMin / 60 / maxY) * 100, 100);
    bars[i].style.height = `${percent}%`;
    bars[i].style.backgroundColor = mainColor;
    bars[i].classList.add("bg-legacy-main");
    labelEls[i].textContent =
      i === 3 ? "This week" : weeks[i].replace(/^\d+-/, "");
  }

  const tipTexts = weekMins.map((m) => formatDuration(m).toUpperCase());
  for (let i = 0; i < 4; i++) {
    if (bars[i].dataset.ftPaceListener === "true") continue;
    bars[i].dataset.ftPaceListener = "true";
    let pollId: number | undefined;
    bars[i].addEventListener("mouseenter", () => {
      let attempts = 0;
      const poll = () => {
        attempts++;
        const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
        if (!tip) {
          if (attempts < 50) pollId = requestAnimationFrame(poll);
          return;
        }
        const outer = tip.closest<HTMLElement>('[class*="z-50"]');
        if (!outer) {
          if (attempts < 50) pollId = requestAnimationFrame(poll);
          return;
        }
        if (outer.textContent?.trim() === tipTexts[i]) return;
        outer.childNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) n.textContent = ` ${tipTexts[i]} `;
        });
        tip.textContent = tipTexts[i];
      };
      poll();
    });
    bars[i].addEventListener("mouseleave", () => {
      if (pollId) cancelAnimationFrame(pollId);
    });
  }
}

export function initPace() {
  if (paceInitialized) return;
  if (location.hostname !== "profile-v3.intra.42.fr") return;
  if (location.pathname !== "/" && !location.pathname.startsWith("/users/"))
    return;
  paceInitialized = true;

  document.addEventListener("42_LOGTIME_DATA", (event: Event) => {
    const detail = (event as CustomEvent<Record<string, string>>).detail;
    if (!detail) return;
    paceData = detail;
    updatePaceBars();
  });

  if (paceData) updatePaceBars();
}
