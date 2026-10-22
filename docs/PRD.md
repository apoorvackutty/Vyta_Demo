# Vyta Care Demo: Product Requirements (PRD)

Version 0.2 · 23 Oct 2026 · Owner: GigaRev
Audience: Brett and the Vyta team, Wednesday 28 Oct 2026

## 1. What this is

A clickable demo of the Vyta Care app, with the staff workspace and the member app side by side. One fictional member, **Testelle M**, moves through a real Vyta day so Brett can see how the clinic runs on the app: who does what, where approvals sit, and what the member sees.

Brett asked for this on 14 Oct: *"mock a true patient day in flow… role-play the scenarios… with seed data."*

**This is a demo, not production.** All data is hardcoded and fictional. There's no real login, no database, no AI calls and no integrations. If Brett approves it, production gets its own TRD covering HIPAA, BAAs, hosting and Tab's engine.

## 2. Goals

1. Brett can play out a member's journey from discovery call to "she leaves with her report", switching between staff and member views, with no dead ends.
2. Every approval and decision in the workflow is visible and clickable, including what happens when something is sent back.
3. Staff screens come first. The clinician view is the strongest part of the demo.
4. It looks and reads like a finished Vyta product: the real brand, sensible numbers and no filler.

## 3. Out of scope

- Real auth, database, PHI, HIPAA controls, audit storage
- Real AI. Draft generation and SAGE are scripted.
- Integrations (shown as a button labelled "connects later"): Malla, Fullscript, pharmacies, labs, calendars, Apple Health, payments, dialer
- Leads pipeline, referrals, community, events, challenges, gamification, membership
- Renewal flow (one screen at most), reporting and inventory
- Native apps. The member view is a phone-width web view.
- Existing-member migration

## 4. Roles

| Role | Device in demo | Job |
|---|---|---|
| Member | Phone frame | Always knows what's next and can see she's making progress |
| Guide | Desktop | Keeps every member moving; nobody slips through |
| Medical Assistant (MA) | Desktop or tablet | Captures every test result correctly, first time |
| Nurse Practitioner (NP) | Desktop | Makes every clinical decision quickly and safely |
| Coach | Desktop | Makes the plan feel personal; checks the wording |
| Admin | Desktop | Sees everything; manages protocols, forms and SAGE |
| SAGE | Inside the member app | Explains her report; never advises; escalates concerns |

The roles stay separate for now, as agreed with Vyta, although some may merge later. In the demo a role switcher replaces login. Admin sees every queue. Everyone else sees only their own.

## 5. Scope and depth

| Phase | Depth |
|---|---|
| 1. Join (from discovery call) | Full |
| 2. Intake and labs | Full, including NP pre-review and Coach wording review |
| 3. Your Vyta Day | Full: MA stations, completeness, NP final review, results conversation, release, orders |
| 4–5. First 30 days, ongoing, quarterly | Light: weekly check-in, insights, milestones, quarterly delta review |
| 6. Renewal | Not built |
| Safety (throughout) | Full: one SAGE escalation, end to end |

## 6. User stories and acceptance criteria

Each story maps to screen IDs in SCREENS.md.

### Phase 1: Join

**J1. The Guide moves a member from consult to intake in one step** (G4).
After the discovery call and payment, the Guide opens Onboard, records goals and milestones with her, then presses **"Send intake and book blood draw"**. On 14 Oct Tiff said intake and blood draw happen at the same time.
- AC: one action sends the 3 onboarding consents and the intake form, and books the blood draw.
- AC: the member moves to "Intake and labs".
- AC: the member app shows a first-steps checklist.

**J2. The member sees one clear list of first steps** (M1).
- AC: the checklist covers consents (3), intake, blood draw (date and prep) and Your Vyta Day (date to be set), with an "x of 4 done" progress bar.

**J3. Goals become milestones** (G4, M2).
Brett wants milestones for each stage and a progress bar ("if she finishes the year and hits none of them, we failed").
- AC: 3–6 milestones are set at onboarding from her goals. They appear on the member's home screen and the staff member record, and get re-scored at each quarterly review.

### Phase 2: Intake and labs

**I1. The member signs consents on her phone** (M3).
- AC: each consent opens full text with a typed-name signature, and is stamped with time and version. The member record shows forms done and outstanding.

**I2. The member completes intake in 7 short sections, and can save and come back** (M4).
- AC: there's a progress bar for each section, and answers are kept on return.
- AC: safety questions (section 7) that come back positive raise a safety flag.

**I3. The member gets blood-draw prep** (M5).
- AC: the prep card shows fasting and what to hold, with copy marked [CLINIC TO CONFIRM].
- AC: there's a reminder 3 days before and the day before.

**I4. The Guide sees stalled steps and records why** (G1, G3).
- AC: the queue shows "Intake 40% · 3 days". The Guide can Nudge (in-app), Call (logged) or Snooze with a reason and follow-up date ("on antibiotics, retry 3 Nov"). The item reappears on that date. This was Nicolette's request on 14 Oct.

**I5. Labs come in and the draft builds** (MA2, N2).
- AC: the MA marks labs received. A short "Building draft HEAL plan" state runs, then an NP pre-review task appears.
- AC: the draft starts from the clinic's standard protocol.

**I6. The NP pre-reviews the draft** (N2). This is the centrepiece.
- Out-of-range results first, each with its source one click away.
- Every flagged finding needs a decision: Treat / Refer / Monitor / Dismiss.
- Plan items come in pre-filled from the protocol (Brett: "force the protocol, they delete what they don't want").
- For each item:
  - change the dose, form or application, or route from a dropdown
  - enter a custom dose ("Other")
  - add a side note, e.g. an allergy
  - remove the item
- Items marked "* proposed, needs clinician review" or "† incomplete instruction" can't be approved until resolved.
- Approve, or **Send back with reason**.
- AC: approval records name, time and version, and a Coach task appears.

**I7. The Coach reviews the wording** (C1).
- AC: the Coach edits member-facing text only and can Approve or **Send back to NP – clinical change**. Approval sets the draft to "Ready for Your Vyta Day".

**I8. The member always knows where things stand** (M6).
- AC: her status tracker reads Labs received → Report being prepared → Ready for your visit, along with the visit date.

### Phase 3: Your Vyta Day

**V1. Staff see today's visits and which tests each member needs** (G5, MA1).

**V2. The MA enters results in clinic order** (MA3).
InBody → Functional tests → ShapeScale → VO2 max.
- InBody, ShapeScale and VO2 use "upload report", which fills in sample values for checking.
- Functional tests use entry fields.
- AC: result bands apply the moment a value is entered.
- AC: each test has **Skip with reason**, and a skipped test is left out of her score instead of counting as zero (Brett: "Wendy… we didn't want to affect her score").
- AC: each finished station appears in the NP's review straight away.

**V3. The NP reviews sections as they arrive** (N3), while VO2 runs.

**V4. Completeness check** (MA3 footer).
- AC: every test is either in or skipped with a reason. The owner shows as "MA or NP (to confirm)".

**V5. The member's wait is used well** (M7).
- AC: the member app shows "While we finalise your report: 20 min with your coach on your goals."

**V6. The NP's final review shows only what changed since the pre-review** (N3).
- AC: a diff view; she can correct a score or leave a test out.

**V7. Results conversation** (N4).
- AC: present mode is a clean, member-facing view.
- AC: the NP records her choices (e.g. "declined testosterone, not ready").
- AC: plan items that need consent (testosterone use, peptides not FDA-approved) **push a consent to her phone** with one tap (Nicolette: "send it to their phone right now"). The member signs on M3.

**V8. Approve and release** (N5).
- AC: release is blocked until completeness passes, every finding has a decision and every pushed consent is signed.
- AC: release publishes that exact version to the member app instantly.
- AC: "Not ready" goes back to final review.

**V9. Orders checklist** (N6). Nicolette wants "items that stay red until I clear them".
- AC: approving the plan creates one order line per item (compounding pharmacy, retail pharmacy, Fullscript, peptide supplier). Each stays red until marked placed and shows on the NP's queue until done.

**V10. She leaves with her report** (M8, M9).
- AC: Top 3 focus areas first, the full report one tap away, and her plan showing "Approved by Dana Reyes, NP, 28 Oct" (fictional staff names only; see SAMPLE_DATA.md).

**V11. Next-day check-in call** appears in the Guide's queue for tomorrow (G1).

### Safety (throughout)

**S1. SAGE escalation, end to end** (M10, G6, N7).
- The member asks SAGE something it must not answer (e.g. "I've had chest tightness since the new dose, should I stop it?").
- SAGE says it's an AI, doesn't advise, says her care team has been told and when to expect a reply, and shows "Not for emergencies: call 911".
- AC: a safety flag goes to the top of the Guide and NP queues and stays there until closed.
- AC: the Guide reads the chat and chooses Call, Message or Escalate to NP, then records the outcome and closes the flag.

**S2. Every SAGE chat is visible to staff** (G6). Brett: "every chat… we see it, and it calls out if there's a concern."

### Phases 4–5 (light)

**O1. Weekly check-in** (M11): 1-tap sliders for energy, sleep, mood and stress, plus "kept to my plan?"

**O2. Insights** (M12, G1).
- The member sees trend notes written from templates ("Energy up 3 weeks in a row").
- The Guide sees engagement signals and trend flags.

**O3. Quarterly review** (N8, M13).
- The NP sees the delta report (baseline vs now), re-scores milestones, approves and releases.
- The member sees "What changed since April".

**O4. SAGE reply-time cover** (M10).
- If the Guide hasn't replied within the agreed time, SAGE sends an "I've let your Guide know" holding reply right away and an update 6 hours later. Shown on one scripted message. (Tiff's request.)

## 7. Rules the demo must show

1. Nothing clinical reaches the member without NP release.
2. Every approval records who, when and which version.
3. Every gate has a send-back path, with a reason.
4. Safety flags stay on top until a person closes them.
5. SAGE always says it's an AI and never advises.
6. Use "Member" in member-facing copy and "Patient" only in clinical documents.
7. Use "VMRI", never "VRI".
8. Every KPI tile is clickable and opens its filtered list (Brett asked on 14 Oct).
9. No dropdown that hides a single sentence: short info is shown open (Brett's website feedback).
10. One illustration style everywhere: the botanical line art from the report. No stock photos.

## 8. Open items (none of these block the build)

| Item | Demo default |
|---|---|
| Completeness check owner | Shown as "MA or NP (to confirm)" |
| NP early-check timing | "Week 2 (to confirm)" |
| Insights: NP reviews each one, or approves templates once | Templates approved once; the NP can switch any off |
| Functional test cutoffs | Illustrative and labelled; statuses as in the report |
| Blood-draw prep copy | [CLINIC TO CONFIRM] |
| 4th onboarding consent | 3 onboarding consents plus treatment consents fired from the plan |

## 9. Success criteria for Wednesday

- Brett gets through the demo script (BUILD_PLAN.md) without a dead end or a crash.
- Every screen marked **Must** in SCREENS.md works.
- An action in one role shows up in the others (e.g. NP release → member app updates).
- A "Reset demo" button returns everything to the start.
