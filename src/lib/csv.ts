import { StepRun, StepDef, Contact, Funnel, TOOL_NAMES } from "@/mock/types";
import { fmt } from "./time";

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function runsToCsv(
  runs: StepRun[],
  ctx: { contacts: Map<string, Contact>; funnels: Funnel[]; steps: StepDef[] },
) {
  const header = ["Time (IST)", "Contact", "Phone", "Funnel", "Step", "Tool", "Status", "Failure category", "Raw error"];
  const rows = runs.map((r) => {
    const c = ctx.contacts.get(r.contactId);
    const step = ctx.steps.find((s) => s.id === r.stepId);
    return [
      fmt(r.plannedAt, true),
      c?.name ?? "",
      c?.phone ?? "",
      ctx.funnels.find((f) => f.id === r.funnelId)?.name ?? "",
      step?.name ?? "",
      step ? TOOL_NAMES[step.tool] : "",
      r.status,
      r.category ?? "",
      r.rawError ?? "",
    ].map(esc);
  });
  return [header.map(esc), ...rows].map((r) => r.join(",")).join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
