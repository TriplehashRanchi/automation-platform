export type Status = "sent" | "failed" | "scheduled" | "skipped" | "expired";

export const CATEGORIES = [
  "Connection problem",
  "Invalid contact data",
  "Template not approved",
  "Limit or balance reached",
  "Tool not responding",
  "Setup incomplete",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type ToolId = "aisensy" | "mailerlite" | "sheets" | "webhook";

export type StepKey = "confirm" | "row" | "group" | "r24" | "r1" | "r10" | "replay";

export interface Contact {
  id: string;
  name: string;
  phone: string; // "+91 98123 45678"
  email: string;
  city: string;
}

export interface Funnel {
  id: string;
  name: string;
  kind: "webinar" | "call";
  status: "live" | "paused";
  schedule: string;
  webhookUrl: string;
}

export interface StepDef {
  id: string; // `${funnelId}:${key}`
  funnelId: string;
  key: StepKey | string; // custom steps added in the canvas use "customN"
  lane?: "register" | "session"; // set for custom steps; built-ins derive it from key
  custom?: boolean;
  name: string;
  timing: string;
  tool: ToolId;
  enabled: boolean;
  preview: string; // message text or action description (editable)
}

export interface Registration {
  id: string;
  contactId: string;
  funnelId: string;
  registeredAt: number; // epoch ms
  sessionAt: number; // webinar start / call slot
}

export interface Attempt {
  at: number;
  result: "sent" | "failed";
  error?: string;
  category?: Category;
}

export interface StepRun {
  id: string;
  registrationId: string;
  contactId: string;
  funnelId: string;
  stepId: string;
  stepKey: StepKey;
  status: Status;
  plannedAt: number;
  actualAt?: number;
  category?: Category; // only while status === "failed"
  rawError?: string; // only while status === "failed"
  note?: string; // reason for skipped / expired
  attempts: Attempt[];
}

export interface Connection {
  id: ToolId;
  name: string;
  description: string;
  status: "connected" | "disconnected";
  lastCheckedAt: number;
}

export const TOOL_NAMES: Record<ToolId, string> = {
  aisensy: "AiSensy",
  mailerlite: "MailerLite",
  sheets: "Google Sheets",
  webhook: "Webhook",
};
