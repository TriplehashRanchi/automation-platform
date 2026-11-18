"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FilterSelect } from "@/components/filter-select";
import { DateRangeSelect } from "@/components/date-range-select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { contactsById, useStore } from "@/lib/store";
import { RunFilters, filterRuns } from "@/lib/stats";
import { fmt, rangeFromParams, rangeToParams } from "@/lib/time";
import { useSetParams } from "@/lib/url-state";
import { downloadText, runsToCsv } from "@/lib/csv";
import { CATEGORIES, Category, Status, TOOL_NAMES } from "@/mock/types";
import { STEP_ORDER } from "@/mock/seed";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const EMPTY: Set<string> = new Set();
const STATUSES: Status[] = ["sent", "failed", "scheduled", "skipped", "expired"];
const STEP_LABELS: Record<string, string> = {
  confirm: "Confirmation WhatsApp",
  row: "Add row to Google Sheet",
  group: "Add to MailerLite group",
  r24: "24-hour reminder",
  r1: "1-hour reminder",
  r10: "10-minute reminder",
  replay: "Replay / follow-up message",
};

export function RunsView() {
  const sp = useSearchParams();
  const setParams = useSetParams();
  const runs = useStore((s) => s.runs);
  const funnels = useStore((s) => s.funnels);
  const steps = useStore((s) => s.steps);
  const retrying = useStore((s) => s.retrying);
  const retry = useStore((s) => s.retry);

  const filters: RunFilters = {
    funnel: sp.get("funnel") ?? undefined,
    status: (sp.get("status") as Status | null) ?? undefined,
    step: sp.get("step") ?? undefined,
    category: (sp.get("category") as Category | null) ?? undefined,
    q: sp.get("q") ?? undefined,
    range: rangeFromParams(sp),
  };
  const filterKey = sp.toString().replace(/(^|&)run=[^&]*/g, "");

  // search box: local state, debounced into the URL
  const [q, setQ] = useState(filters.q ?? "");
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => setParams({ q: q || null }), 250);
    return () => clearTimeout(t);
  }, [q, sp, setParams]);

  const filtered = useMemo(
    () => filterRuns(runs, filters, contactsById).sort((a, b) => b.plannedAt - a.plannedAt || (a.id < b.id ? 1 : -1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runs, filterKey],
  );
  const failedInView = useMemo(
    () => filterRuns(runs, filters, contactsById, { ignoreStatus: true }).filter((r) => r.status === "failed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runs, filterKey],
  );

  // page + selection are scoped to the current filters (they reset when filters change)
  const [pg, setPg] = useState({ key: filterKey, page: 0 });
  const page = pg.key === filterKey ? pg.page : 0;
  const setPage = (fn: (p: number) => number) => setPg({ key: filterKey, page: fn(page) });
  const [sel, setSel] = useState<{ key: string; ids: Set<string> }>({ key: filterKey, ids: new Set() });
  const selected = sel.key === filterKey ? sel.ids : EMPTY;
  const setSelected = (fn: Set<string> | ((prev: Set<string>) => Set<string>)) =>
    setSel({ key: filterKey, ids: typeof fn === "function" ? fn(selected) : fn });
  const [confirm, setConfirm] = useState<null | "all">(null);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectableOnPage = pageRows.filter((r) => r.status === "failed" && !retrying[r.id]);
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((r) => selected.has(r.id));
  const selectedFailed = [...selected].filter((id) => runs.find((r) => r.id === id)?.status === "failed");
  const anyBusy = Object.keys(retrying).length > 0;

  const hasFilters = !!(filters.funnel || filters.status || filters.step || filters.category || filters.q || sp.get("range") || sp.get("from") || sp.get("to"));

  async function doRetry(ids: string[]) {
    setSelected(new Set());
    const n = await retry(ids);
    if (n > 0) toast.success(`${n} step${n === 1 ? "" : "s"} retried — now sent`);
  }

  return (
    <>
      <PageHeader
        title="Run logs"
        description="Every automation step that ran (or is scheduled to run) for every contact."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                downloadText("flowpilot-run-logs.csv", runsToCsv(filtered, { contacts: contactsById, funnels, steps }));
                toast.success(`Exported ${filtered.length} rows`);
              }}
              disabled={filtered.length === 0}
            >
              <Download /> Export CSV
            </Button>
            <Button variant="outline" disabled={selectedFailed.length === 0 || anyBusy} onClick={() => doRetry(selectedFailed)}>
              <RotateCw /> Retry selected{selectedFailed.length ? ` (${selectedFailed.length})` : ""}
            </Button>
            <Button disabled={failedInView.length === 0 || anyBusy} onClick={() => setConfirm("all")}>
              {anyBusy ? <Loader2 className="animate-spin" /> : <RotateCw />} Retry all failed
              {failedInView.length ? ` (${failedInView.length})` : ""}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone or email"
            className="h-8 w-60 pl-8"
            aria-label="Search contact"
          />
        </div>
        <FilterSelect
          value={filters.funnel ?? ""}
          onChange={(v) => setParams({ funnel: v })}
          allLabel="All funnels"
          options={funnels.map((f) => ({ value: f.id, label: f.name }))}
          className="min-w-36"
        />
        <FilterSelect
          value={filters.status ?? ""}
          onChange={(v) => setParams({ status: v })}
          allLabel="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        <FilterSelect
          value={filters.step ?? ""}
          onChange={(v) => setParams({ step: v })}
          allLabel="All steps"
          options={STEP_ORDER.map((k) => ({ value: k, label: STEP_LABELS[k] }))}
        />
        <FilterSelect
          value={filters.category ?? ""}
          onChange={(v) => setParams({ category: v })}
          allLabel="All failure categories"
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <DateRangeSelect
          value={filters.range}
          onChange={(r) => {
            const p = new URLSearchParams();
            rangeToParams(r, p);
            setParams({ range: p.get("range"), from: p.get("from") ?? (r.preset === "custom" ? "" : null), to: p.get("to") ?? (r.preset === "custom" ? "" : null) });
          }}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
              setQ("");
              setParams({ funnel: null, status: null, step: null, category: null, q: null, range: null, from: null, to: null });
            }}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length.toLocaleString("en-IN")} run{filtered.length === 1 ? "" : "s"}
          {failedInView.length > 0 && <> · {failedInView.length.toLocaleString("en-IN")} failed</>}
          {selectedFailed.length > 0 && <> · {selectedFailed.length} selected</>}
        </span>
        <span>
          Page {page + 1} of {pages}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all failed rows on this page"
                  disabled={selectableOnPage.length === 0}
                  checked={allOnPageSelected}
                  onCheckedChange={(c) =>
                    setSelected((prev) => {
                      const n = new Set(prev);
                      selectableOnPage.forEach((r) => (c ? n.add(r.id) : n.delete(r.id)));
                      return n;
                    })
                  }
                />
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Funnel</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Failure category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No runs match these filters.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((r) => {
              const c = contactsById.get(r.contactId);
              const step = steps.find((s) => s.id === r.stepId);
              const f = funnels.find((x) => x.id === r.funnelId);
              const isRetrying = !!retrying[r.id];
              return (
                <TableRow
                  key={r.id}
                  className={cn("cursor-pointer", r.status === "failed" && "bg-red-50/40")}
                  onClick={() => setParams({ run: r.id })}
                  data-state={selected.has(r.id) ? "selected" : undefined}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select run for ${c?.name}`}
                      disabled={r.status !== "failed" || isRetrying}
                      checked={selected.has(r.id)}
                      onCheckedChange={(ch) =>
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (ch) n.add(r.id);
                          else n.delete(r.id);
                          return n;
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmt(r.plannedAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{c?.name}</div>
                    <div className="text-xs text-muted-foreground">{c?.phone}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{f?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{step?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{step && TOOL_NAMES[step.tool]}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} retrying={isRetrying} />
                    {r.attempts.some((a) => a.result === "sent") && r.attempts.some((a) => a.result === "failed") && (
                      <span className="ml-1.5 text-xs text-muted-foreground">retried</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{r.category ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
          Next <ChevronRight />
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "all"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Retry ${failedInView.length} failed step${failedInView.length === 1 ? "" : "s"}?`}
        description="Every failed step matching the current filters (funnel, step, category, dates, search) will be sent to its tool again."
        confirmLabel={`Retry ${failedInView.length}`}
        onConfirm={() => doRetry(failedInView.map((r) => r.id))}
      />
    </>
  );
}
