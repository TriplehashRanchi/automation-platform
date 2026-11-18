"use client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { useStore } from "@/lib/store";

export function AlertsView() {
  const alerts = useStore((s) => s.alerts);
  const setAlert = useStore((s) => s.setAlert);
  const rows = [
    { key: "disconnect" as const, title: "Email me when a connection disconnects", desc: "Sent to connect@rahulverma.in as soon as AiSensy, MailerLite, Google Sheets or the webhook stops responding." },
    { key: "daily" as const, title: "Email me a daily summary (sent / failed counts)", desc: "One email each morning with yesterday's sent and failed step counts." },
  ];
  return (
    <>
      <PageHeader title="Alerts" description="Choose which emails FlowPilot sends you." />
      <Card className="max-w-2xl">
        <CardContent className="divide-y">
          {rows.map((r) => (
            <div key={r.key} className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                aria-label={r.title}
                checked={alerts[r.key]}
                onCheckedChange={(v) => {
                  setAlert(r.key, v);
                  toast.success(v ? "Alert turned on" : "Alert turned off");
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
