"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { allRegistrations, contactsById, useStore } from "@/lib/store";
import { useSetParams } from "@/lib/url-state";
import { fmt } from "@/lib/time";
import { STEP_ORDER } from "@/mock/seed";
import { cn } from "@/lib/utils";

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const setParams = useSetParams();
  const contact = contactsById.get(id);
  const funnels = useStore((s) => s.funnels);
  const steps = useStore((s) => s.steps);
  const runs = useStore((s) => s.runs);
  const retrying = useStore((s) => s.retrying);

  if (!contact) {
    return (
      <div className="py-16 text-center">
        <p className="font-medium">Contact not found</p>
        <Button asChild variant="link"><Link href="/contacts">Back to contacts</Link></Button>
      </div>
    );
  }
  const regs = allRegistrations.filter((r) => r.contactId === id);
  const mine = runs.filter((r) => r.contactId === id);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/contacts"><ArrowLeft /> Contacts</Link>
      </Button>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{contact.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {contact.phone} · {contact.email} · {contact.city}
        </p>
      </div>

      <div className="space-y-6">
        {regs.map((reg) => {
          const f = funnels.find((x) => x.id === reg.funnelId);
          const list = mine
            .filter((r) => r.funnelId === reg.funnelId)
            .sort((a, b) => STEP_ORDER.indexOf(a.stepKey) - STEP_ORDER.indexOf(b.stepKey));
          return (
            <Card key={reg.id}>
              <CardHeader>
                <CardTitle className="text-base">{f?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registered {fmt(reg.registeredAt)} · {f?.kind === "webinar" ? "Session" : "Call"} {fmt(reg.sessionAt)}
                </p>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Step</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6">Failure category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn("cursor-pointer", r.status === "failed" && "bg-red-50/50")}
                        onClick={() => setParams({ run: r.id }, { replace: false })}
                      >
                        <TableCell className="pl-6 font-medium">{steps.find((s) => s.id === r.stepId)?.name}</TableCell>
                        <TableCell>{fmt(r.plannedAt)}</TableCell>
                        <TableCell><StatusBadge status={r.status} retrying={!!retrying[r.id]} /></TableCell>
                        <TableCell className="pr-6 text-muted-foreground">{r.category ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
