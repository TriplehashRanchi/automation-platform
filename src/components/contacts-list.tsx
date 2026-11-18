"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { allContacts, allRegistrations, useStore } from "@/lib/store";
import { comingSoon } from "@/lib/toast";

const PAGE = 50;

export function ContactsList() {
  const funnels = useStore((s) => s.funnels);
  const runs = useStore((s) => s.runs);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const failedBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of runs) if (r.status === "failed") m.set(r.contactId, (m.get(r.contactId) ?? 0) + 1);
    return m;
  }, [runs]);
  const funnelsBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of allRegistrations) m.set(r.contactId, [...(m.get(r.contactId) ?? []), r.funnelId]);
    return m;
  }, []);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const d = s.replace(/\D/g, "");
    if (!s) return allContacts;
    return allContacts.filter((c) => `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(s) || (d && c.phone.replace(/\D/g, "").includes(d)));
  }, [q]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <>
      <PageHeader
        title="Contacts"
        description={`${allContacts.length.toLocaleString("en-IN")} people registered across your funnels.`}
        actions={
          <Button variant="outline" onClick={() => comingSoon("Importing contacts")}>
            <Upload /> Import
          </Button>
        }
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search name, phone, email or city"
          aria-label="Search contacts"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Funnels</TableHead>
              <TableHead className="text-right">Failed steps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No contacts match “{q}”.</TableCell>
              </TableRow>
            )}
            {view.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{c.phone}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {(funnelsBy.get(c.id) ?? []).map((id) => funnels.find((f) => f.id === id)?.name).join(", ")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {failedBy.get(c.id) ? <span className="font-medium text-red-600">{failedBy.get(c.id)}</span> : <span className="text-muted-foreground">0</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{rows.length.toLocaleString("en-IN")} contacts · page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next <ChevronRight /></Button>
        </div>
      </div>
    </>
  );
}
