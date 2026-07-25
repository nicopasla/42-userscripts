import { getMondayWeekStart } from "../logtime/heatmap.ts";

let paceData: Record<string, string> | null = null;

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const week = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
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

function updatePaceBars() {
  if (!paceData) return;

  const paceSpan = [...document.querySelectorAll("span")].find(
    (s) => s.textContent?.trim() === "Pace",
  );
  if (!paceSpan) { requestAnimationFrame(updatePaceBars); return; }

  const paceSection = paceSpan.closest<HTMLElement>(".flex.h-full.flex-col");
  if (!paceSection) { requestAnimationFrame(updatePaceBars); return; }

  const barsContainer = paceSection.querySelector<HTMLElement>(".flex.flex-wrap-reverse");
  if (!barsContainer) { requestAnimationFrame(updatePaceBars); return; }

  const bars = barsContainer.querySelectorAll<HTMLElement>(".rounded-3xl");
  if (bars.length !== 4) { requestAnimationFrame(updatePaceBars); return; }

  const labelsContainer = barsContainer.parentElement?.querySelector<HTMLElement>(".h-8.flex");
  if (!labelsContainer) { requestAnimationFrame(updatePaceBars); return; }

  const labelEls = labelsContainer.querySelectorAll(":scope > div");
  if (labelEls.length !== 4) { requestAnimationFrame(updatePaceBars); return; }

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
  const mainColor = getComputedStyle(document.documentElement).getPropertyValue("--legacy-main").trim() || "hsl(180, 100%, 37%)";
  for (let i = 0; i < 4; i++) {
    const totalMin = weekTotals[weeks[i]] || 0;
    weekMins.push(totalMin);
    const percent = Math.min(((totalMin / 60) / maxY) * 100, 100);
    bars[i].style.height = `${percent}%`;
    bars[i].style.backgroundColor = mainColor;
    bars[i].classList.add("bg-legacy-main");
    labelEls[i].textContent = i === 3 ? "This week" : weeks[i].replace(/^\d+-/, "");
  }

  const tipTexts = weekMins.map((m) => formatDuration(m).toUpperCase());
  for (let i = 0; i < 4; i++) {
    let pollId: number | undefined;
    bars[i].addEventListener("mouseenter", () => {
      let attempts = 0;
      const poll = () => {
        attempts++;
        const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
        if (!tip) { if (attempts < 50) pollId = requestAnimationFrame(poll); return; }
        const outer = tip.closest<HTMLElement>('[class*="z-50"]');
        if (!outer) { if (attempts < 50) pollId = requestAnimationFrame(poll); return; }
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
  if (location.hostname !== "profile-v3.intra.42.fr") return;
  if (location.pathname !== "/" && !location.pathname.startsWith("/users/")) return;

  document.addEventListener("42_LOGTIME_DATA", (event: Event) => {
    const detail = (event as CustomEvent<Record<string, string>>).detail;
    if (!detail) return;
    paceData = detail;
    updatePaceBars();
  });

  if (paceData) updatePaceBars();
}
