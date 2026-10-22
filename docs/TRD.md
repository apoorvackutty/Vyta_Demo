# Technical Requirements (Demo)

Scope: a clickable front-end demo with hardcoded data. It is built with Claude Code and deployed on Railway.
Production requirements (HIPAA, BAAs, auth, database, LLM provider, Tab's engine) are **out of scope** and get their own TRD once the demo is approved.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Fast, simple, Claude Code knows it well |
| Styling | Tailwind CSS with design tokens from BRAND_UI.md in `tailwind.config.ts` | One source of truth for brand |
| Routing | React Router v6 | Deep links for each screen (`/staff/np/review/:memberId`) |
| State | Zustand store + `persist` to localStorage, plus a Reset that reloads the seed | Role switch shares state; survives refresh |
| Components | Hand-built from BRAND_UI.md; headless primitives from Radix UI (Dialog, Tabs, Select, Tooltip) | Accessible; no off-brand look |
| Icons | lucide-react, stroke 1.5 | Line style matches the botanical art |
| Charts | Recharts for small trend lines and before/after bars | Enough for the demo |
| Fonts | Cormorant Garamond (display) and Inter (UI) via Google Fonts | Brand book |
| Tests | Vitest for store guards and queue logic only | Guards are what matter in the demo |
| Deploy | Railway: static build served by `serve` (Node). `npm run build` → `npm start` = `serve -s dist -l $PORT` | User's choice |

No backend, no API calls and no environment secrets.

## 2. Project structure

```
vyta-demo/
  CLAUDE.md
  docs/                  # PRD, TRD, SCREENS, SCHEMA, BRAND_UI, SAMPLE_DATA, APP_FLOW, BUILD_PLAN
  public/assets/         # logo, illustrations (from assets/report)
  src/
    main.tsx  App.tsx  routes.tsx
    types.ts             # from SCHEMA.md
    data/seed.ts         # from SAMPLE_DATA.md
    data/scenarios.ts    # the 7 jump points
    data/sage-script.ts  # scripted SAGE turns
    state/store.ts       # Zustand store + actions
    state/queues.ts      # getQueue(role, now)
    state/guards.ts      # canApprovePreReview, canRelease, ...
    lib/bands.ts         # band rules per marker
    lib/scores.ts        # recompute scores excluding skipped tests
    components/ui/       # Button, Card, Chip, Table, Tabs, Dialog, Field, Slider, ProgressBar, EmptyState
    components/shell/    # DemoBar, StaffShell, PhoneFrame, MemberTabBar
    components/domain/   # QueueRow, KpiTile, PhaseTracker, MilestoneBar, BandChip, PlanItemRow, FindingRow, ConsentCard, SageBubble
    screens/staff/...    # one file per screen ID (S1, G4, N2 ...)
    screens/member/...   # M1 ... M14
```

## 3. Routing

```
/                         → redirect to /staff/guide/today
/staff/:role/today        → S1 for role
/staff/:role/members      → S2
/staff/:role/member/:id   → S3 (tabs via ?tab=)
/staff/guide/onboard/:id  → G4
/staff/guide/flag/:flagId → G6
/staff/ma/visit/:visitId  → MA3
/staff/ma/labs/:id        → MA2
/staff/np/pre-review/:id  → N2
/staff/np/final/:id       → N3
/staff/np/present/:id     → N4
/staff/np/release/:id     → N5
/staff/np/orders          → N6
/staff/np/escalation/:id  → N7
/staff/coach/wording/:id  → C1
/member/:id/...           → M1–M14 inside the PhoneFrame
/split/:id                → D2 staff left, member right
```

The role switcher keeps you on the equivalent screen where one exists; otherwise it goes to that role's Today.

## 4. Simulated behaviour

| Real thing | Demo simulation |
|---|---|
| Draft generation (Tab's engine) | 2.5 s "Building draft HEAL plan…" with 3 progress lines, then the seeded draft loads |
| Rebuild after send back | 1.5 s, then the draft version is bumped (v1 → v2) with the reason applied |
| Report upload (InBody, ShapeScale, VO2) | "Upload" fills the station with seeded values after 0.8 s |
| SAGE | Scripted turns in `sage-script.ts`; the member taps suggested questions; free text matches keywords, otherwise "I can explain your report. For anything else, I'll pass it to your care team." |
| Notifications | An in-app toast plus a badge on the member tab |
| Fullscript / pharmacy | Disabled button "Connects later" |
| Time | A fixed demo clock (Wed 28 Oct 2026, 08:30 MT); scenarios set the clock |

## 5. Non-functional

- **Performance:** every click responds within 100 ms; simulated waits only where listed above (Doherty threshold).
- **Accessibility:** WCAG 2.1 AA contrast; real `<button>`/`<a>`; visible focus rings; touch targets ≥ 44 px in the member app; never rely on colour alone (band chips carry a word).
- **Responsive:** staff 1024–1600 px; member 360–430 px inside the phone frame, and full-screen on a real phone at `/member/...`.
- **Robustness:** an error boundary per screen with a "Reset demo" link. Nothing in the demo may crash (a crash happened in the 14 Oct review).
- **Data hygiene:** fictional data only, and a footer reading "Demo · fictional data". No real patient names or real staff names anywhere.

## 6. Railway

- Service type: Node, start command `npm start`; Railway sets `PORT`.
- `package.json`: `"build": "tsc -b && vite build"`, `"start": "serve -s dist -l $PORT"`.
- Single environment, `demo`. A public URL is generated in Railway. **Don't deploy or share the URL without Apoorva's go-ahead.**
- Optional basic gate: one shared demo passcode screen, held client-side only. It's cosmetic, not security.
