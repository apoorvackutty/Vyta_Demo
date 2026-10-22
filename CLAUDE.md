# CLAUDE.md: Vyta Care Demo

You are building a **clickable demo** of the Vyta Care app (a menopause clinic in Salt Lake City): a staff workspace plus a member phone app, driven by hardcoded fictional data. Demo for Brett on Wed 28 Oct 2026.

## Read first, in this order
1. `docs/PRD.md`: what and why, stories and acceptance criteria
2. `docs/SCREENS.md`: every screen, its contents and actions (screen IDs: S1, G4, N2, M8 …)
3. `docs/SCHEMA.md`: types (copy into `src/types.ts`), derived queues, guards
4. `docs/SAMPLE_DATA.md`: the seed data
5. `docs/BRAND_UI.md`: tokens, components, copy rules
6. `docs/TRD.md`: stack, structure, routing, simulations, Railway
7. `docs/APP_FLOW.md`: the workflow
8. `docs/BUILD_PLAN.md`: build order and demo script
9. `docs/source-*`: raw content (intake questions, consent text, synthetic VHA report text). Use them for copy.

## How to work
- **One screen or feature per task**, following BUILD_PLAN.md. Don't build ahead. Don't refactor unrelated files.
- Before building a screen, re-read its row in SCREENS.md and its story in PRD.md. When done, list which acceptance criteria are met.
- **Never delete a section or component to "simplify".** When asked to merge two things, keep both contents and remove only duplicates.
- Keep `npm run build` and `npm test` green after every task. Commit after every task with a clear message.
- Ask before adding a dependency not listed in TRD.md.

## Hard rules
- **Fictional data only.** Use only names from SAMPLE_DATA.md. No real patient data, ever.
- No network calls, no AI APIs, no secrets. SAGE and draft generation are scripted (TRD §4).
- Nothing clinical shows in the member app unless the report is `released`; notes show only if marked visible.
- Gates enforce guards (SCHEMA §4). A disabled Approve or Release button shows a tooltip listing what's missing.
- Every action writes a TimelineEvent and shows a toast.
- Copy: "Member" (not patient) in the UI; "VMRI", never "VRI"; gates named in plain words ("Waiting on NP pre-review"), never codes like "MG1".
- Brand tokens only, no ad-hoc hex values. Inter for UI text, Cormorant Garamond for display only.
- Accessibility: real buttons and links, labels on inputs, visible focus, 44 px touch targets in the member app, status never conveyed by colour alone.
- Nothing may crash. Each screen has an error boundary with "Reset demo".
- **Don't deploy to Railway or share a URL until Apoorva approves.**

## Commands
- `npm run dev` (local) · `npm test` (Vitest) · `npm run build` · `npm start` (serve dist on $PORT)
