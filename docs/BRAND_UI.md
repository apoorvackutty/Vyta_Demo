# Brand and UI Spec (Demo)

Source: the Vyta brand book (Deep Plum, Copper-Terracotta, Cream, Cormorant Garamond and Inter), extended into UI tokens.
Note: the VHA report uses a darker plum (#3B123A) and terracotta (#C96F58). **The demo uses the brand book values**, per Apoorva. Flag this to the client so they confirm the canonical set before production.

## 1. Tokens (put these in `tailwind.config.ts` → `theme.extend`)

### Colour

| Token | Hex | Use |
|---|---|---|
| `plum-700` (brand) | #56264D | Primary buttons, active nav, headings on light backgrounds |
| `plum-800` | #431C3C | Button hover, the staff sidebar background |
| `plum-900` | #2A1A28 | Body text ("ink") |
| `plum-100` | #F1E6EE | Selected rows, subtle highlights |
| `terracotta-500` (brand) | #C3735A | Accents, illustrations, focus ring, progress fill. **Never small text on cream** (contrast too low) |
| `terracotta-700` | #9A4F38 | Terracotta text and links on light backgrounds |
| `cream-200` (brand) | #EEE8DC | Member app background |
| `cream-100` | #F7F3EC | Staff canvas background |
| `paper` | #FFFDF9 | Cards and surfaces |
| `line` | #DED3CB | Borders and dividers |
| `muted` | #5E5260 | Secondary text (passes 4.5:1 on cream and paper) |

### Status (always paired with a word, never colour alone; blue and orange chosen so they stay distinguishable for colour-blind users)

| Status | Text | Background | Label shown |
|---|---|---|---|
| Elite / Optimal | #2F5D4E | #DDEBE4 | "Optimal", "Elite" |
| Watch | #8A5A00 | #F6E7C8 | "Watch" |
| Needs attention / below target | #9A4F38 | #F6DDD3 | "Needs attention" |
| Safety (urgent) | #8E1F2B | #F7D9DC | "Safety" + icon |
| Info / in progress | #2F5D8A | #DCE8F3 | "In progress" |
| Approval waiting (gate) | #8A5A00 | #F6E7C8 | "Waiting on NP" |
| Done / approved | #2F5D4E | #DDEBE4 | "Approved · Dana Reyes · 9:42" |
| Not retested / not scored | #5E5260 | #ECE6E2 | "Not retested" |

VMRI bands use these words and colours: Optimized 85–100 (Optimal) · Resilient 70–84 (Optimal) · Moderate burden 50–69 (Watch) · High vulnerability 30–49 (Needs attention) · Critical burden 0–29 (Safety).

### Type

| Token | Font | Size / line | Use |
|---|---|---|---|
| `display` | Cormorant Garamond 600 | 40/44 | Member screen titles, score numbers |
| `h1` | Cormorant Garamond 600 | 32/38 | Staff page titles |
| `h2` | Inter 600 | 20/28 | Section headers |
| `h3` | Inter 600 | 16/24 | Card titles |
| `body` | Inter 400 | 15/22 (staff 14/20) | Text |
| `label` | Inter 500 | 13/18 | Field labels, table headers (sentence case, not all-caps) |
| `meta` | Inter 400 | 12/16 | Timestamps, sources (min 12 px) |
| `number` | Inter 600 tabular-nums | as needed | Lab values and tables |

Use Cormorant only for display text: titles and big numbers. Everything you read in the UI is Inter.

### Space, radius, elevation

- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Radius: 8 for inputs and chips, 12 for cards, 20 for member cards, full for pills.
- Shadow: one level only, `0 1px 2px rgba(42,26,40,.06), 0 4px 12px rgba(42,26,40,.06)`. No heavy shadows.
- Staff density: table rows 44 px, cards with 16 px padding. Member: 20 px padding, generous whitespace.

## 2. Assets (in `assets/report/`, copy to `public/assets/`)

| File | Use |
|---|---|
| `logo-lotus-wordmark.png` | Black line art on transparent. On plum, use `filter: invert(1)`. Staff sidebar top, member splash |
| `cover-figure.png` | Member welcome / M1 header |
| `botanical-clover.png` | Empty states, section dividers |
| `illus-sleep.jpg`, `illus-nutrition.png`, `illus-exercise.jpg` | Member report sections and plan habit cards |

One illustration style only (botanical line art with a plum silhouette). No stock photos. Staff avatars: initials on `plum-100`.

## 3. Components

| Component | Rules |
|---|---|
| Button | Primary: plum-700 fill, paper text, 40 px high (staff) or 48 px (member). Secondary: paper with plum border. Destructive is rare: "Send back" uses the secondary style with terracotta-700 text. One primary per view. |
| KPI tile | Count (number token) + label + small trend. The whole tile is a link that filters the list below it, with a hover state. |
| Queue row | Left colour bar by priority (safety → urgent red), then member name, "what's waiting", reason/meta, age, owner avatar, and a **primary action button on the row**. The whole row is clickable. |
| Phase tracker | 6 steps. Done: filled plum. Current: terracotta ring and label. Future: line. Sub-step shown under the current step. |
| Milestone bar | Segmented bar "4 of 6 on track" with a tooltip per milestone. |
| Band chip | Status colours above. Always has text. |
| Plan item row | Name, then a change tag (New / Continued / Changed / Discontinued), then inline dropdowns for dose, form, route and frequency (Radix Select; the last option is always "Other…", which opens a text field), a side-note icon and Remove. Amber left border and an "Needs your review" chip if flagged. |
| Finding row | Marker, value + unit, band chip, target, "Source" link, and 4 segmented buttons (Treat / Refer / Monitor / Dismiss). Optional note. |
| Gate footer | Sticky bottom bar on review screens: a progress summary ("6 of 9 findings decided"), the secondary "Send back" and the primary "Approve". The primary stays disabled until the guards pass, with a tooltip listing what's missing. |
| Toast | Bottom-right (staff) or top (member). "Released to Testelle · v2" with an Undo where safe. |
| Phone frame | 390 × 844, radius 44, a 12 px plum-900 bezel, no fake status bar. |
| SAGE bubble | SAGE messages sit on paper with a small "AI" chip; member messages on plum-100. Citations as a meta link "From your report › Bloodwork › Iron". |
| Empty state | Botanical image + one line + one action. |

## 4. Voice and copy

- Warm, plain, short. Write to her ("your", "you"), not about her.
- "Member" in the member app and staff UI. "Patient" only inside clinical documents (SOAP notes).
- Name things by what they do: "Send intake and book blood draw", not "Submit".
- Gates read as people, not codes: "Waiting on NP pre-review", never "MG1".
- "VMRI", never "VRI". "Your Vyta Day" for the in-clinic visit.
- Numbers always carry units and a band word.
- SAGE always opens new chats with: "I'm SAGE, an AI. I can explain your report. I can't give medical advice. Not for emergencies: call 911."

## 5. UX rules applied (use as a review checklist)

- **Hick's / Miller's:** at most 5 KPI tiles; queue rows show one primary action.
- **Fitts's:** the primary action sits on the row and in the sticky footer; member targets are ≥ 44 px.
- **Progressive disclosure:** the member report opens with the Top 3 focus areas, and the 26 pages become sections she opens herself. But don't hide a single sentence behind a dropdown.
- **Recognition over recall:** dropdowns pre-filled from protocol options; the plan starts from the default protocol.
- **Von Restorff:** safety flags are the only red-toned items, pinned to the top.
- **Goal-gradient:** "x of 4 done" on onboarding; milestone progress.
- **Peak-end:** Your Vyta Day ends on the results conversation and "Your plan is ready" with her goals restated.
- **Feedback loops / Doherty:** every action gives a toast within 100 ms, and the timeline shows it.
- **Jakob's:** standard patterns: left nav, tabs, tables, a bottom tab bar on mobile.
- **Tesler's:** the system carries the complexity (pre-filled protocol, derived queues), not the NP.
