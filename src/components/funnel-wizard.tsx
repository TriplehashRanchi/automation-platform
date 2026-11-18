"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Copy, PhoneCall, Presentation, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { FilterSelect } from "@/components/filter-select";
import { useStore } from "@/lib/store";
import { buildStepDefs } from "@/mock/seed";
import { ToolId, TOOL_NAMES } from "@/mock/types";
import { cn } from "@/lib/utils";

type Kind = "webinar" | "call";
const STAGES = ["Template", "Questions", "Connections", "Webhook", "Review", "Go live"];

const RESOURCES: Record<"aisensy" | "mailerlite" | "sheets", { label: string; options: string[] }> = {
  aisensy: { label: "AiSensy project", options: ["Harmeet Kelley – WhatsApp"] },
  mailerlite: { label: "MailerLite group", options: ["IG Masterclass – Registered", "Strategy Call – Booked", "All leads"] },
  sheets: { label: "Google Sheet", options: ["Webinar Registrations", "Call Bookings", "All Registrations"] },
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function FunnelWizard() {
  const router = useRouter();
  const funnels = useStore((s) => s.funnels);
  const connections = useStore((s) => s.connections);
  const addFunnel = useStore((s) => s.addFunnel);

  const [stage, setStage] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [a, setA] = useState({ name: "", day: "Saturday", time: "19:00", length: "30", booking: "", join: "", replay: "" });
  const [use, setUse] = useState<Record<"aisensy" | "mailerlite" | "sheets", boolean>>({ aisensy: true, mailerlite: true, sheets: true });
  const [res, setRes] = useState<Record<string, string>>({ aisensy: RESOURCES.aisensy.options[0], mailerlite: RESOURCES.mailerlite.options[0], sheets: RESOURCES.sheets.options[0] });

  const name = a.name.trim();
  const id = `f-${slug(name || "new")}-${funnels.length + 1}`;
  const webhookUrl = `https://hooks.flowpilot.app/w/rv_${slug(name || "funnel").slice(0, 8)}_${hash(name + kind)}`;
  const schedule = kind === "webinar" ? `Free webinar · every ${a.day}, ${a.time} IST` : `Booked slots · ${a.length}-minute calls`;

  const steps = useMemo(
    () => (kind ? buildStepDefs(id, kind, name || "New funnel").filter((s) => use[s.tool as "aisensy" | "mailerlite" | "sheets"] ?? true) : []),
    [kind, id, name, use],
  );

  const questionsValid = name.length > 1 && a.join.trim().length > 3 && (kind === "webinar" ? !!a.time : !!a.booking.trim());
  const disconnected = (Object.keys(use) as (keyof typeof use)[]).filter((t) => use[t] && connections.find((c) => c.id === t)?.status !== "connected");
  const canNext = [!!kind, questionsValid, disconnected.length === 0 && steps.length > 0, true, true, true][stage];

  return (
    <>
      <PageHeader title="New funnel" description="Set up a funnel in a few minutes. Nothing is sent until you go live." />

      <ol className="mb-6 flex flex-wrap gap-2 text-sm">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1",
              i === stage && "border-primary bg-accent font-medium text-accent-foreground",
              i < stage && "text-muted-foreground",
            )}
          >
            <span className={cn("flex size-4 items-center justify-center rounded-full text-[10px]", i < stage ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {i < stage ? <Check className="size-3" /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <Card className="max-w-3xl">
        <CardContent className="space-y-5">
          {stage === 0 && (
            <>
              <h2 className="font-semibold">Pick a template</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["webinar", Presentation, "Webinar", "A free session on a fixed day and time. Registrants get a confirmation, three reminders and a replay."],
                    ["call", PhoneCall, "1:1 Call", "Booked calls at individual times. Reminders are relative to each person's slot."],
                  ] as const
                ).map(([k, Icon, title, desc]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k);
                      setA((p) => ({ ...p, name: p.name || (k === "webinar" ? "My Webinar" : "My 1:1 Call") }));
                    }}
                    className={cn("rounded-lg border p-4 text-left transition-colors hover:border-primary/50", kind === k && "border-primary bg-accent/50 ring-1 ring-primary")}
                  >
                    <Icon className="mb-2 size-5 text-primary" />
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {stage === 1 && kind && (
            <>
              <h2 className="font-semibold">Answer 5 quick questions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="q1">1. What is this funnel called?</Label>
                  <Input id="q1" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
                </div>
                {kind === "webinar" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>2. Which day does it run?</Label>
                      <FilterSelect
                        value={a.day}
                        onChange={(v) => setA({ ...a, day: v || "Saturday" })}
                        allLabel=""
                        className="w-full"
                        options={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => ({ value: d, label: d }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="q3">3. What time does it start (IST)?</Label>
                      <Input id="q3" type="time" value={a.time} onChange={(e) => setA({ ...a, time: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>2. How long is each call?</Label>
                      <FilterSelect
                        value={a.length}
                        onChange={(v) => setA({ ...a, length: v || "30" })}
                        allLabel=""
                        className="w-full"
                        options={["15", "30", "45", "60"].map((d) => ({ value: d, label: `${d} minutes` }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="q3">3. Where do people book a slot?</Label>
                      <Input id="q3" placeholder="https://cal.com/rahul/strategy" value={a.booking} onChange={(e) => setA({ ...a, booking: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="q4">4. Join / meeting link</Label>
                  <Input id="q4" placeholder="https://meet.rahulverma.in/j/..." value={a.join} onChange={(e) => setA({ ...a, join: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q5">5. {kind === "webinar" ? "Replay link (optional)" : "Notes / next-steps link (optional)"}</Label>
                  <Input id="q5" value={a.replay} onChange={(e) => setA({ ...a, replay: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {stage === 2 && (
            <>
              <h2 className="font-semibold">Choose connections</h2>
              <div className="space-y-3">
                {(["aisensy", "mailerlite", "sheets"] as const).map((t) => {
                  const conn = connections.find((c) => c.id === t);
                  const ok = conn?.status === "connected";
                  return (
                    <div key={t} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                      <Checkbox id={`use-${t}`} checked={use[t]} onCheckedChange={(c) => setUse({ ...use, [t]: !!c })} />
                      <Label htmlFor={`use-${t}`} className="min-w-28 font-medium">{TOOL_NAMES[t as ToolId]}</Label>
                      <span className={cn("text-xs", ok ? "text-emerald-700" : "text-red-600")}>{ok ? "Connected" : "Disconnected"}</span>
                      <div className="ml-auto w-full sm:w-64">
                        <FilterSelect
                          value={res[t]}
                          onChange={(v) => setRes({ ...res, [t]: v || res[t] })}
                          allLabel=""
                          className="w-full"
                          aria-label={RESOURCES[t].label}
                          options={RESOURCES[t].options.map((o) => ({ value: o, label: o }))}
                        />
                      </div>
                    </div>
                  );
                })}
                {disconnected.length > 0 && (
                  <p className="text-sm text-red-600">
                    {disconnected.map((t) => TOOL_NAMES[t]).join(", ")} is disconnected. <Link className="underline" href="/connections">Reconnect it</Link> or untick it.
                  </p>
                )}
              </div>
            </>
          )}

          {stage === 3 && (
            <>
              <h2 className="font-semibold">Copy your webhook URL</h2>
              <p className="text-sm text-muted-foreground">
                Paste this into your landing page or booking form as the webhook for new registrations. Every registration sent here starts this funnel.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" aria-label="Webhook URL" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(webhookUrl);
                      toast.success("Webhook URL copied");
                    } catch {
                      toast.error("Couldn't copy — select the URL and copy it manually");
                    }
                  }}
                >
                  <Copy /> Copy
                </Button>
              </div>
            </>
          )}

          {stage === 4 && kind && (
            <>
              <h2 className="font-semibold">Review steps</h2>
              <p className="text-sm text-muted-foreground">
                {name} · {schedule}
              </p>
              <ol className="divide-y rounded-lg border">
                {steps.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{s.timing}</p>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.preview}</p>
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{TOOL_NAMES[s.tool]}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {stage === 5 && (
            <div className="space-y-3 py-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <Rocket className="size-6" />
              </span>
              <h2 className="text-lg font-semibold">Ready to go live</h2>
              <p className="text-sm text-muted-foreground">
                {name} will start running its {steps.length} steps for every registration received at your webhook.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  if (!kind) return;
                  addFunnel({ id, name, kind, status: "live", schedule, webhookUrl }, steps);
                  toast.success(`${name} is live`);
                  router.push(`/funnels/${id}`);
                }}
              >
                <Rocket /> Go live
              </Button>
            </div>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button variant="ghost" disabled={stage === 0} onClick={() => setStage(stage - 1)}>
              Back
            </Button>
            {stage < STAGES.length - 1 && (
              <Button disabled={!canNext} onClick={() => setStage(stage + 1)}>
                Continue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
