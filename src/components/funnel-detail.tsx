"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, ListChecks, Network, Pause, Pencil, Play, Plus, Rows3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddStepDialog, Lane } from "@/components/add-step-dialog";
import { FunnelCanvas } from "@/components/funnel-canvas";
import { PageHeader } from "@/components/page-header";
import { FunnelStatus } from "@/components/funnel-status";
import { allRegistrations, registrationsById, useStore } from "@/lib/store";
import { fmt, fmtDay, MOCK_NOW, startOfDay } from "@/lib/time";
import { comingSoon } from "@/lib/toast";
import { StepDef, TOOL_NAMES } from "@/mock/types";
import { cn } from "@/lib/utils";

const SAMPLE = { "{{name}}": "Priya", "{{session_date}}": "21 Nov", "{{session_time}}": "4:30 PM", "{{join_link}}": "https://meet.rahulverma.in/j/abc123", "{{replay_link}}": "https://rahulverma.in/replay" };
function fill(text: string) {
  return Object.entries(SAMPLE).reduce((t, [k, v]) => t.split(k).join(v), text);
}

export function FunnelDetail() {
  const { id } = useParams<{ id: string }>();
  const funnel = useStore((s) => s.funnels.find((f) => f.id === id));
  const allSteps = useStore((s) => s.steps);
  const steps = useMemo(() => allSteps.filter((x) => x.funnelId === id), [allSteps, id]);
  const runs = useStore((s) => s.runs);
  const setStatus = useStore((s) => s.setFunnelStatus);
  const toggleStep = useStore((s) => s.toggleStep);
  const editStep = useStore((s) => s.editStep);
  const removeStep = useStore((s) => s.removeStep);
  const [adding, setAdding] = useState<Lane | null>(null);
  const [lastLane, setLastLane] = useState<Lane>("register");
  const [editing, setEditing] = useState<StepDef | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"list" | "canvas">("canvas");
  const regCount = allRegistrations.filter((r) => r.funnelId === id).length;
  const openEdit = (s: StepDef) => {
    setEditing(s);
    setDraft(s.preview);
  };
  const doToggle = (s: StepDef) => {
    toggleStep(s.id);
    toast.success(s.enabled ? `${s.name} turned off — scheduled runs skipped` : `${s.name} turned on`);
  };

  const funnelRuns = useMemo(() => runs.filter((r) => r.funnelId === id), [runs, id]);
  const perStep = useMemo(() => {
    const m = new Map<string, { sent: number; failed: number }>();
    for (const r of funnelRuns) {
      const c = m.get(r.stepId) ?? { sent: 0, failed: 0 };
      if (r.status === "sent") c.sent++;
      else if (r.status === "failed") c.failed++;
      m.set(r.stepId, c);
    }
    return m;
  }, [funnelRuns]);

  const sessions = useMemo(() => {
    if (!funnel) return [];
    const groups = new Map<number, { at: number; registered: number; sent: number; failed: number }>();
    const keyOf = (t: number) => (funnel.kind === "webinar" ? t : startOfDay(t));
    for (const reg of allRegistrations) {
      if (reg.funnelId !== id) continue;
      const k = keyOf(reg.sessionAt);
      const g = groups.get(k) ?? { at: k, registered: 0, sent: 0, failed: 0 };
      g.registered++;
      groups.set(k, g);
    }
    for (const r of funnelRuns) {
      const reg = registrationsById.get(r.registrationId);
      if (!reg) continue;
      const g = groups.get(keyOf(reg.sessionAt));
      if (!g) continue;
      if (r.status === "sent") g.sent++;
      else if (r.status === "failed") g.failed++;
    }
    return [...groups.values()].sort((a, b) => b.at - a.at);
  }, [funnel, funnelRuns, id]);

  if (!funnel) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Funnel not found</p>
        <Button asChild variant="link"><Link href="/funnels">Back to funnels</Link></Button>
      </div>
    );
  }

  const paused = funnel.status === "paused";
  const isMessage = (s: StepDef) => s.tool === "aisensy";

  return (
    <>
      <PageHeader
        title={funnel.name}
        description={funnel.schedule}
        actions={
          <>
            <FunnelStatus status={funnel.status} />
            <Button asChild variant="outline">
              <Link href={`/runs?funnel=${funnel.id}`}><ListChecks /> Run logs</Link>
            </Button>
            <Button variant="outline" onClick={() => comingSoon("Duplicating a funnel")}>
              <Copy /> Duplicate
            </Button>
            <Button
              variant={paused ? "default" : "outline"}
              onClick={() => {
                setStatus(funnel.id, paused ? "live" : "paused");
                toast.success(paused ? "Funnel resumed" : "Funnel paused");
              }}
            >
              {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
            </Button>
          </>
        }
      />

      {paused && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This funnel is paused. New registrations won&apos;t trigger any steps until you resume it.
        </p>
      )}

      <div className="grid gap-6">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Steps</h2>
            <div className="flex rounded-lg border bg-card p-0.5 text-sm" role="tablist" aria-label="Steps view">
              {([["canvas", Network, "Canvas"], ["list", Rows3, "List"]] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1 text-muted-foreground", view === v && "bg-accent font-medium text-accent-foreground")}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          {view === "canvas" && (
            <FunnelCanvas funnelId={funnel.id} steps={steps} counts={perStep} registrations={regCount} paused={paused} onEdit={openEdit} onToggle={doToggle} onAdd={(l) => { setLastLane(l); setAdding(l); }} />
          )}
          {view === "list" && <ol className="relative space-y-3 border-l-2 border-border pl-6">
            {steps.map((s) => {
              const c = perStep.get(s.id) ?? { sent: 0, failed: 0 };
              return (
                <li key={s.id} className="relative">
                  <span className={cn("absolute top-5 -left-[31px] size-3 rounded-full border-2 bg-background", s.enabled ? "border-primary" : "border-zinc-300")} />
                  <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{s.timing}</p>
                  <Card
                    className={cn("cursor-pointer gap-2 py-3 transition-colors hover:border-primary/40", !s.enabled && "opacity-60")}
                    onClick={() => openEdit(s)}
                  >
                    <CardContent className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {s.name} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{TOOL_NAMES[s.tool]}</span>
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.preview}</p>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            aria-label={`${s.enabled ? "Turn off" : "Turn on"} ${s.name}`}
                            checked={s.enabled}
                            onCheckedChange={() => {
                              toggleStep(s.id);
                              toast.success(s.enabled ? `${s.name} turned off — scheduled runs skipped` : `${s.name} turned on`);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4 tabular-nums">
                          <Link
                            href={`/runs?funnel=${funnel.id}&step=${s.key}&status=sent`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            <b className="text-emerald-700">{c.sent}</b> sent
                          </Link>
                          <Link
                            href={`/runs?funnel=${funnel.id}&step=${s.key}&status=failed`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            <b className={c.failed ? "text-red-600" : "text-muted-foreground"}>{c.failed}</b> failed
                          </Link>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Pencil className="size-3" /> Edit
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>}
          {view === "list" && (
            <Button variant="outline" className="mt-3" onClick={() => setAdding(lastLane)}>
              <Plus /> Add step
            </Button>
          )}
        </section>

        <section className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sessions <span className="text-xs font-normal text-muted-foreground">· sent / failed are step counts</span></CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="pr-6 text-right">Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No registrations yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {sessions.map((g) => (
                    <TableRow key={g.at}>
                      <TableCell className="pl-6">
                        {funnel.kind === "webinar" ? fmt(g.at) : fmtDay(g.at)}
                        {g.at > MOCK_NOW && <span className="ml-2 rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">upcoming</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{g.registered}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.sent}</TableCell>
                      <TableCell className={cn("pr-6 text-right tabular-nums", g.failed > 0 && "font-medium text-red-600")}>{g.failed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>

      <AddStepDialog funnelId={funnel.id} lane={adding ?? lastLane} open={adding !== null} onOpenChange={(o) => !o && setAdding(null)} />

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md" aria-describedby={undefined}>
          {editing && (
            <>
              <SheetHeader className="border-b pr-10">
                <SheetTitle>{editing.name}</SheetTitle>
                <SheetDescription>
                  {editing.timing} · {TOOL_NAMES[editing.tool]}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4">
                <div>
                  <label htmlFor="step-text" className="mb-1.5 block text-sm font-medium">
                    {isMessage(editing) ? "Message text" : "What this step does"}
                  </label>
                  <Textarea id="step-text" rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} />
                  {isMessage(editing) && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Variables: {"{{name}}"}, {"{{session_date}}"}, {"{{session_time}}"}, {"{{join_link}}"}, {"{{replay_link}}"}
                    </p>
                  )}
                </div>
                {isMessage(editing) && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium">Preview with sample contact</p>
                    <div className="rounded-lg rounded-tl-none bg-emerald-50 p-3 text-sm whitespace-pre-wrap">{fill(draft) || "—"}</div>
                  </div>
                )}
              </div>
              <SheetFooter className="flex-row justify-end border-t">
                {editing.custom && (
                  <Button
                    variant="ghost"
                    className="mr-auto text-red-600 hover:text-red-700"
                    onClick={() => {
                      removeStep(editing.id);
                      toast.success(`"${editing.name}" removed`);
                      setEditing(null);
                    }}
                  >
                    <Trash2 /> Remove
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button
                  disabled={!draft.trim() || draft === editing.preview}
                  onClick={() => {
                    editStep(editing.id, draft.trim());
                    toast.success("Step saved");
                    setEditing(null);
                  }}
                >
                  Save changes
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
