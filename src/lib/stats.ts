import { StepRun, Status, Category, CATEGORIES, Contact } from "@/mock/types";
import { DateRange, DAY, MOCK_NOW, dayKey, rangeBounds, startOfDay } from "./time";

export interface RunFilters {
  funnel?: string;
  status?: Status;
  step?: string; // StepKey
  category?: Category;
  q?: string;
  range: DateRange;
}

export function filterRuns(
  runs: StepRun[],
  f: RunFilters,
  contactsById: Map<string, Contact>,
  opts: { ignoreStatus?: boolean } = {},
) {
  const [from, to] = rangeBounds(f.range);
  const q = f.q?.trim().toLowerCase();
  const qDigits = q?.replace(/\D/g, "");
  return runs.filter((r) => {
    if (r.plannedAt < from || r.plannedAt >= to) return false;
    if (f.funnel && r.funnelId !== f.funnel) return false;
    if (!opts.ignoreStatus && f.status && r.status !== f.status) return false;
    if (f.step && r.stepKey !== f.step) return false;
    if (f.category && r.category !== f.category) return false;
    if (q) {
      const c = contactsById.get(r.contactId);
      if (!c) return false;
      const hay = `${c.name} ${c.email}`.toLowerCase();
      const phone = c.phone.replace(/\D/g, "");
      if (!hay.includes(q) && !(qDigits && phone.includes(qDigits))) return false;
    }
    return true;
  });
}

export function countStatus(runs: StepRun[]) {
  let sent = 0;
  let failed = 0;
  for (const r of runs) {
    if (r.status === "sent") sent++;
    else if (r.status === "failed") failed++;
  }
  return { sent, failed, rate: sent + failed === 0 ? null : (sent / (sent + failed)) * 100 };
}

/** One bar per day for the last 14 days (IST), grouped by planned time. */
export function dailySeries(runs: StepRun[]) {
  const today = startOfDay(MOCK_NOW);
  const days = Array.from({ length: 14 }, (_, i) => today - (13 - i) * DAY);
  const idx = new Map(days.map((d, i) => [dayKey(d), i]));
  const out = days.map((d) => ({ day: d, sent: 0, failed: 0 }));
  for (const r of runs) {
    const i = idx.get(dayKey(r.plannedAt));
    if (i === undefined) continue;
    if (r.status === "sent") out[i].sent++;
    else if (r.status === "failed") out[i].failed++;
  }
  return out;
}

export function failuresByCategory(runs: StepRun[]) {
  const counts = new Map<Category, number>();
  for (const r of runs) if (r.status === "failed" && r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  return CATEGORIES.map((c) => ({ category: c, count: counts.get(c) ?? 0 })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
}

export const pct = (n: number | null) => (n === null ? "–" : `${n.toFixed(1)}%`);
