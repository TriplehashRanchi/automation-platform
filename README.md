# FlowPilot — clickable demo

Frontend-only demo of **FlowPilot**, an automation tool for Indian digital coaches.
The pitch is *visibility and control*: simple reports, step-level logs, and retrying what failed.
All data is mocked and lives in memory — refreshing the page resets everything.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Recharts · Zustand

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
# or a production build:
npm run build && npm start
```

Requires Node 20+. No env vars, database or auth.

## Demo click path (≈ 90 seconds)

1. **Overview** — 4 KPIs (903 registrations, 5,048 sent, 210 failed, 96.0%), the 14-day sent/failed chart, failed steps by category.
2. Click **Limit or balance reached (47)** → lands on **Run logs**, pre-filtered to `status=failed` + that category. All 47 failures sit between 6:10–6:40 PM yesterday.
3. Click any row → **Log detail** drawer: planned vs actual time, category + raw error (`AiSensy 402: Insufficient wallet balance`), this contact's other steps (failed one highlighted), attempts, and the Incoming / Sent to tool / Tool response snapshot (API keys masked).
4. Close the drawer → **Retry all failed (47)** → confirm. Rows spin, then turn `sent`.
5. Click **Overview** in the sidebar (client-side nav keeps the state): failed drops 210 → 163, success rate rises, the category group is gone.

Also worth a click: **Funnels → Instagram Growth Masterclass** (step timeline, toggle a step, click one to edit its message, Pause/Resume, sessions table), **Contacts → a contact** (step history), **Connections → Test connection**, **Funnels → New funnel** (wizard → Go live → appears on Overview), **Alerts**.

> Use the sidebar / in-app links to navigate. A browser refresh or typing a URL reloads the page and resets the in-memory state back to the seed.

## Rules the demo follows

- Every number is a plain **count, sum or percentage of step-run records** — no insights, trends, predictions, health scores or generated sentences.
- Success rate = `sent ÷ (sent + failed)`. Skipped, expired and scheduled runs are not in the denominator.
- Failures show one of 6 fixed category labels plus the **raw error string** returned by the tool. Nothing else.
- No attendance or revenue numbers.
- Steps are attributed to the day they were **due** (planned time), so a retried step stays on its original day and simply moves from failed to sent. The Run logs "Time" column is the planned time.
- Anything not built (Duplicate funnel, Import contacts, Switch account, Manage connection) shows a **"Coming soon"** toast.

## Mock data (`src/mock/`)

Deterministic (seeded PRNG, fixed "now" of **18 Nov 2026, 12:45 PM IST**), so server and client always agree and totals match across screens.

| | |
|---|---|
| Account | Harmeet Kelley Coaching |
| Funnels | Instagram Growth Masterclass (Saturdays 7 PM) · 1:1 Strategy Call |
| Steps / funnel | Confirmation WhatsApp (AiSensy) · Add row (Google Sheets) · Add to group (MailerLite) · 24h / 1h / 10-min reminders (AiSensy) · Replay message (AiSensy; "Follow-up message" for 1:1) |
| Volume | ~760 contacts, 903 registrations, 6,318 step runs over 14 days (+ upcoming scheduled) |
| Statuses | sent 5,048 · failed 210 · scheduled 928 · skipped 122 · expired 10 (≈96.0% success) |
| Incident | Yesterday 6:10–6:40 PM: 47 reminders failed with *Limit or balance reached* |
| Other failures | Invalid contact data comes from contacts with genuinely malformed phones/emails (visible on their contact page); *Template not approved* is a cluster of 11 replay messages; the rest are spread across Connection problem / Tool not responding / Setup incomplete |

Snapshots (incoming webhook JSON, data sent to the tool, tool response) are derived deterministically from each run (`src/mock/snapshot.ts`); keys/tokens are masked (`Bearer ••••••••9f2a`).

## Notes / simplifications

- **Retry always succeeds** (per the spec: spinner → `sent`). In a real system, e.g. an invalid phone number would fail again.
- Retry timestamps use a mock clock that starts at the fixed demo time and advances in real time.
- Run logs are paginated (50/page). Checkboxes are only enabled on failed rows; **Retry all failed** acts on every failed run matching the current filters (with a confirm step).
- Filters, date range and the open log drawer live in the URL (`/runs?funnel=…&status=failed&category=…&run=run_00123`), so views are linkable. The drawer opens from any page via `?run=`.
- Turning a step off marks its *scheduled* runs `skipped` ("Step turned off"); turning it back on restores them.
- `next.config.mjs` keeps the scaffold's `cacheComponents`; client hooks that read the URL are wrapped in `<Suspense>` as that mode requires.

## Layout

```
src/app/            routes: / · /runs · /funnels · /funnels/[id] · /funnels/new · /contacts · /contacts/[id] · /connections · /alerts
src/components/     screens + shared UI (ui/ = shadcn)
src/lib/            store (Zustand), stats (all counts/percentages), time (IST), csv, url-state
src/mock/           seed generator, types, snapshots
```
