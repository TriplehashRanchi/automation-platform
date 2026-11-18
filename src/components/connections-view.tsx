"use client";
import { CheckCircle2, Loader2, Plug, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/time";
import { comingSoon } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ConnectionsView() {
  const connections = useStore((s) => s.connections);
  const testing = useStore((s) => s.testing);
  const test = useStore((s) => s.testConnection);
  const setStatus = useStore((s) => s.setConnectionStatus);

  return (
    <>
      <PageHeader title="Connections" description="The tools FlowPilot sends your steps to." />
      <div className="grid gap-4 md:grid-cols-2">
        {connections.map((c) => {
          const ok = c.status === "connected";
          const busy = !!testing[c.id];
          return (
            <Card key={c.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><Plug className="size-5 text-muted-foreground" /></span>
                    <div>
                      <h2 className="font-semibold">{c.name}</h2>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", ok ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-red-50 text-red-700 ring-red-600/20")}>
                    {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {ok ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Last checked {fmt(c.lastCheckedAt)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      const result = await test(c.id);
                      if (result) toast.success(`${c.name} is working`);
                      else toast.error(`Couldn't reach ${c.name}. Reconnect it and test again.`);
                    }}
                  >
                    {busy && <Loader2 className="animate-spin" />} Test connection
                  </Button>
                  {ok ? (
                    <Button variant="ghost" onClick={() => { setStatus(c.id, "disconnected"); toast(`${c.name} disconnected`); }}>Disconnect</Button>
                  ) : (
                    <Button onClick={() => { setStatus(c.id, "connected"); toast.success(`${c.name} reconnected`); }}>Reconnect</Button>
                  )}
                  <Button variant="ghost" onClick={() => comingSoon("Editing credentials")}>Manage</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
