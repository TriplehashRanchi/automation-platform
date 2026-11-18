// All display + day-grouping is in IST (UTC+5:30), computed manually so
// server and client render identically regardless of machine timezone.
export const IST_OFFSET = 19_800_000;
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** Fixed "now" for the demo: 18 Nov 2026, 12:45 PM IST. */
export const MOCK_NOW = Date.UTC(2026, 10, 18, 7, 15, 0);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(ms: number) {
  const d = new Date(ms + IST_OFFSET);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    day: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    dow: d.getUTCDay(),
  };
}

export function startOfDay(ms: number) {
  return Math.floor((ms + IST_OFFSET) / DAY) * DAY - IST_OFFSET;
}

export function dayOfWeek(ms: number) {
  return parts(ms).dow;
}

export function fmtDay(ms: number) {
  const p = parts(ms);
  return `${p.day} ${MONTHS[p.m]}`;
}

export function fmtTime(ms: number, withSeconds = false) {
  const p = parts(ms);
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  const mm = String(p.min).padStart(2, "0");
  const ss = withSeconds ? `:${String(p.s).padStart(2, "0")}` : "";
  return `${h12}:${mm}${ss} ${p.h >= 12 ? "PM" : "AM"}`;
}

/** "18 Nov, 7:00 PM" */
export function fmt(ms: number, withSeconds = false) {
  return `${fmtDay(ms)}, ${fmtTime(ms, withSeconds)}`;
}

export function dayKey(ms: number) {
  const p = parts(ms);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" as IST midnight. */
export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - IST_OFFSET;
}

export function isoIST(ms: number) {
  const p = parts(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m + 1)}-${pad(p.day)}T${pad(p.h)}:${pad(p.min)}:${pad(p.s)}+05:30`;
}

// ---- date ranges ----
export type Preset = "today" | "yesterday" | "7d" | "14d" | "all" | "custom";
export interface DateRange {
  preset: Preset;
  from?: string; // YYYY-MM-DD (custom)
  to?: string;
}

export const PRESET_LABELS: Record<Preset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  all: "All dates (incl. upcoming)",
  custom: "Custom range",
};

/** Returns [startInclusive, endExclusive) in epoch ms. */
export function rangeBounds(r: DateRange): [number, number] {
  const today = startOfDay(MOCK_NOW);
  switch (r.preset) {
    case "today":
      return [today, today + DAY];
    case "yesterday":
      return [today - DAY, today];
    case "7d":
      return [today - 6 * DAY, today + DAY];
    case "14d":
      return [today - 13 * DAY, today + DAY];
    case "all":
      return [-Infinity, Infinity];
    case "custom": {
      const a = r.from ? parseDayKey(r.from) : -Infinity;
      const b = r.to ? parseDayKey(r.to) + DAY : Infinity;
      return [a, b];
    }
  }
}

export function rangeLabel(r: DateRange) {
  if (r.preset === "custom") return `${r.from ?? "…"} → ${r.to ?? "…"}`;
  return PRESET_LABELS[r.preset];
}

export function rangeToParams(r: DateRange, p: URLSearchParams) {
  p.delete("range");
  p.delete("from");
  p.delete("to");
  if (r.preset === "14d") return; // default
  p.set("range", r.preset);
  if (r.preset === "custom") {
    if (r.from) p.set("from", r.from);
    if (r.to) p.set("to", r.to);
  }
}

export function rangeFromParams(p: URLSearchParams): DateRange {
  const preset = (p.get("range") as Preset | null) ?? "14d";
  if (!(preset in PRESET_LABELS)) return { preset: "14d" };
  if (preset === "custom") return { preset, from: p.get("from") ?? undefined, to: p.get("to") ?? undefined };
  return { preset };
}
