"use client";
import { create } from "zustand";
import { getSeed } from "@/mock/seed";
import { Connection, Funnel, StepDef, StepRun, ToolId, Registration, Contact } from "@/mock/types";
import { MIN, MOCK_NOW } from "./time";

const seed = getSeed();
export const contactsById = new Map<string, Contact>(seed.contacts.map((c) => [c.id, c]));
export const registrationsById = new Map<string, Registration>(seed.registrations.map((r) => [r.id, r]));
export const allContacts = seed.contacts;
export const allRegistrations = seed.registrations;

let bootReal: number | null = null;
/** Mock "current time": starts at the fixed demo time and advances with real elapsed time. */
export function mockNow() {
  if (bootReal === null) bootReal = Date.now();
  return MOCK_NOW + 2 * MIN + (Date.now() - bootReal);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface State {
  funnels: Funnel[];
  steps: StepDef[];
  runs: StepRun[];
  connections: Connection[];
  retrying: Record<string, true>;
  testing: Partial<Record<ToolId, true>>;
  alerts: { disconnect: boolean; daily: boolean };

  retry: (ids: string[]) => Promise<number>;
  setFunnelStatus: (id: string, status: "live" | "paused") => void;
  toggleStep: (stepId: string) => void;
  editStep: (stepId: string, preview: string) => void;
  testConnection: (id: ToolId) => Promise<boolean>;
  setConnectionStatus: (id: ToolId, status: "connected" | "disconnected") => void;
  setAlert: (key: "disconnect" | "daily", value: boolean) => void;
  addFunnel: (f: Funnel, steps: StepDef[]) => void;
  addStep: (step: StepDef) => void;
  removeStep: (stepId: string) => void;
}

export const useStore = create<State>((set, get) => ({
  funnels: seed.funnels,
  steps: seed.steps,
  runs: seed.runs,
  connections: seed.connections,
  retrying: {},
  testing: {},
  alerts: { disconnect: true, daily: false },

  retry: async (ids) => {
    const target = ids.filter((id) => get().runs.find((r) => r.id === id)?.status === "failed");
    if (!target.length) return 0;
    set((s) => ({ retrying: { ...s.retrying, ...Object.fromEntries(target.map((id) => [id, true as const])) } }));
    await sleep(900 + Math.min(target.length, 300) * 4);
    const at = mockNow();
    const set_ = new Set(target);
    set((s) => {
      const retrying = { ...s.retrying };
      target.forEach((id) => delete retrying[id]);
      return {
        retrying,
        runs: s.runs.map((r) =>
          set_.has(r.id)
            ? {
                ...r,
                status: "sent" as const,
                actualAt: at,
                category: undefined,
                rawError: undefined,
                attempts: [...r.attempts, { at, result: "sent" as const }],
              }
            : r,
        ),
      };
    });
    return target.length;
  },

  setFunnelStatus: (id, status) => set((s) => ({ funnels: s.funnels.map((f) => (f.id === id ? { ...f, status } : f)) })),

  toggleStep: (stepId) =>
    set((s) => {
      const step = s.steps.find((x) => x.id === stepId);
      if (!step) return s;
      const enabled = !step.enabled;
      return {
        steps: s.steps.map((x) => (x.id === stepId ? { ...x, enabled } : x)),
        runs: s.runs.map((r) => {
          if (r.stepId !== stepId) return r;
          if (!enabled && r.status === "scheduled") return { ...r, status: "skipped" as const, note: "Step turned off" };
          if (enabled && r.status === "skipped" && r.note === "Step turned off") return { ...r, status: "scheduled" as const, note: undefined };
          return r;
        }),
      };
    }),

  editStep: (stepId, preview) => set((s) => ({ steps: s.steps.map((x) => (x.id === stepId ? { ...x, preview } : x)) })),

  testConnection: async (id) => {
    set((s) => ({ testing: { ...s.testing, [id]: true } }));
    await sleep(1100);
    const ok = get().connections.find((c) => c.id === id)?.status === "connected";
    set((s) => {
      const testing = { ...s.testing };
      delete testing[id];
      return {
        testing,
        connections: s.connections.map((c) => (c.id === id ? { ...c, lastCheckedAt: mockNow() } : c)),
      };
    });
    return ok;
  },

  setConnectionStatus: (id, status) =>
    set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, status, lastCheckedAt: mockNow() } : c)) })),

  setAlert: (key, value) => set((s) => ({ alerts: { ...s.alerts, [key]: value } })),

  addStep: (step) => set((s) => ({ steps: [...s.steps, step] })),
  removeStep: (stepId) => set((s) => ({ steps: s.steps.filter((x) => x.id !== stepId) })),

  addFunnel: (f, steps) => set((s) => ({ funnels: [...s.funnels, f], steps: [...s.steps, ...steps] })),
}));
