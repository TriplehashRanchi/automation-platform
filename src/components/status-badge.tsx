import { Loader2 } from "lucide-react";
import { Status } from "@/mock/types";
import { cn } from "@/lib/utils";

const STYLES: Record<Status, string> = {
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20",
  skipped: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  expired: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function StatusBadge({ status, retrying, className }: { status: Status; retrying?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        retrying ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20" : STYLES[status],
        className,
      )}
    >
      {retrying && <Loader2 className="size-3 animate-spin" />}
      {retrying ? "Retrying" : status}
    </span>
  );
}
