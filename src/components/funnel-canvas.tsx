"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Plus, Webhook, ZoomIn, ZoomOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { StepDef, TOOL_NAMES, ToolId } from "@/mock/types";
import { cn } from "@/lib/utils";

const NODE_W = 244;
const LANE_X = 52;
const NODE_H = 140;
const GAP = 38;
const TRIG_H = 96;
const IMMEDIATE = ["confirm", "row", "group"];

const TOOL_STYLE: Record<ToolId, string> = {
  aisensy: "bg-emerald-100 text-emerald-700",
  mailerlite: "bg-orange-100 text-orange-700",
  sheets: "bg-green-100 text-green-700",
  webhook: "bg-indigo-100 text-indigo-700",
};

interface Pos { x: number; y: number }
type Counts = Map<string, { sent: number; failed: number }>;

export function FunnelCanvas({
  funnelId,
  steps,
  counts,
  registrations,
  paused,
  onEdit,
  onToggle,
  onAdd,
}: {
  funnelId: string;
  steps: StepDef[];
  counts: Counts;
  registrations: number;
  paused: boolean;
  onEdit: (s: StepDef) => void;
  onToggle: (s: StepDef) => void;
  onAdd: (lane: "register" | "session") => void;
}) {
  const laneOf = (s: StepDef) => s.lane ?? (IMMEDIATE.includes(s.key) ? "register" : "session");
  const immediate = steps.filter((s) => laneOf(s) === "register");
  const timed = steps.filter((s) => laneOf(s) === "session");

  // layout (canvas coordinates): trigger on top, two horizontal lanes beneath
  const trigger: Pos = { x: 16, y: 16 };
  const laneAY = 190;
  const laneBY = laneAY + NODE_H + 86;
  const pos = new Map<string, Pos>();
  immediate.forEach((s, i) => pos.set(s.id, { x: LANE_X + i * (NODE_W + GAP), y: laneAY }));
  timed.forEach((s, i) => pos.set(s.id, { x: LANE_X + i * (NODE_W + GAP), y: laneBY }));
  const PLUS = 36;
  const plusA: Pos = { x: LANE_X + immediate.length * (NODE_W + GAP), y: laneAY + NODE_H / 2 - PLUS / 2 };
  const plusB: Pos = { x: LANE_X + timed.length * (NODE_W + GAP), y: laneBY + NODE_H / 2 - PLUS / 2 };
  const cols = Math.max(immediate.length, timed.length, 3);
  const width = LANE_X + cols * (NODE_W + GAP) + PLUS + 16;
  const height = laneBY + NODE_H + 20;

  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const moved = useRef(false);

  const fit = () => {
    const w = box.current?.clientWidth ?? width;
    setScale(Math.min(1.25, Math.max(0.5, (w - 8) / width)));
  };

  // keep the newest "+" in view when steps are added; otherwise stay at 100% and let the user slide
  const prevWidth = useRef(width);
  useEffect(() => {
    if (width > prevWidth.current) {
      requestAnimationFrame(() => box.current?.scrollTo({ left: box.current.scrollWidth, behavior: "smooth" }));
    }
    prevWidth.current = width;
  }, [width]);
  const slide = (dir: 1 | -1) => box.current?.scrollBy({ left: dir * 420, behavior: "smooth" });

  const hEdge = (a: Pos, b: Pos, key: string) => {
    const x1 = a.x + NODE_W;
    const y = a.y + NODE_H / 2;
    return (
      <g key={key}>
        <path d={`M${x1},${y} L${b.x},${b.y + NODE_H / 2}`} stroke="#a1a1aa" strokeWidth={2} />
        <circle cx={b.x} cy={b.y + NODE_H / 2} r={4} fill="#a1a1aa" />
      </g>
    );
  };
  const plusEdge = (lane: StepDef[], at: Pos, key: string) => {
    if (!lane.length) return null;
    const last = pos.get(lane[lane.length - 1].id)!;
    const y = last.y + NODE_H / 2;
    return <path key={key} d={`M${last.x + NODE_W},${y} H${at.x}`} stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 5" />;
  };

  // left "rail" drops from the trigger and branches into each lane
  const tEdge = (b: Pos, key: string) => {
    const x1 = 26;
    const y1 = trigger.y + TRIG_H;
    const y2 = b.y + NODE_H / 2;
    return (
      <g key={key}>
        <path d={`M${x1},${y1} V${y2 - 22} Q${x1},${y2} ${x1 + 22},${y2} H${b.x}`} fill="none" stroke="#a1a1aa" strokeWidth={2} />
        <circle cx={b.x} cy={y2} r={4} fill="#a1a1aa" />
      </g>
    );
  };

  const TRIG_W = 300;

  const node = (s: StepDef) => {
    const p = pos.get(s.id)!;
    const c = counts.get(s.id) ?? { sent: 0, failed: 0 };
    return (
      <div
        key={s.id}
        role="button"
        tabIndex={0}
        onClick={() => !moved.current && onEdit(s)}
        onKeyDown={(e) => e.key === "Enter" && onEdit(s)}
        style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
        className={cn(
          "absolute cursor-pointer rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md hover:ring-1 hover:ring-primary/40",
          !s.enabled && "opacity-55",
          c.failed > 0 && "border-red-300",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold", TOOL_STYLE[s.tool])}>
              {TOOL_NAMES[s.tool].slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] leading-tight font-medium">{s.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{s.timing}</p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Switch size="sm" aria-label={`${s.enabled ? "Turn off" : "Turn on"} ${s.name}`} checked={s.enabled} onCheckedChange={() => onToggle(s)} />
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{s.preview}</p>
        <div className="absolute inset-x-3 bottom-2 flex gap-3 text-xs tabular-nums" onPointerDown={(e) => e.stopPropagation()}>
          <Link href={`/runs?funnel=${funnelId}&step=${s.key}&status=sent`} onClick={(e) => e.stopPropagation()} className="hover:underline">
            <b className="text-emerald-700">{c.sent}</b> sent
          </Link>
          <Link href={`/runs?funnel=${funnelId}&step=${s.key}&status=failed`} onClick={(e) => e.stopPropagation()} className="hover:underline">
            <b className={c.failed ? "text-red-600" : "text-muted-foreground"}>{c.failed}</b> failed
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="relative rounded-xl border bg-card">
      <p className="pointer-events-none absolute bottom-2 left-3 z-10 rounded bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">Drag or scroll to slide</p>
      <div className="absolute top-3 right-3 z-10 flex gap-1 rounded-lg border bg-background p-1 shadow-sm">
        <Button variant="ghost" size="icon" className="size-7" aria-label="Slide left" onClick={() => slide(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label="Slide right" onClick={() => slide(1)}>
          <ChevronRight />
        </Button>
        <span className="mx-0.5 w-px bg-border" />
        <Button variant="ghost" size="icon" className="size-7" aria-label="Zoom out" onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)))}>
          <ZoomOut />
        </Button>
        <span className="flex w-10 items-center justify-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="size-7" aria-label="Zoom in" onClick={() => setScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}>
          <ZoomIn />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label="Fit to view" onClick={fit}>
          <Maximize2 />
        </Button>
      </div>
      <div
        ref={box}
        className="cursor-grab overflow-auto rounded-xl active:cursor-grabbing"
        style={{
          height: Math.min(620, Math.max(300, height * scale + 24)),
          backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, sl: box.current!.scrollLeft, st: box.current!.scrollTop };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !box.current) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
          box.current.scrollLeft = d.sl - dx;
          box.current.scrollTop = d.st - dy;
        }}
        onPointerUp={() => {
          drag.current = null;
          setTimeout(() => (moved.current = false), 0);
        }}
        onPointerLeave={() => (drag.current = null)}
      >
        <div style={{ width: width * scale, height: height * scale }}>
          <div className="relative" style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
              {tEdge(immediate.length ? pos.get(immediate[0].id)! : { x: plusA.x, y: laneAY }, "t-a")}
              {plusEdge(immediate, plusA, "p-a")}
              {plusEdge(timed, plusB, "p-b")}
              {immediate.slice(1).map((s, i) => hEdge(pos.get(immediate[i].id)!, pos.get(s.id)!, `h-${s.id}`))}
              {tEdge(timed.length ? pos.get(timed[0].id)! : { x: plusB.x, y: laneBY }, "t-b")}
              {timed.slice(1).map((s, i) => hEdge(pos.get(timed[i].id)!, pos.get(s.id)!, `h-${s.id}`))}
            </svg>

            <div
              style={{ left: trigger.x, top: trigger.y, width: TRIG_W, height: TRIG_H }}
              className="absolute rounded-xl border-2 border-primary/50 bg-accent/40 p-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                  <Webhook className="size-4" />
                </span>
                <div>
                  <p className="text-sm leading-tight font-medium">New registration</p>
                  <p className="text-[11px] text-muted-foreground">Trigger · Webhook</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <b className="text-foreground tabular-nums">{registrations}</b> registrations received
              </p>
              <p className={cn("text-xs", paused ? "text-amber-700" : "text-emerald-700")}>{paused ? "Paused — not triggering steps" : "Live"}</p>
            </div>

            {(
              <p className="absolute text-[11px] font-semibold tracking-wide text-muted-foreground uppercase" style={{ left: LANE_X, top: laneAY - 24 }}>
                When someone registers
              </p>
            )}
            {(
              <p className="absolute text-[11px] font-semibold tracking-wide text-muted-foreground uppercase" style={{ left: LANE_X, top: laneBY - 24 }}>
                Around the session
              </p>
            )}
            {([["register", plusA], ["session", plusB]] as const).map(([lane, at]) => (
              <button
                key={lane}
                type="button"
                aria-label={lane === "register" ? "Add a step when someone registers" : "Add a step around the session"}
                title="Add step"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(lane);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ left: at.x, top: at.y, width: PLUS, height: PLUS }}
                className="absolute flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-background text-primary shadow-sm transition-colors hover:border-primary hover:bg-accent"
              >
                <Plus className="size-4" />
              </button>
            ))}
            {steps.map(node)}
          </div>
        </div>
      </div>
    </div>
  );
}
