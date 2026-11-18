"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DateRangeSelect } from "@/components/date-range-select";
import { allRegistrations, useStore } from "@/lib/store";
import { countStatus, dailySeries, failuresByCategory, pct } from "@/lib/stats";
import { DAY, MOCK_NOW, fmtDay, rangeBounds, rangeFromParams, rangeLabel, rangeToParams, startOfDay } from "@/lib/time";
import { useSetParams } from "@/lib/url-state";
import { cn } from "@/lib/utils";

function Kpi({ label, value, href, tone }: { label: string; value: string; href?: string; tone?: "bad" }) {
  const body = (
    <Card className={cn("gap-1 py-4 transition-colors", href && "hover:border-primary/40")}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", tone === "bad" && "text-red-600")}>{value}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function OverviewView() {
  const sp = useSearchParams();
  const setParams = useSetParams();
  const runs = useStore((s) => s.runs);
  const funnels = useStore((s) => s.funnels);
  const range = rangeFromParams(sp);
  const [from, to] = rangeBounds(range);

  const rangeParams = new URLSearchParams();
  rangeToParams(range, rangeParams);
  const rp = rangeParams.toString();
  const withRange = (extra: string) => `/runs?${extra}${rp ? `&${rp}` : ""}`;

  const inRange = useMemo(() => runs.filter((r) => r.plannedAt >= from && r.plannedAt < to), [runs, from, to]);
  const { sent, failed, rate } = countStatus(inRange);
  const registrations = allRegistrations.filter((r) => r.registeredAt >= from && r.registeredAt < to).length;
  const series = useMemo(() => dailySeries(runs).map((d) => ({ ...d, label: fmtDay(d.day) })), [runs]);
  const byCategory = failuresByCategory(inRange);
  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

  const today = startOfDay(MOCK_NOW);
  const todayRuns = useMemo(() => runs.filter((r) => r.plannedAt >= today && r.plannedAt < today + DAY), [runs, today]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Plain counts from your step logs. Everything here links to the underlying runs."
        actions={
          <>
            <DateRangeSelect
              value={range}
              onChange={(r) => {
                const p = new URLSearchParams();
                rangeToParams(r, p);
                setParams({ range: p.get("range"), from: r.preset === "custom" ? (r.from ?? "") : null, to: r.preset === "custom" ? (r.to ?? "") : null });
              }}
              presets={["today", "yesterday", "7d", "14d", "custom"]}
            />
            <Button asChild>
              <Link href="/funnels/new">
                <Plus /> New funnel
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Registrations" value={registrations.toLocaleString("en-IN")} href="/contacts" />
        <Kpi label="Steps sent" value={sent.toLocaleString("en-IN")} href={withRange("status=sent")} />
        <Kpi label="Steps failed" value={failed.toLocaleString("en-IN")} href={withRange("status=failed")} tone={failed > 0 ? "bad" : undefined} />
        <Kpi label="Success rate" value={pct(rate)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {rangeLabel(range)} · success rate = sent ÷ (sent + failed). Steps are counted on the day they were due.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Sent vs failed per day · last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ left: -16, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={1} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sent" name="Sent" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="#dc2626" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Failed steps by category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No failed steps in this range.</p>
            ) : (
              <ul className="space-y-1">
                {byCategory.map((c) => (
                  <li key={c.category}>
                    <Link
                      href={withRange(`status=failed&category=${encodeURIComponent(c.category)}`)}
                      className="group block rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span className="flex items-center gap-1.5 tabular-nums">
                          {c.count}
                          <ArrowRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Funnels · today</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y">
            {funnels.map((f) => {
              const c = countStatus(todayRuns.filter((r) => r.funnelId === f.id));
              return (
                <Link key={f.id} href={`/funnels/${f.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.schedule}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm tabular-nums">
                    <span>
                      <span className="font-semibold text-emerald-700">{c.sent}</span> sent
                    </span>
                    <span>
                      <span className={cn("font-semibold", c.failed > 0 ? "text-red-600" : "text-muted-foreground")}>{c.failed}</span> failed
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        f.status === "live" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
                      )}
                    >
                      {f.status === "live" ? "Live" : "Paused"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
