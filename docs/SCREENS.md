# Screen Inventory and Navigation

Each screen has an ID, the role(s) that see it, its purpose, what's on it, its actions, and where those actions lead.
Priority: **Must** (Wednesday), **Should** (if time allows), **Later** (not built; an inert nav item or nothing).

## 0. Demo shell (all roles)

| ID | Screen | Must/Should | Contents |
|---|---|---|---|
| D1 | Demo bar (top, thin, dark) | Must | Role switcher (Member, Guide, MA, NP, Coach, Admin) · Scenario jumper (see below) · Reset demo · Text "Demo · fictional data". |
| D2 | Split view toggle | Should | Staff screen left, member phone frame right, so Brett sees cause and effect live. |

**Scenario jumper** loads a saved state so the presenter can start at any point:
1. Day 0 – after discovery call
2. Intake in progress (stalled)
3. Labs back – draft ready for NP
4. Your Vyta Day – morning
5. After release – member home
6. Safety flag raised
7. 3-month review

Actions always change the live state. The jumper only resets to a starting point.

## 1. Staff shell (Guide, MA, NP, Coach, Admin)

The left nav is role-specific; the top bar has a member search and a "Today" date. Desktop first, minimum 1280 px wide, and usable down to 1024.

Shared nav items: **Today** (queue) · **Members** · **Calendar** (Should) · **Messages** (Should) · role extras.

### Shared staff screens

| ID | Screen | Roles | P | Purpose / contents | Actions → leads to |
|---|---|---|---|---|---|
| S1 | Today (queue) | All staff | Must | KPI tiles across the top (clickable, filter the list below). Then one list ordered: **Safety flags** (pinned, red-orange band) → overdue → due today → upcoming. Each row: member, what's waiting, why, owner, age, primary action button. | Row → its task screen. Tile → filtered list. |
| S2 | Members | All staff | Must | List / board toggle. Board columns: Discover · Heal · Optimize · Thrive. Filters: phase, owner, peri/post, flags. Columns: name, phase, step, waiting on, owner, last contact, flags. | Row → S3. |
| S3 | Member record | All staff (content varies by role) | Must | **Header**: name, age, peri/post, phase + step tracker (Join → Intake & labs → Your Vyta Day → First 30 days → Ongoing → Renewal), "Waiting on: X · Owner: Y", safety flag chip. **Milestones bar** (x of 6 on track). **Tabs**: Overview · Timeline · Forms · Intake · Results · Report & plan · Notes · Orders · SAGE. | Tabs; actions inside each tab. |
| S3a | Overview tab | All | Must | Next action card, goals and milestones, current plan summary, last check-in, open items. | |
| S3b | Timeline tab | All | Must | Every event with who/when: forms sent/signed, blood draw, approvals (with version), releases, flags, calls. This is the audit trail Brett asked for. | |
| S3c | Forms tab | Guide, NP, Admin | Must | Forms library on the right. List: form, sent, signed, version. **Send to her phone** button per form. Outstanding forms highlighted. | Send → member M3 gets it. |
| S3d | Intake tab | NP, Guide | Must | Answers by section, read-only. Flagged answers (safety, family history, allergies) pinned at top. | |
| S3e | Results tab | NP, MA | Must | Labs by panel and body tests, baseline vs current, band chips, source link. | |
| S3f | Report & plan tab | NP, Coach, Guide (read) | Must | Current version, status (Draft · Pre-reviewed · Wording checked · Released), version history. | Opens N2 / N3 / C1 depending on status and role. |
| S3g | Notes tab | NP, Coach, Guide | Must | SOAP notes (NP), session notes (Coach), call logs (Guide). Each note: **Visible to member / Internal** toggle. | |
| S3h | Orders tab | NP, MA | Must | Order lines from the approved plan; red until placed. | |
| S3i | SAGE tab | Guide, NP, Admin | Must | Full SAGE conversation history with flagged messages highlighted. | |

### Guide

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| G1 | Today | Must | S1 for Guide. Tiles: Safety flags · Overdue steps · Today's visits · Unread messages · Drifting members. Rows include "Intake 40% · 3 days", "Blood draw overdue", "Next-day call: Testelle", "Unsigned consent". | Nudge · Call (log) · Snooze with reason + date · Open |
| G3 | Snooze / log call (dialog) | Must | Reason (dropdown + text), follow-up date, outcome. | Saves to Timeline; row reappears on date. |
| G4 | Onboard member | Must | After consult: confirm details, peri/post, record goals (from her words) → pick 3–6 milestones, choose blood-draw slot, preview what she'll receive (3 consents + intake). | **Send intake and book blood draw** → member to Phase 2; M1 checklist appears. |
| G5 | Today's visits | Must | Timeline of today: who, arrival, station, MA, NP. | Open visit → MA3 (read-only for Guide). |
| G6 | Safety flag | Must | The trigger (SAGE quote / answer / check-in), member context, history of flags. | Call · Message · Escalate to NP (with note) · Close with outcome. |
| G7 | Engagement | Should | Members bucketed Engaged / Slipping / At risk with the reason (missed check-ins, scores flat). | Nudge · Call · Escalate to Coach/NP |
| G8 | Messages | Should | Member threads, reply-time clock, SAGE holding replies shown inline. | Reply |

### Medical Assistant

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| MA1 | Today | Must | Today's visits with required tests, labs awaited, blood-draw confirmations. | Start visit → MA3 |
| MA2 | Labs received | Must | Mark labs received for a member (sample PDF attached). | Triggers "Building draft" → N2 task |
| MA3 | Visit stations | Must | Stepper: **1 InBody · 2 Functional · 3 ShapeScale · 4 VO2 max**, then **Completeness**. InBody/ShapeScale/VO2: "Upload report" (fills sample values) + editable table. Functional: entry fields with units and live band chip. Each test: **Skip with reason**. Station done → "Sent to NP". | Completeness → enables N3 final review |

Functional test fields (from the VHA): Farmer carry (lb) · Single-leg balance right (sec) · Single-leg balance left (sec) · Gait speed, 30 ft (sec) · Grip strength (lb) · Sit-to-stand floor rise (No assistance / One-hand / Two-hand / Unable) · Subjective strength (Poor/Fair/Good/Excellent) · Exercise consistency (Poor/Fair/Good/Excellent).

### Nurse Practitioner

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| N1 | Today | Must | S1 for NP. Tiles: Safety/escalations · Pre-reviews · Visit reviews · Orders open · Sign-offs. | Open task |
| N2 | Pre-review (draft report + plan) | Must | Left: **Findings** — out-of-range first; each with value, band, source link, and decision buttons Treat / Refer / Monitor / Dismiss (+ note). Right: **HEAL plan editor** grouped Prescriptions · Supplements · Peptides · Nutrition · Exercise · Sleep. Each item row: name, status tag (New/Continued/Changed/Discontinued), dose, form/application (dropdown), route, frequency, side note, Remove. Items with **\*** (proposed) or **†** (incomplete) show amber and block approval. Footer: progress "Findings decided 6/9 · Items resolved 14/16", **Send back with reason**, **Approve pre-review**. | Approve → C1 task; Send back → "Rebuilding draft" → N2 again |
| N3 | Final review (Your Vyta Day) | Must | Sections light up as MA finishes each station. **What changed since pre-review** diff (scores, new findings). Correct a score / exclude a test (with reason). | Continue → N4 |
| N4 | Results conversation (present mode) | Must | Full-screen, member-facing: Top 3 focus areas, scores (VMRI, biological age, symptoms), plan in plain language. NP side panel: record her choices per item (Accept / Decline / Defer + reason); **Send consent to her phone** for items that need it. | → N5 |
| N5 | Approve and release | Must | Checklist: completeness ✓, all findings decided ✓, consents signed ✓, Coach wording ✓. Version number. **Release to member**. Or **Not ready** → N3. | Release → M8 updates live; orders created (N6) |
| N6 | Orders | Must | One line per item: supplier type (Compounding pharmacy / Retail pharmacy / Fullscript / Peptide supplier), item, status. Red until **Mark placed**. "Send via Fullscript — connects later" disabled. | |
| N7 | Escalation | Must | Escalated safety flag with Guide's note, member history, SAGE quote. | Reply to Guide · Call member · Order labs · Adjust plan · Close |
| N8 | Quarterly review | Should | Delta report: baseline vs now per section, milestones re-score, plan changes with reason. | Approve and release |
| N9 | Protocol sign-off | Later | | |

### Coach

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| C0 | Today | Must | Wording reviews waiting, today's sessions. | |
| C1 | Wording review | Must | Member-facing text of the draft, side by side: original / suggested. Clinical fields locked. | **Approve wording** · **Send back to NP – clinical change** (note) |
| C2 | Session prep | Should | Main concern, active flags, check-in trends, plan adherence, milestones. | Add session note (visible/internal) |

### Admin

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| A1 | Today | Must | All queues combined, grouped by role. | |
| A2 | SAGE controls | Should | Pause SAGE (global) · Withdraw a released report (with reason). | |
| A3 | Forms & protocols library | Should | Lists of forms (with versions) and protocol templates (with who approved). Read-only in demo. | |
| A4 | Clinic overview | Later | | |

## 2. Member app (phone frame, 390 × 844)

Bottom tab bar: **Home · My plan · Report · SAGE · More**. Before release, Report and My plan show status cards rather than content.

| ID | Screen | P | Contents | Actions |
|---|---|---|---|---|
| M1 | Home – first steps | Must | Greeting, phase name, "x of 4 done" bar, checklist cards: Sign consents · Complete intake · Blood draw (date + prep) · Your Vyta Day (date). | Card → its screen |
| M2 | Goals & milestones | Must | Her goals in her words; milestones with progress dots. | |
| M3 | Forms to sign | Must | Form list; form view (full text, typed-name signature, Sign). New pushed forms appear with a notification badge. | Sign → staff Forms tab updates |
| M4 | Intake | Must | 7 sections, one question per screen for long ones, grouped short ones; progress per section; Save & exit. | Finish → checklist ticks |
| M5 | Blood draw | Must | Appointment, location, prep (fasting, what to hold) [CLINIC TO CONFIRM]. | |
| M6 | Where things are | Must | Tracker: Labs received → Report being prepared → Ready for your visit; visit date; "Your care team: Guide, NP, Coach" with photos (illustrated avatars). | |
| M7 | Your Vyta Day | Must | Today's agenda: InBody · Functional · ShapeScale · VO2 · Coach session · Results with your NP. Live progress. Consent prompts appear here. | |
| M8 | Report | Must | **Top 3 focus areas** first. Score cards: VMRI (band), Biological age, Symptoms. Then sections (Next 90 days, Symptoms, Sleep, Nutrition, Exercise, Body, Bloodwork, Health stack) — each opens to plain explanations. Footer: "Approved by … · version · date". | Section → detail |
| M9 | My plan | Must | Grouped Prescriptions · Supplements · Peptides · Daily habits. Each: what, how, when, why (one line), approved by. Declined items shown as "Not started — your choice". | |
| M10 | SAGE | Must | Persistent banner: "SAGE is an AI. It explains your report; it doesn't give medical advice. Not for emergencies — call 911." Scripted conversation chips. Answers cite "From your report: Bloodwork › Iron". Escalation reply shows "Your care team has been told. Expect a reply by 2:00 pm." | |
| M11 | Weekly check-in | Should | 4 sliders + plan adherence + optional note. | |
| M12 | Insights | Should | 2–3 templated trend cards. | |
| M13 | What changed (quarterly) | Should | Baseline → now for VMRI, bio age, symptoms, milestones. | |
| M14 | Messages | Should | Thread with Guide; SAGE holding reply. | |

## 3. Navigation map (happy path)

```
G4 Onboard ──send──▶ M1 checklist ─▶ M3 consents ─▶ M4 intake ─▶ M5 blood draw
                                         │
MA2 Labs received ──▶ (build draft) ──▶ N2 Pre-review ──approve──▶ C1 Wording ──approve──▶ status: Ready
        ▲                                   │ send back                  │ clinical change
        └──────────── rebuild ◀─────────────┘◀───────────────────────────┘

Visit day: MA3 stations ─(each station)─▶ N3 sections ─▶ Completeness ─▶ N3 diff ─▶ N4 present
          M7 agenda ◀── live progress ──┘                                          │ push consent
                                                                                    ▼
                                                     M3 sign ──▶ N5 release ──▶ M8 Report + M9 Plan
                                                                       └──▶ N6 Orders (red until placed)
                                                                       └──▶ G1 next-day call

Safety: M10 SAGE ─flag─▶ G1 pinned ─▶ G6 ─escalate─▶ N7 ─close─▶ timeline
```
