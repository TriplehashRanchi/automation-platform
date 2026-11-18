"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { JsonView } from "@/components/json-view";
import { contactsById, registrationsById, useStore } from "@/lib/store";
import { useSetParams } from "@/lib/url-state";
import { fmt } from "@/lib/time";
import { buildSnapshot } from "@/mock/snapshot";
import { TOOL_NAMES } from "@/mock/types";
import { STEP_ORDER } from "@/mock/seed";
import { cn } from "@/lib/utils";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

/** Global drawer, opened by `?run=<id>` on any page. */
export function LogDrawer() {
  const sp = useSearchParams();
  const setParams = useSetParams();
  const runId = sp.get("run");
  const runs = useStore((s) => s.runs);
  const steps = useStore((s) => s.steps);
  const funnels = useStore((s) => s.funnels);
  const retrying = useStore((s) => s.retrying);
  const retry = useStore((s) => s.retry);
  const [tab, setTab] = useState("incoming");

  const run = useMemo(() => (runId ? runs.find((r) => r.id === runId) : undefined), [runs, runId]);
  const siblings = useMemo(
    () =>
      run
        ? runs
            .filter((r) => r.contactId === run.contactId && r.funnelId === run.funnelId)
            .sort((a, b) => STEP_ORDER.indexOf(a.stepKey) - STEP_ORDER.indexOf(b.stepKey))
        : [],
    [runs, run],
  );

  const contact = run ? contactsById.get(run.contactId) : undefined;
  const funnel = run ? funnels.find((f) => f.id === run.funnelId) : undefined;
  const step = run ? steps.find((s) => s.id === run.stepId) : undefined;
  const reg = run ? registrationsById.get(run.registrationId) : undefined;
  const snapshot = useMemo(
    () => (run && contact && funnel && step && reg ? buildSnapshot(run, contact, funnel, step, reg) : null),
    [run, contact, funnel, step, reg],
  );

  const isRetrying = !!(run && retrying[run.id]);
  const open = !!run && !!contact && !!funnel && !!step;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && setParams({ run: null })}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
        {open && run && contact && funnel && step && (
          <>
            <SheetHeader className="border-b pr-10">
              <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
                {step.name}
                <StatusBadge status={run.status} retrying={isRetrying} />
              </SheetTitle>
              <SheetDescription>
                <Link href={`/contacts/${contact.id}`} className="font-medium text-foreground hover:underline">
                  {contact.name}
                </Link>{" "}
                · {contact.phone} · {funnel.name}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              {(run.status === "failed" || isRetrying) && (
                <Button
                  disabled={isRetrying}
                  onClick={async () => {
                    await retry([run.id]);
                    toast.success("Step retried — status is now sent");
                  }}
                >
                  {isRetrying ? <Loader2 className="animate-spin" /> : <RotateCw />}
                  {isRetrying ? "Retrying…" : "Retry this step"}
                </Button>
              )}

              <dl className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <StatusBadge status={run.status} retrying={isRetrying} />
                </Field>
                <Field label="Tool">{TOOL_NAMES[step.tool]}</Field>
                <Field label="Planned time">{fmt(run.plannedAt, true)}</Field>
                <Field label="Actual time">{run.actualAt ? fmt(run.actualAt, true) : "—"}</Field>
                {run.status === "failed" && (
                  <>
                    <Field label="Failure category">{run.category}</Field>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Error returned by {TOOL_NAMES[step.tool]}</dt>
                      <dd className="mt-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs break-words text-red-800">
                        {run.rawError}
                      </dd>
                    </div>
                  </>
                )}
                {(run.status === "skipped" || run.status === "expired") && run.note && (
                  <div className="col-span-2">
                    <Field label="Reason">{run.note}</Field>
                  </div>
                )}
              </dl>

              <section>
                <h3 className="mb-2 text-sm font-semibold">This contact&apos;s steps in {funnel.name}</h3>
                <ul className="divide-y rounded-md border">
                  {siblings.map((s) => {
                    const st = steps.find((x) => x.id === s.stepId);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setParams({ run: s.id })}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60",
                            s.status === "failed" && "bg-red-50/70",
                            s.id === run.id && "ring-2 ring-primary ring-inset",
                          )}
                        >
                          <span className={cn(s.id === run.id && "font-medium")}>{st?.name}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{fmt(s.plannedAt)}</span>
                            <StatusBadge status={s.status} retrying={!!retrying[s.id]} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Attempts</h3>
                {run.attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attempts yet — this step has not run.</p>
                ) : (
                  <ol className="divide-y rounded-md border">
                    {run.attempts.map((a, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">#{i + 1}</span>{" "}
                          <span className="text-xs">{fmt(a.at, true)}</span>
                          {a.error && <p className="mt-0.5 font-mono text-xs text-red-700 break-words">{a.error}</p>}
                        </div>
                        <StatusBadge status={a.result} />
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Snapshot</h3>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="incoming">Incoming data</TabsTrigger>
                    <TabsTrigger value="sent">Sent to tool</TabsTrigger>
                    <TabsTrigger value="response">Tool response</TabsTrigger>
                  </TabsList>
                  <TabsContent value="incoming">
                    <JsonView data={snapshot?.incoming} />
                  </TabsContent>
                  <TabsContent value="sent">
                    <JsonView data={snapshot?.sent} empty="Nothing was sent to the tool yet." />
                  </TabsContent>
                  <TabsContent value="response">
                    <JsonView data={snapshot?.response} empty="No response — the step has not run." />
                  </TabsContent>
                </Tabs>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
