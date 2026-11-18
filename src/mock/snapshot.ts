import { isoIST } from "@/lib/time";
import { Contact, Funnel, Registration, StepDef, StepRun, TOOL_NAMES } from "./types";

export interface Snapshot {
  incoming: unknown;
  sent: unknown;
  response: unknown | null;
}

const digits = (p: string) => "91" + p.replace(/\D/g, "").replace(/^91/, "");

/** Raw error like "AiSensy 400: Invalid phone number" → { status, message } */
function parseError(raw: string) {
  const m = raw.match(/^[A-Za-z ]+? (\d{3}): (.*)$/);
  if (m) return { status: Number(m[1]), message: m[2] };
  return { status: null, message: raw.replace(/^[A-Za-z ]+: /, "") };
}

export function buildSnapshot(
  run: StepRun,
  contact: Contact,
  funnel: Funnel,
  step: StepDef,
  reg: Registration,
): Snapshot {
  const incoming = {
    event: "registration.created",
    received_at: isoIST(reg.registeredAt),
    funnel: { id: funnel.id, name: funnel.name },
    contact: { name: contact.name, phone: contact.phone, email: contact.email, city: contact.city },
    session: { starts_at: isoIST(reg.sessionAt), timezone: "Asia/Kolkata" },
    utm: { source: "instagram", medium: "bio_link", campaign: funnel.kind === "webinar" ? "igm_nov" : "strategy_call" },
  };

  const message = step.preview
    .replace("{{name}}", contact.name.split(" ")[0])
    .replace("{{session_date}}", isoIST(reg.sessionAt).slice(0, 10))
    .replace("{{session_time}}", isoIST(reg.sessionAt).slice(11, 16))
    .replace("{{join_link}}", "https://meet.rahulverma.in/j/abc123")
    .replace("{{replay_link}}", "https://rahulverma.in/replay/igm");

  let sent: unknown;
  switch (step.tool) {
    case "aisensy":
      sent = {
        request: "POST https://backend.aisensy.com/campaign/t1/api/v2",
        headers: { "Content-Type": "application/json", Authorization: "Bearer ••••••••••••9f2a" },
        body: {
          apiKey: "AIsk_••••••••••••e41c",
          campaignName: `${funnel.kind === "webinar" ? "webinar" : "call"}_${step.key}`,
          destination: digits(contact.phone),
          userName: contact.name,
          templateParams: [contact.name.split(" ")[0]],
          message_preview: message,
        },
      };
      break;
    case "mailerlite":
      sent = {
        request: "POST https://connect.mailerlite.com/api/subscribers",
        headers: { "Content-Type": "application/json", Authorization: "Bearer ••••••••••••c7d1" },
        body: { email: contact.email, fields: { name: contact.name, phone: contact.phone, city: contact.city }, groups: ["108345221"] },
      };
      break;
    case "sheets":
      sent = {
        request: "POST https://sheets.googleapis.com/v4/spreadsheets/1xK…Qe9/values/Registrations!A:F:append",
        headers: { "Content-Type": "application/json", Authorization: "Bearer ya29.••••••••••••" },
        body: { values: [[contact.name, contact.phone, contact.email, contact.city, funnel.name, isoIST(reg.registeredAt)]] },
      };
      break;
    default:
      sent = {};
  }

  let response: unknown | null = null;
  if (run.status === "sent" && run.actualAt) {
    const doneAt = run.attempts.filter((a) => a.result === "sent").pop()?.at ?? run.actualAt;
    response =
      step.tool === "aisensy"
        ? { status: 200, body: { success: true, submitted_message_id: `wamid.${run.id.slice(4)}HBgM`, timestamp: isoIST(doneAt) } }
        : step.tool === "mailerlite"
          ? { status: 200, body: { data: { id: `9${run.id.slice(4)}1`, email: contact.email, status: "active" } } }
          : { status: 200, body: { updates: { updatedRange: "Registrations!A2:F2", updatedRows: 1 } } };
  } else if (run.status === "failed" && run.rawError) {
    const { status, message } = parseError(run.rawError);
    response =
      status !== null
        ? { status, body: { error: { message, tool: TOOL_NAMES[step.tool] } } }
        : { error: { message: run.rawError, tool: TOOL_NAMES[step.tool] } };
  }
  return { incoming, sent, response };
}
