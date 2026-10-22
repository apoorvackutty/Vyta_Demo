# Vyta Care Demo

Clickable demo of the Vyta Care staff workspace and member app. All data is fictional.

## Run it
```
npm install
npm run dev        # http://localhost:5173
npm test           # flow tests
npm run build && npm start   # production build, what Railway runs
```

## What's built (through intake and blood draw)
- **Demo bar:** view as Member / Guide / MA / NP / Coach / Admin, a scenario jumper (scenarios 1–2 live), "Member side by side" (staff + Testelle's phone, live), and Reset.
- **Staff:** Today queue with clickable KPI tiles (S1) · Members list and board (S2) · Member record with phase tracker, milestones, and Overview, Timeline, Forms (send to phone), Intake and Results tabs (S3) · Onboard: goals, milestones, blood-draw slot, "Send intake and book blood draw" (G4) · Nudge, Log call, and Snooze with reason (G3) · MA: confirm draw, mark drawn, labs received.
- **Member:** welcome · Home with first-steps checklist and notifications (M1) · Goals and milestones (M2) · Sign consents (M3) · Intake in 7 sections, save and resume, with a "Demo: fill sample answers" helper (M4) · Blood draw with prep (M5) · Where things are (M6) · Plan/Report/SAGE placeholders.
- **Rules:** a safety "Yes" in intake raises a pinned flag; snoozed items return on their date; every action writes to the timeline.

## Next (docs/BUILD_PLAN.md, from task 16)
Labs received → draft build → **N2 NP pre-review** → C1 Coach wording → Your Vyta Day.

## Docs
Start with `CLAUDE.md`, then `docs/`.
