import { getConfig } from "../../../config.ts";
import { hashLogin } from "../../../utils/crypto.ts";

const WORKER_URL = "https://api.betterintra.com";

export const INITIAL_VISIBLE_COUNT = 60;
export const WINDOW_STEP = 90;

export type SortField = "name" | "date";
export type SortDir = "asc" | "desc";
export type StudentsTab = "students" | "pisciners" | "new";
export type StudentsView = "grid" | "list";
export type StudentsFilter = "none" | "blackhole" | "alumni" | "freeze";
export type FilterKey = "blackhole" | "alumni" | "freeze";

export interface StudentEntry {
  login: string;
  displayname: string;
  image_url: string;
  begin_at?: string | null;
  blackholed_at?: string | null;
  active?: boolean;
  alumni?: boolean;
  pool_month?: string | null;
  pool_year?: string | null;
  alumnized_at?: string;
}

export interface StudentsResponse {
  cached_at?: number;
  data?: StudentEntry[];
}

export interface Intake {
  month: number;
  year: number;
  label: string;
}

const monthLabel = (value: number) =>
  new Date(Date.UTC(2000, value - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
  });

export const PISCINE_MONTHS = [
  { value: 2, label: "February", color: "#ff6b6b" },
  { value: 3, label: "March", color: "#f06595" },
  { value: 7, label: "July", color: "#ffd43b" },
  { value: 8, label: "August", color: "#da77f2" },
];

export type PiscineMonth = (typeof PISCINE_MONTHS)[number];

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => monthLabel(i + 1));

const monthNumber = (name?: string | null): number | null => {
  if (!name) return null;
  const idx = MONTH_LABELS.findIndex(
    (l) => l.toLowerCase() === name.toLowerCase(),
  );
  return idx === -1 ? null : idx + 1;
};

export function poolMonthName(value: number): string {
  return MONTH_LABELS[value - 1]?.toLowerCase() ?? "";
}

export interface PoolIntake {
  month: number;
  year: number;
  label: string;
}

export function poolIntakes(
  entries: StudentEntry[],
  currentYear: number,
): PoolIntake[] {
  const seen = new Set<string>();
  const list: PoolIntake[] = [];
  for (const e of entries) {
    const y = Number(e.pool_year);
    const m = monthNumber(e.pool_month);
    if (!Number.isInteger(y) || y <= 0 || y > currentYear || m == null)
      continue;
    const key = `${m}-${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ month: m, year: y, label: `${MONTH_LABELS[m - 1]} ${y}` });
  }
  return list.sort((a, b) => b.year - a.year || b.month - a.month);
}

export function formatTimeAgo(ts: number): string {
  const secs = Date.now() / 1000 - ts;
  if (secs < 3) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.round(mins / 60)}h`;
}

export function formatMonthYear(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getFullYear(),
  ).slice(-2)}`;
}

export function isBlackholed(e: StudentEntry): boolean {
  return (
    e.active === false &&
    typeof e.blackholed_at === "string" &&
    new Date(e.blackholed_at).getTime() < Date.now()
  );
}

export function formatShortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function formatBlackholeDate(iso?: string | null): string {
  const s = formatShortDate(iso);
  return s ? `Blackholed ${s}` : "";
}

export function formatAlumniDate(iso?: string | null): string {
  const s = formatShortDate(iso);
  return s ? `Alumnized ${s}` : "";
}

export function isFrozen(e: StudentEntry): boolean {
  return (
    e.active === false &&
    typeof e.blackholed_at === "string" &&
    new Date(e.blackholed_at).getTime() >= Date.now()
  );
}

export function formatPool(e: StudentEntry): string {
  if (!e.pool_month || !e.pool_year) return "";
  const d = new Date(Date.parse(`${e.pool_month} 1, 2000`));
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${e.pool_year.slice(-2)}`;
}

export function nextIntakes(now: Date): Intake[] {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const april = month <= 4 ? { month: 4, year } : { month: 4, year: year + 1 };
  const october =
    month <= 10 ? { month: 10, year } : { month: 10, year: year + 1 };
  return [april, october]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((i) => ({
      ...i,
      label: `${MONTH_LABELS[i.month - 1]} ${i.year}`,
    }));
}

export function beginAtIntake(
  beginAt: string | null | undefined,
): Intake | null {
  if (!beginAt) return null;
  const d = new Date(beginAt);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, year: d.getFullYear(), label: "" };
}

export function sortEntries(
  list: StudentEntry[],
  tab: StudentsTab,
  sortField: SortField,
  nameDir: SortDir,
  dateDir: SortDir,
): StudentEntry[] {
  return [...list].sort((a, b) => {
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
}

export function yearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = 2023; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
}

export function poolYearOptions(
  entries: StudentEntry[],
  currentYear: number,
): number[] {
  const years = new Set<number>();
  for (const e of entries) {
    const y = Number(e.pool_year);
    if (Number.isInteger(y) && y > 0 && y <= currentYear) years.add(y);
  }
  const list = [...years].sort((a, b) => a - b);
  return list.length > 0 ? list : yearOptions(currentYear);
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

export async function fetchStudents(): Promise<{
  data?: StudentsResponse;
  unauthorized?: boolean;
} | null> {
  return fetchEndpoint("students", new URLSearchParams());
}

export async function fetchPisciners(
  year: number,
  month: number,
): Promise<{
  data?: StudentsResponse;
  unauthorized?: boolean;
} | null> {
  return fetchEndpoint(
    "pisciners",
    new URLSearchParams({ year: String(year), month: String(month) }),
  );
}
