import { makeRng } from "./rng";
import { CITIES, FIRST_NAMES, LAST_NAMES } from "./names";
import {
  Category,
  Connection,
  Contact,
  Funnel,
  Registration,
  StepDef,
  StepKey,
  StepRun,
  ToolId,
} from "./types";
import { DAY, HOUR, MIN, MOCK_NOW, dayOfWeek, startOfDay } from "@/lib/time";

export const ACCOUNT_NAME = "Harmeet Kelley Coaching";
export const WEBINAR_ID = "f-webinar";
export const CALL_ID = "f-call";

export const STEP_TOOL: Record<StepKey, ToolId> = {
  confirm: "aisensy",
  row: "sheets",
  group: "mailerlite",
  r24: "aisensy",
  r1: "aisensy",
  r10: "aisensy",
  replay: "aisensy",
};

export const STEP_ORDER: StepKey[] = ["confirm", "row", "group", "r24", "r1", "r10", "replay"];

// ---------------------------------------------------------------- funnels/steps
const FUNNELS: Funnel[] = [
  {
    id: WEBINAR_ID,
    name: "Instagram Growth Masterclass",
    kind: "webinar",
    status: "live",
    schedule: "Free webinar · every Saturday, 7:00 PM IST",
    webhookUrl: "https://hooks.flowpilot.app/w/rv_igm_8f3a1c92",
  },
  {
    id: CALL_ID,
    name: "1:1 Strategy Call",
    kind: "call",
    status: "live",
    schedule: "Booked slots · 30-minute calls",
    webhookUrl: "https://hooks.flowpilot.app/w/rv_call_41d7be05",
  },
];

export function buildStepDefs(funnelId: string, kind: "webinar" | "call", title: string): StepDef[] {
  const w = kind === "webinar";
  const base = [
    ["confirm", "Confirmation WhatsApp", "On registration",
      w
        ? `Hi {{name}}, you're registered for *${title}* on {{session_date}} at 7:00 PM IST. Join link: {{join_link}} – Rahul`
        : `Hi {{name}}, your strategy call with Rahul is booked for {{session_date}}, {{session_time}} IST. Meeting link: {{join_link}}`],
    ["row", "Add row to Google Sheet", "On registration",
      `Append row to sheet "${w ? "Webinar Registrations" : "Call Bookings"}": Name, Phone, Email, Registered at`],
    ["group", "Add to MailerLite group", "On registration",
      `Add subscriber to group "${w ? "IG Masterclass – Registered" : "Strategy Call – Booked"}"`],
    ["r24", "24-hour reminder", w ? "24 hours before" : "24 hours before the call",
      w
        ? `Hi {{name}}, the masterclass is tomorrow at 7 PM. Save your link: {{join_link}}`
        : `Hi {{name}}, a reminder: your strategy call is tomorrow at {{session_time}}. Link: {{join_link}}`],
    ["r1", "1-hour reminder", w ? "1 hour before" : "1 hour before the call",
      w ? `{{name}}, we start in 1 hour! Join here: {{join_link}}` : `{{name}}, your call starts in 1 hour. Link: {{join_link}}`],
    ["r10", "10-minute reminder", w ? "10 minutes before" : "10 minutes before the call",
      w ? `Starting in 10 minutes. Join now: {{join_link}}` : `Your call starts in 10 minutes. Join now: {{join_link}}`],
    ["replay", w ? "Replay message" : "Follow-up message", w ? "2 hours after the session" : "1 hour after the call",
      w
        ? `Missed it? Here's the replay of ${title}: {{replay_link}} (valid for 48 hours)`
        : `Thanks for your time today, {{name}}! Here are the notes and next steps: {{replay_link}}`],
  ] as const;
  return base.map(([key, name, timing, preview]) => ({
    id: `${funnelId}:${key}`,
    funnelId,
    key,
    name,
    timing,
    tool: STEP_TOOL[key],
    enabled: true,
    preview,
  }));
}

// ---------------------------------------------------------------- errors
type Pool = Partial<Record<Category, string[]>>;
const ERRORS: Record<"aisensy" | "mailerlite" | "sheets", Pool> = {
  aisensy: {
    "Connection problem": ["AiSensy: connect ETIMEDOUT 13.126.88.201:443", "AiSensy: socket hang up (ECONNRESET)"],
    "Invalid contact data": ["AiSensy 400: Invalid phone number"],
    "Template not approved": ["AiSensy 400: Template 'replay_link_v2' is not approved by WhatsApp"],
    "Limit or balance reached": ["AiSensy 402: Insufficient wallet balance"],
    "Tool not responding": ["AiSensy 503: Service Unavailable", "AiSensy 504: Gateway Timeout", "AiSensy: timeout of 10000ms exceeded"],
    "Setup incomplete": ["AiSensy 400: Campaign '{campaign}' is not live", "AiSensy 404: Campaign '{campaign}' not found"],
  },
  mailerlite: {
    "Connection problem": ["MailerLite: getaddrinfo ENOTFOUND connect.mailerlite.com", "MailerLite: connect ECONNREFUSED 104.18.31.77:443"],
    "Invalid contact data": ["MailerLite 422: The email must be a valid email address."],
    "Tool not responding": ["MailerLite 503: Service Unavailable", "MailerLite: timeout of 10000ms exceeded"],
    "Setup incomplete": ["MailerLite 404: Group not found"],
  },
  sheets: {
    "Connection problem": ["Google Sheets: connect ETIMEDOUT 142.250.77.10:443"],
    "Tool not responding": ["Google Sheets 503: The service is currently unavailable.", "Google Sheets 504: Deadline exceeded"],
    "Setup incomplete": [
      "Google Sheets 404: Requested entity was not found. (sheet 'Registrations' missing)",
      "Google Sheets 400: Unable to parse range: Registrations!A:F",
    ],
  },
};
const RANDOM_CATEGORY_WEIGHTS: Record<"aisensy" | "mailerlite" | "sheets", [Category, number][]> = {
  aisensy: [["Connection problem", 30], ["Tool not responding", 40], ["Setup incomplete", 12]],
  mailerlite: [["Connection problem", 30], ["Tool not responding", 40], ["Setup incomplete", 10]],
  sheets: [["Connection problem", 25], ["Tool not responding", 45], ["Setup incomplete", 30]],
};

// ---------------------------------------------------------------- generation
export interface SeedData {
  contacts: Contact[];
  funnels: Funnel[];
  steps: StepDef[];
  registrations: Registration[];
  runs: StepRun[];
  connections: Connection[];
}

const HOUR_WEIGHTS: [number, number][] = [
  [8, 2], [9, 3], [10, 4], [11, 4], [12, 4], [13, 4], [14, 3], [15, 3],
  [16, 3], [17, 4], [18, 5], [19, 6], [20, 7], [21, 6], [22, 4], [23, 2],
];

function webinarSessionFor(registeredAt: number) {
  let d = startOfDay(registeredAt);
  for (let i = 0; i < 8; i++, d += DAY) {
    if (dayOfWeek(d) === 6 && d + 19 * HOUR > registeredAt) return d + 19 * HOUR;
  }
  return d;
}

function generate(): SeedData {
  const rng = makeRng(20261118);
  const today = startOfDay(MOCK_NOW);
  const firstDay = today - 13 * DAY;
  const windowStart = today - DAY + 18 * HOUR + 10 * MIN; // incident: yesterday 6:10 PM
  const windowEnd = windowStart + 30 * MIN; // 6:40 PM
  const inIncident = (t: number) => t >= windowStart && t < windowEnd;

  // ---- name pool (unique combos)
  const combos: [string, string][] = [];
  for (const f of FIRST_NAMES) for (const l of LAST_NAMES) combos.push([f, l]);
  const namePool = rng.shuffle(combos);
  let nameIdx = 0;
  const contacts: Contact[] = [];
  const newContact = (): Contact => {
    const [f, l] = namePool[nameIdx++];
    const n = contacts.length + 1;
    const domain = rng.weighted<string>([["gmail.com", 70], ["yahoo.in", 12], ["outlook.com", 10], ["hotmail.com", 4], ["rediffmail.com", 4]]);
    const handle = `${f}.${l}`.toLowerCase().replace(/[^a-z.]/g, "");
    const num = String(rng.int(6, 9)) + String(rng.int(0, 99999999)).padStart(8, "0");
    return {
      id: `c${String(n).padStart(4, "0")}`,
      name: `${f} ${l}`,
      phone: `+91 ${num.slice(0, 5)} ${num.slice(5)}`,
      email: `${handle}${rng.next() < 0.5 ? rng.int(1, 99) : ""}@${domain}`,
      city: rng.pick(CITIES),
    };
  };

  // ---- registration timestamps
  const regTimes = (day: number, count: number, until: number) => {
    const out: number[] = [];
    while (out.length < count) {
      const h = rng.weighted(HOUR_WEIGHTS);
      const t = day + h * HOUR + rng.int(0, 3599) * 1000;
      if (t < until - 2 * MIN) out.push(t);
    }
    return out.sort((a, b) => a - b);
  };

  const registrations: Registration[] = [];
  const regByContactFunnel = new Set<string>();
  const addReg = (contactId: string, funnelId: string, registeredAt: number, sessionAt: number) => {
    registrations.push({ id: `reg${String(registrations.length + 1).padStart(4, "0")}`, contactId, funnelId, registeredAt, sessionAt });
    regByContactFunnel.add(`${contactId}|${funnelId}`);
  };

  // webinar registrations: ~one new contact each
  const webinarTimes: number[] = [];
  for (let i = 0; i < 14; i++) {
    const day = firstDay + i * DAY;
    const isToday = i === 13;
    webinarTimes.push(...regTimes(day, isToday ? rng.int(14, 20) : rng.int(42, 66), isToday ? MOCK_NOW : day + DAY));
  }
  const webinarContacts: Contact[] = [];
  for (const t of webinarTimes) {
    const c = newContact();
    contacts.push(c);
    webinarContacts.push(c);
    addReg(c.id, WEBINAR_ID, t, webinarSessionFor(t));
  }
  const regTimeOf = new Map(registrations.map((r) => [r.contactId, r.registeredAt]));

  // ---- 1:1 call bookings
  const slotOk = (s: number) =>
    !inIncident(s - 24 * HOUR) && !inIncident(s - HOUR) && !inIncident(s - 10 * MIN);
  const snapSlot = (candidate: number, minStart: number) => {
    for (let tries = 0; tries < 50; tries++) {
      const day = startOfDay(candidate) + (tries > 20 ? DAY : 0);
      const s = day + rng.int(10, 19) * HOUR + (rng.next() < 0.5 ? 0 : 30 * MIN);
      if (s >= minStart && slotOk(s) && dayOfWeek(s) !== 0) return s;
    }
    return startOfDay(candidate) + DAY + 11 * HOUR;
  };
  const pickCallContact = (registeredAt: number): Contact => {
    if (rng.next() < 0.7) {
      const eligible = webinarContacts.filter(
        (c) => (regTimeOf.get(c.id) ?? Infinity) < registeredAt && !regByContactFunnel.has(`${c.id}|${CALL_ID}`),
      );
      if (eligible.length) return rng.pick(eligible);
    }
    const c = newContact();
    contacts.push(c);
    return c;
  };
  for (let i = 0; i < 13; i++) {
    const day = firstDay + i * DAY;
    for (const t of regTimes(day, rng.int(8, 13), day + DAY)) {
      const c = pickCallContact(t);
      const sameDay = rng.next() < 0.12;
      const slot = sameDay
        ? snapSlot(t + 3 * HOUR, t + 90 * MIN)
        : snapSlot(t + rng.int(26, 120) * HOUR, t + 25 * HOUR);
      addReg(c.id, CALL_ID, t, slot);
    }
  }
  for (const t of regTimes(today, rng.int(3, 5), MOCK_NOW)) {
    const c = pickCallContact(t);
    addReg(c.id, CALL_ID, t, snapSlot(t + rng.int(26, 100) * HOUR, t + 25 * HOUR));
  }

  // ---- incident bookings: 47 reminders land in yesterday 6:10–6:40 PM
  const incidentRuns = new Map<string, { reg: Registration; key: StepKey; at: number }>();
  const used = new Set<string>();
  for (let i = 0; i < 47; i++) {
    const kind = (["r24", "r1", "r10"] as const)[i % 3];
    const at = windowStart + Math.floor((i * 30 * MIN) / 47) + rng.int(0, 20) * 1000;
    const slot = at + (kind === "r24" ? 24 * HOUR : kind === "r1" ? HOUR : 10 * MIN);
    const registeredAt = at - rng.int(27, 70) * HOUR;
    const eligible = webinarContacts.filter(
      (c) =>
        (regTimeOf.get(c.id) ?? Infinity) < registeredAt &&
        !regByContactFunnel.has(`${c.id}|${CALL_ID}`) &&
        !used.has(c.id),
    );
    const c = eligible.length ? rng.pick(eligible) : (() => { const n = newContact(); contacts.push(n); return n; })();
    used.add(c.id);
    addReg(c.id, CALL_ID, registeredAt, slot);
    const reg = registrations[registrations.length - 1];
    incidentRuns.set(`${reg.id}|${kind}`, { reg, key: kind, at });
  }

  // ---- bad contact data (consistent with "Invalid contact data" failures)
  const early = webinarContacts.slice(0, 260);
  const badPhone = new Set(rng.shuffle(early).slice(0, 8).map((c) => c.id));
  const badEmail = new Set(rng.shuffle(early).filter((c) => !badPhone.has(c.id)).slice(0, 5).map((c) => c.id));
  const badPhones = ["+91 98123 4567", "+91 12345 67890", "+91 9876 54321", "+91 70000 123", "+91 00000 00000", "+91 91234 5678", "+91 8888 88888", "+91 99999 9999"];
  const badEmails = (n: string) => `${n.toLowerCase().replace(/[^a-z]/g, ".")}@gmailcom`;
  let bp = 0;
  for (const c of contacts) {
    if (badPhone.has(c.id)) c.phone = badPhones[bp++ % badPhones.length];
    if (badEmail.has(c.id)) c.email = badEmails(c.name);
  }

  // ---- steps
  const steps: StepDef[] = FUNNELS.flatMap((f) => buildStepDefs(f.id, f.kind, f.name));

  // ---- runs
  const runs: StepRun[] = [];
  const offset = (key: StepKey, f: Funnel): number => {
    switch (key) {
      case "confirm": return 8_000;
      case "row": return 2_000;
      case "group": return 4_000;
      case "r24": return -24 * HOUR;
      case "r1": return -HOUR;
      case "r10": return -10 * MIN;
      case "replay": return f.kind === "webinar" ? 2 * HOUR : HOUR;
    }
  };
  const winStart = firstDay;
  for (const reg of registrations) {
    const f = FUNNELS.find((x) => x.id === reg.funnelId)!;
    for (const key of STEP_ORDER) {
      const immediate = key === "confirm" || key === "row" || key === "group";
      const inc = incidentRuns.get(`${reg.id}|${key}`);
      const planned = inc ? inc.at : immediate ? reg.registeredAt + offset(key, f) : reg.sessionAt + offset(key, f);
      if (planned < winStart) continue;
      const run: StepRun = {
        id: "",
        registrationId: reg.id,
        contactId: reg.contactId,
        funnelId: reg.funnelId,
        stepId: `${f.id}:${key}`,
        stepKey: key,
        status: "sent",
        plannedAt: planned,
        attempts: [],
      };
      if (!immediate && !inc && reg.registeredAt > planned && key !== "replay") {
        run.status = "skipped";
        run.note = "Registered after the reminder time";
      } else if (planned > MOCK_NOW) {
        run.status = "scheduled";
      } else {
        run.actualAt = planned + rng.int(1, 30) * 1000;
        if (!inc && !immediate && key !== "replay" && rng.next() < 0.004) {
          run.status = "expired";
          run.actualAt = undefined;
          run.note = "Not run within its send window";
        } else {
          run.attempts.push({ at: run.actualAt, result: "sent" });
        }
      }
      runs.push(run);
    }
  }
  runs.sort((a, b) => a.plannedAt - b.plannedAt || a.registrationId.localeCompare(b.registrationId));
  runs.forEach((r, i) => (r.id = `run_${String(i + 1).padStart(5, "0")}`));

  // ---- failures
  const toolOf = (r: StepRun) => STEP_TOOL[r.stepKey] as "aisensy" | "mailerlite" | "sheets";
  const fail = (r: StepRun, category: Category, error: string, retries: number) => {
    r.status = "failed";
    r.category = category;
    r.rawError = error;
    const at0 = r.actualAt ?? r.plannedAt;
    r.actualAt = at0;
    const gaps = [0, 5 * MIN, 15 * MIN];
    r.attempts = Array.from({ length: 1 + retries }, (_, i) => ({
      at: at0 + gaps[i],
      result: "failed" as const,
      error,
      category,
    }));
  };
  const isExecutedSent = (r: StepRun) => r.status === "sent";
  const failedIds = new Set<string>();

  // 1) incident
  const regById = new Map(registrations.map((r) => [r.id, r]));
  for (const r of runs) {
    if (incidentRuns.has(`${r.registrationId}|${r.stepKey}`) && r.funnelId === CALL_ID) {
      const inc = incidentRuns.get(`${r.registrationId}|${r.stepKey}`)!;
      if (inc.at === r.plannedAt && regById.get(r.registrationId) === inc.reg) {
        fail(r, "Limit or balance reached", "AiSensy 402: Insufficient wallet balance", 2);
        failedIds.add(r.id);
      }
    }
  }
  // 2) bad data
  for (const r of runs) {
    if (!isExecutedSent(r)) continue;
    if (badPhone.has(r.contactId) && STEP_TOOL[r.stepKey] === "aisensy") {
      fail(r, "Invalid contact data", ERRORS.aisensy["Invalid contact data"]![0], 0);
      failedIds.add(r.id);
    } else if (badEmail.has(r.contactId) && r.stepKey === "group") {
      fail(r, "Invalid contact data", ERRORS.mailerlite["Invalid contact data"]![0], 0);
      failedIds.add(r.id);
    }
  }
  // 3) template cluster: first replay messages after the 14 Nov webinar
  const replayAfterSat = runs.filter(
    (r) => r.funnelId === WEBINAR_ID && r.stepKey === "replay" && isExecutedSent(r) && !failedIds.has(r.id),
  );
  const lastSession = Math.max(...replayAfterSat.map((r) => r.plannedAt));
  for (const r of replayAfterSat.filter((r) => r.plannedAt === lastSession).slice(0, 11)) {
    fail(r, "Template not approved", ERRORS.aisensy["Template not approved"]![0], 0);
    failedIds.add(r.id);
  }
  // 4) random remainder, calibrated so ~96% of executed steps are "sent"
  const executed = runs.filter((r) => r.status === "sent" || r.status === "failed").length;
  const target = Math.round(executed * 0.04);
  const need = Math.max(0, target - failedIds.size);
  const pool = rng.shuffle(runs.filter((r) => isExecutedSent(r) && !failedIds.has(r.id)));
  for (const r of pool.slice(0, need)) {
    const tool = toolOf(r);
    const cat = rng.weighted(RANDOM_CATEGORY_WEIGHTS[tool]);
    const retries = cat === "Setup incomplete" ? 0 : rng.int(0, 2);
    const campaign = `${r.funnelId === WEBINAR_ID ? "webinar" : "call"}_${r.stepKey}`;
    fail(r, cat, rng.pick(ERRORS[tool][cat]!).replace("{campaign}", campaign), retries);
  }

  // ---- connections
  const connections: Connection[] = [
    { id: "aisensy", name: "AiSensy", description: "WhatsApp confirmations and reminders", status: "connected", lastCheckedAt: MOCK_NOW - 22 * MIN },
    { id: "mailerlite", name: "MailerLite", description: "Email list and groups", status: "connected", lastCheckedAt: MOCK_NOW - 22 * MIN },
    { id: "sheets", name: "Google Sheets", description: "Registration rows", status: "connected", lastCheckedAt: MOCK_NOW - 22 * MIN },
    { id: "webhook", name: "Webhook", description: "Incoming registrations from your landing page", status: "connected", lastCheckedAt: MOCK_NOW - 3 * MIN },
  ];

  return { contacts, funnels: FUNNELS.map((f) => ({ ...f })), steps, registrations, runs, connections };
}

let cached: SeedData | null = null;
export function getSeed(): SeedData {
  return (cached ??= generate());
}
