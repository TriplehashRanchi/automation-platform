"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/filter-select";
import { useStore } from "@/lib/store";
import { StepDef, ToolId } from "@/mock/types";

export type Lane = "register" | "session";

const ACTIONS: { value: string; label: string; tool: ToolId; name: string; text: string }[] = [
  { value: "wa", label: "Send WhatsApp message (AiSensy)", tool: "aisensy", name: "WhatsApp message", text: "Hi {{name}}, " },
  { value: "row", label: "Add row to Google Sheet", tool: "sheets", name: "Add row to Google Sheet", text: 'Append row to sheet "Registrations": Name, Phone, Email, Registered at' },
  { value: "group", label: "Add to MailerLite group", tool: "mailerlite", name: "Add to MailerLite group", text: 'Add subscriber to group "All leads"' },
];
const TIMINGS = ["48 hours before", "3 hours before", "30 minutes before", "At session start", "30 minutes after", "1 day after"];

/** Inner form is keyed so its state resets every time the dialog opens. */
function Form({ funnelId, lane: initialLane, onClose }: { funnelId: string; lane: Lane; onClose: () => void }) {
  const addStep = useStore((s) => s.addStep);
  const count = useStore((s) => s.steps.filter((x) => x.custom).length);
  const [lane, setLane] = useState<Lane>(initialLane);
  const [action, setAction] = useState("wa");
  const [name, setName] = useState(ACTIONS[0].name);
  const [text, setText] = useState(ACTIONS[0].text);
  const [timing, setTiming] = useState(TIMINGS[2]);

  const pick = (v: string) => {
    const a = ACTIONS.find((x) => x.value === v) ?? ACTIONS[0];
    setAction(a.value);
    setName(a.name);
    setText(a.text);
  };
  const a = ACTIONS.find((x) => x.value === action)!;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a step</DialogTitle>
        <DialogDescription>New steps run for registrations received from now on.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>When should it run?</Label>
          <FilterSelect
            value={lane}
            onChange={(v) => setLane((v || "register") as Lane)}
            allLabel=""
            className="w-full"
            options={[
              { value: "register", label: "When someone registers" },
              { value: "session", label: "Around the session" },
            ]}
          />
        </div>
        {lane === "session" && (
          <div className="space-y-1.5">
            <Label>Timing</Label>
            <FilterSelect value={timing} onChange={(v) => setTiming(v || TIMINGS[2])} allLabel="" className="w-full" options={TIMINGS.map((t) => ({ value: t, label: t }))} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Action</Label>
          <FilterSelect value={action} onChange={(v) => pick(v || "wa")} allLabel="" className="w-full" options={ACTIONS.map((x) => ({ value: x.value, label: x.label }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-step-name">Step name</Label>
          <Input id="new-step-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-step-text">{a.tool === "aisensy" ? "Message text" : "What this step does"}</Label>
          <Textarea id="new-step-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!name.trim() || !text.trim()}
          onClick={() => {
            const n = count + 1;
            const step: StepDef = {
              id: `${funnelId}:custom${n}`,
              funnelId,
              key: `custom${n}`,
              lane,
              custom: true,
              name: name.trim(),
              timing: lane === "register" ? "On registration" : timing,
              tool: a.tool,
              enabled: true,
              preview: text.trim(),
            };
            addStep(step);
            toast.success(`"${step.name}" added`);
            onClose();
          }}
        >
          Add step
        </Button>
      </DialogFooter>
    </>
  );
}

export function AddStepDialog({ funnelId, lane, open, onOpenChange }: { funnelId: string; lane: Lane; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <Form funnelId={funnelId} lane={lane} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
