# Data Model (Demo)

The demo keeps everything in one in-memory store seeded from `src/data/seed.ts`. The shapes below are written so the same model can move to a real database later. Use these TypeScript types verbatim in `src/types.ts`.

Core principle: **every object has a status, an owner and a next action.** Queues are *derived* from objects; they are not stored separately.

## 1. Entities

```ts
// ---------- People ----------
export type Role = 'member' | 'guide' | 'ma' | 'np' | 'coach' | 'admin';

export interface Staff {
  id: string;
  name: string;            // fictional
  roles: Role[];           // one person may hold several roles
  title: string;           // e.g. "Nurse Practitioner"
  avatar: string;          // illustrated, not a photo
}

export type Phase =
  | 'join' | 'intake_labs' | 'vyta_day' | 'first_30' | 'ongoing' | 'renewal';
export type Program = 'discover' | 'heal' | 'optimize' | 'thrive';
export type MenoStatus = 'peri' | 'post' | 'not_applicable';

export interface Member {
  id: string;
  name: string;            // "Testelle M"
  dob: string;             // ISO
  menoStatus: MenoStatus;
  program: Program;
  phase: Phase;
  step: string;            // human label of current step, e.g. "Intake 40%"
  guideId: string; npId: string; coachId: string;
  goals: string[];         // her words
  milestones: Milestone[];
  joinedAt: string;
  lastContactAt?: string;
}

export interface Milestone {
  id: string;
  label: string;           // "Steady energy for family and travel"
  score: number | null;    // 0–10, re-scored quarterly
  target: number;          // e.g. 7
  history: { date: string; score: number }[];
}

// ---------- Forms & intake ----------
export type FormKind = 'onboarding_consent' | 'treatment_consent' | 'intake' | 'education';
export interface FormTemplate {
  id: string; title: string; kind: FormKind; version: string; body: string;
}
export interface FormAssignment {
  id: string; memberId: string; formId: string;
  sentAt: string; sentById: string;
  status: 'sent' | 'in_progress' | 'signed';
  signedAt?: string; signedName?: string; progress?: number; // 0–1 for intake
}
export interface IntakeAnswer { questionId: string; value: string | string[] | number; }

// ---------- Visits & results ----------
export type Station = 'inbody' | 'functional' | 'shapescale' | 'vo2';
export interface Visit {
  id: string; memberId: string; type: 'blood_draw' | 'vyta_day' | 'quarterly' | 'coach' | 'call';
  at: string; maId?: string; npId?: string;
  stations?: Record<Station, 'todo' | 'in_progress' | 'done' | 'skipped'>;
  completeness?: 'open' | 'passed';
}

export type Band =
  | 'optimal' | 'elite' | 'watch' | 'needs_attention' | 'below_target' | 'not_retested' | 'not_scored';
export interface Result {
  id: string; memberId: string; visitId?: string;
  panel: string;           // "Hormones", "Metabolic", "InBody", "Functional" ...
  marker: string;          // "Ferritin"
  value: number | string | null;
  unit?: string;
  target?: string;         // "12–150 ng/mL"
  elite?: string;
  band: Band;
  baselineValue?: number | string | null;  // for delta view
  source: string;          // "Lab PDF p.3" or "InBody scan"
  skipped?: { reason: string; byId: string; at: string };
  excludedFromScore?: boolean;
}

export interface Scores {
  vmri: number;            // 0–100
  vmriBand: 'optimized' | 'resilient' | 'moderate_burden' | 'high_vulnerability' | 'critical_burden';
  biologicalAge: number;   // years
  symptoms: number;        // 0–100
}

// ---------- Report & plan (versioned) ----------
export type ReportStatus =
  | 'building' | 'draft' | 'pre_reviewed' | 'wording_checked'
  | 'ready_for_visit' | 'final_review' | 'released' | 'withdrawn';
export interface Report {
  id: string; memberId: string; kind: 'baseline' | 'quarterly';
  version: number; status: ReportStatus;
  scores: Scores; baselineScores?: Scores;     // quarterly only
  focusAreas: string[];    // top 3, member-facing
  sections: ReportSection[];
  findings: Finding[];
  plan: PlanItem[];
  releasedAt?: string; releasedById?: string;
}
export interface ReportSection { id: string; title: string; memberText: string; resultIds: string[]; }

export interface Finding {
  id: string; resultId: string; summary: string;
  decision?: 'treat' | 'refer' | 'monitor' | 'dismiss';
  note?: string; decidedById?: string; decidedAt?: string;
}

export type PlanGroup = 'prescription' | 'supplement' | 'peptide' | 'nutrition' | 'exercise' | 'sleep';
export interface PlanItem {
  id: string; group: PlanGroup; name: string;
  change: 'new' | 'continued' | 'changed' | 'discontinued';
  dose?: string; form?: string; route?: string; frequency?: string;
  options?: { dose?: string[]; form?: string[]; route?: string[]; frequency?: string[] };
  purpose: string;         // one line, member-facing
  flag?: 'proposed' | 'incomplete';   // * or † from the report — blocks approval until resolved
  resolved?: boolean;
  sideNote?: string;       // e.g. allergy
  removed?: boolean;
  memberChoice?: 'accept' | 'decline' | 'defer'; choiceReason?: string;
  needsConsentFormId?: string;        // e.g. testosterone use consent
  supplier?: 'compounding' | 'retail' | 'fullscript' | 'peptide_supplier';
}

// ---------- Gates ----------
export type GateType =
  | 'np_pre_review' | 'coach_wording' | 'completeness' | 'np_final_review'
  | 'release' | 'quarterly_review' | 'safety_close';
export interface Approval {
  id: string; gate: GateType; memberId: string; reportId?: string; reportVersion?: number;
  outcome: 'approved' | 'sent_back';
  reason?: string; byId: string; at: string;
}

// ---------- Orders ----------
export interface Order {
  id: string; memberId: string; planItemId: string;
  supplier: PlanItem['supplier']; status: 'open' | 'placed'; placedById?: string; placedAt?: string;
}

// ---------- Safety & messaging ----------
export interface SafetyFlag {
  id: string; memberId: string;
  source: 'sage' | 'intake' | 'checkin' | 'message' | 'lab';
  quote: string; severity: 'urgent' | 'review';
  status: 'open' | 'escalated' | 'closed';
  raisedAt: string; ownerRole: 'guide' | 'np';
  actions: { at: string; byId: string; kind: 'call' | 'message' | 'escalate' | 'note' | 'close'; note: string }[];
}
export interface SageMessage {
  id: string; memberId: string; from: 'member' | 'sage';
  text: string; at: string; citation?: string; flagged?: boolean;
}
export interface Message { id: string; memberId: string; fromId: string; text: string; at: string; holding?: boolean; }

// ---------- Ongoing ----------
export interface CheckIn {
  id: string; memberId: string; weekOf: string;
  energy: number; sleep: number; mood: number; stress: number; // 0–10
  keptToPlan: 'yes' | 'mostly' | 'no'; note?: string;
}
export interface InsightTemplate { id: string; audience: 'member' | 'staff'; trigger: string; text: string; active: boolean; }

// ---------- Tasks & audit ----------
export interface FollowUp {        // snooze with reason
  id: string; memberId: string; reason: string; dueAt: string; byId: string;
}
export interface TimelineEvent {
  id: string; memberId: string; at: string; byId: string | 'system' | 'sage';
  kind: string;                    // 'form_sent', 'approval', 'release', 'flag_raised', ...
  text: string;
}
```

## 2. Derived queue items

A queue item is computed from the store, never saved. Implement `getQueue(role, now)` in `src/state/queues.ts`.

| Source condition | Queue | Label | Priority |
|---|---|---|---|
| SafetyFlag.status = open | guide (+np if severity urgent) | "Safety: …quote" | 0 (pinned) |
| SafetyFlag.status = escalated | np | "Escalated by Guide" | 0 |
| FormAssignment(intake) in_progress > 2 days, no FollowUp due later | guide | "Intake 40% · 3 days" | 2 |
| Visit(blood_draw) past and no labs | guide, ma | "Blood draw overdue" | 2 |
| Report.status = draft | np | "Pre-review: draft ready" | 1 |
| Report.status = pre_reviewed | coach | "Wording review" | 1 |
| Visit(vyta_day) today | ma, guide, np | "Your Vyta Day · 9:00" | 1 |
| Visit stations all done/skipped and completeness open | ma/np | "Completeness check" | 1 |
| Report.status = final_review | np | "Final review" | 1 |
| Order.status = open | np, ma | "Order: Iron (Fullscript)" — red | 1 |
| Release yesterday | guide | "Next-day call" | 2 |
| Report(quarterly).status = draft | np | "Quarterly review" | 2 |
| Admin | all of the above | grouped by role | — |

## 3. State transitions (report)

```
building → draft ─(NP approve)→ pre_reviewed ─(Coach approve)→ wording_checked → ready_for_visit
   ▲         │ send back            │ send back (clinical)
   └─────────┘◀─────────────────────┘
ready_for_visit ─(visit starts)→ final_review ─(NP release)→ released
final_review ◀─(not ready)─ release attempt
released ─(Admin withdraw)→ withdrawn
```

Every transition writes an `Approval` (for gates) and a `TimelineEvent`.

## 4. Guards (must be enforced in the UI)

- **Approve pre-review:** every Finding has a decision, and every PlanItem with a `flag` is `resolved` or `removed`.
- **Release:** completeness passed, every finding decided, every `needsConsentFormId` on an accepted item has a signed FormAssignment, and Coach wording approved.
- **Skipped tests:** `excludedFromScore = true`; scores are recalculated without them, never counted as zero.
- **Member app:** shows only `released` reports and only notes marked visible.
