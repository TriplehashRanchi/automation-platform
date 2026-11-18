import { cn } from "@/lib/utils";

export function FunnelStatus({ status }: { status: "live" | "paused" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        status === "live" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
      )}
    >
      {status === "live" ? "Live" : "Paused"}
    </span>
  );
}
