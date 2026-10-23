# Build Plan and Demo Script

**Status (23 Oct):** Steps 0–1 and tasks 10–19 are done, plus task 18 (C1 Wording review, scenario 3b) on branch `vyta-day-flow`. Continue from task 20 (N3 Final review). Scenarios 5–7 are stubbed in `src/state/scenarios.ts`.

Rule from Tab's two discarded builds: **one screen or one feature per prompt, in order.** Don't ask Claude Code to "build the app". Finish a step, click through it, commit, then move on.

Timeline: Fri 23 Oct → Tue 27 Oct, with a rehearsal Tue evening. Demo Wed 28 Oct.

## Step 0: Foundation (Fri)
1. Scaffold Vite + React + TS + Tailwind + Router + Zustand. Add `serve` and the Railway scripts (TRD §6).
2. Tokens into `tailwind.config.ts` (BRAND_UI §1); fonts; copy `assets/report/*` to `public/assets/`.
3. `src/types.ts` from SCHEMA.md.
4. UI kit: Button, Card, Chip/BandChip, Tabs, Table, Dialog, Select-with-Other, Field, Slider, ProgressBar, Toast, EmptyState. Build a `/kit` page to eyeball them.
5. Shells: DemoBar (role switcher, scenario jumper, reset), StaffShell (role nav), PhoneFrame + MemberTabBar.
**Check:** `/kit` renders and contrast passes; switching roles changes the nav.

## Step 1: Data and logic (Fri)
6. `seed.ts` from SAMPLE_DATA.md (Testelle + roster + staff + forms + plan + labs).
7. `store.ts` actions: sendIntakeAndBookDraw, signForm, saveIntake, markLabsReceived, decideFinding, editPlanItem, approvePreReview, sendBack, approveWording, completeStation, skipTest, passCompleteness, recordChoice, pushConsent, release, placeOrder, raiseFlag, actOnFlag, closeFlag, snooze, submitCheckIn.
8. `guards.ts` + `queues.ts` + `scores.ts` (skipped tests excluded) with Vitest tests.
9. `scenarios.ts`: the 7 jump points.
**Check:** tests pass; each scenario loads without errors.

## Step 2: Staff core (Sat)
10. S1 Today (queue + KPI tiles, clickable) for every role.
11. S2 Members (list + Discover/Heal/Optimize/Thrive board).
12. S3 Member record: header, phase tracker, milestones, and the Overview, Timeline and Forms tabs.

## Step 3: Phase 1–2 (Sat–Sun)
13. G4 Onboard → M1 checklist (member).
14. M3 Forms to sign, M4 Intake (7 sections, save and resume), M5 Blood draw, M6 Where things are.
15. G3 Snooze/log call dialog.
16. MA2 Labs received → "Building draft" → N2 task.
17. **N2 Pre-review** (findings + plan editor + guards + send back). Budget the most time here.
18. C1 Wording review.

## Step 4: Your Vyta Day (Mon)
19. MA1 + MA3 stations (upload fill, functional entry with live bands, skip with reason, completeness).
20. N3 Final review (sections lighting up, diff, correct or exclude).
21. M7 Your Vyta Day agenda (live progress).
22. N4 Present mode + record choices + push consent → M3.
23. N5 Approve and release → M8 Report + M9 Plan.
24. N6 Orders (red until placed); G1 next-day call.

## Step 5: Safety + light ongoing (Mon–Tue)
25. M10 SAGE (script, AI banner, citations, escalation) → G6 → N7 → close.
26. S3i SAGE tab; G8 messages with a holding reply (Should).
27. M11 Check-in, M12 Insights, N8/M13 quarterly delta (Should).
28. D2 Split view (Should).

## Step 6: Polish and ship (Tue)
29. Empty states, error boundaries, focus states, phone-width pass.
30. Run the demo script three times; fix any dead end.
31. `npm run build`, Railway deploy to a private URL. **Show Apoorva before sharing.**

## Demo script (≈10 minutes, clinician first)

| # | Role | Screen | Say / do |
|---|---|---|---|
| 1 | NP | N1 Today | "This is Dana's morning. Safety first, then what's waiting on her, most urgent first." Click a KPI tile to show it filters. |
| 2 | NP | N2 Pre-review (scenario 3) | Out-of-range findings first: ferritin 8, hs-CRP 9.5, NLR 5.44. Decide each. Plan arrives pre-filled from the protocol; change estradiol from patch to cream; complete the † testosterone strength; add a side note "allergy: cottonseed oil". Try Approve: blocked with a list of what's missing. Fix the last item and approve. |
| 3 | Coach | C1 | Soften one sentence. Approve. Status becomes "Ready for Your Vyta Day". |
| 4 | Member | M6 | "Testelle sees exactly where things are." |
| 5 | MA | MA3 (scenario 4) | InBody upload fills the values. Functional: type a grip of 58 and watch the band appear. ShapeScale: **Skip – scanner offline**; "it doesn't zero her score". VO2 upload. Completeness ✓. |
| 6 | NP | N3 | Sections lit up while VO2 ran; "only what changed since pre-review". |
| 7 | Member | M7 | "While her report is finalised, she's with her coach." |
| 8 | NP | N4 Present | Results conversation. She declines tirzepatide; accepts testosterone, so **push the consent to her phone**. |
| 9 | Member | M3 | She signs it on her phone. |
| 10 | NP | N5 | Release v2. Orders appear, red until placed. |
| 11 | Member | M8/M9 | Top 3 focus areas, report and plan, "Approved by Dana Reyes, NP". She leaves with it. |
| 12 | Member → Guide | M10 → G1 → G6 | Testelle tells SAGE about chest tightness. SAGE: AI, no advice, call 911 if it's happening now, care team alerted. The Guide's queue has it pinned; she escalates; the NP closes it with an outcome. |
| 13 | Guide | G1 | "Tomorrow: the next-day call is already on Maya's list." Show Maren's stalled intake → snooze with reason. |
| 14 | Member / NP | M13 / N8 (scenario 7) | Jump to 3 months: VMRI 54→58, biological age 51→42, milestones re-scored. |

Backup: if anything breaks, the scenario jumper resumes from the next step.
