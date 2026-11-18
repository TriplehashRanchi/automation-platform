"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { FunnelStatus } from "@/components/funnel-status";
import { allRegistrations, useStore } from "@/lib/store";
import { countStatus } from "@/lib/stats";

export function FunnelsList() {
  const funnels = useStore((s) => s.funnels);
  const runs = useStore((s) => s.runs);
  return (
    <>
      <PageHeader
        title="Funnels"
        description="Each funnel is a set of steps that runs for every registration."
        actions={
          <Button asChild>
            <Link href="/funnels/new">
              <Plus /> New funnel
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {funnels.map((f) => {
          const c = countStatus(runs.filter((r) => r.funnelId === f.id));
          const regs = allRegistrations.filter((r) => r.funnelId === f.id).length;
          return (
            <Link key={f.id} href={`/funnels/${f.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{f.name}</h2>
                    <FunnelStatus status={f.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{f.schedule}</p>
                  <div className="flex gap-6 text-sm tabular-nums">
                    <span><b>{regs}</b> registrations</span>
                    <span><b className="text-emerald-700">{c.sent}</b> sent</span>
                    <span><b className={c.failed ? "text-red-600" : ""}>{c.failed}</b> failed</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
