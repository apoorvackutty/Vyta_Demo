// Types follow docs/SCHEMA.md. Only the parts used so far are fleshed out; the rest are kept for later steps.

export type Role = 'member' | 'guide' | 'ma' | 'np' | 'coach' | 'admin';
export type StaffRole = Exclude<Role, 'member'>;

export interface Staff {
  id: string;
  name: string;
  roles: StaffRole[];
  title: string;
}

export type Phase = 'join' | 'intake_labs' | 'vyta_day' | 'first_30' | 'ongoing' | 'renewal';
export type Program = 'discover' | 'heal' | 'optimize' | 'thrive';
export type MenoStatus = 'peri' | 'post' | 'not_applicable';

export interface Milestone {
  id: string;
  label: string;
  score: number | null;
  target: number;
  selected: boolean;
}

export interface Member {
  id: string;
  name: string;
  dob: string;
  menoStatus: MenoStatus;
  program: Program;
  phase: Phase;
  step: string;
  guideId: string;
  npId: string;
  coachId: string;
  maId: string;
  goals: string[];
  milestones: Milestone[];
  joinedAt: string;
  lastContactAt?: string;
  vytaDayAt?: string;
  isLead?: boolean; // the fully playable member (Testelle)
}

export type FormKind = 'onboarding_consent' | 'treatment_consent' | 'intake' | 'education';
export interface FormTemplate {
  id: string;
  title: string;
  kind: FormKind;
  version: string;
  summary: string;
  body: string[];
}
export interface FormAssignment {
  id: string;
  memberId: string;
  formId: string;
  sentAt: string;
  sentById: string;
  status: 'sent' | 'in_progress' | 'signed';
  startedAt?: string;
  signedAt?: string;
  signedName?: string;
  progress?: number;
}

export type IntakeQuestionType = 'text' | 'single' | 'multi' | 'scale' | 'grid' | 'date';
export interface IntakeQuestion {
  id: string;
  text: string;
  type: IntakeQuestionType;
  options?: (string | number)[];
  safety?: boolean;
}
export interface IntakeSection {
  id: string;
  title: string;
  questions: IntakeQuestion[];
}
export type IntakeValue = string | string[] | number | Record<string, string>;

export type VisitType = 'blood_draw' | 'vyta_day' | 'quarterly' | 'coach' | 'call';
export interface Visit {
  id: string;
  memberId: string;
  type: VisitType;
  at: string;
  location: string;
  status: 'booked' | 'confirmed' | 'done' | 'missed';
  labsReceivedAt?: string;
}

export interface SafetyFlag {
  id: string;
  memberId: string;
  source: 'sage' | 'intake' | 'checkin' | 'message' | 'lab';
  quote: string;
  severity: 'urgent' | 'review';
  status: 'open' | 'escalated' | 'closed';
  raisedAt: string;
}

export interface FollowUp {
  id: string;
  memberId: string;
  taskKey: string;
  reason: string;
  dueAt: string;
  byId: string;
}

export interface TimelineEvent {
  id: string;
  memberId: string;
  at: string;
  by: string; // staff id, 'member', 'system'
  kind: string;
  text: string;
}

export interface MemberNotice {
  id: string;
  memberId: string;
  at: string;
  text: string;
  read: boolean;
}

// Static queue items for roster members whose journeys are not playable in this build.
export interface StaticTask {
  id: string;
  memberId: string;
  roles: StaffRole[];
  category: QueueCategory;
  label: string;
  reason: string;
  ageLabel: string;
  priority: number;
}

export type QueueCategory = 'safety' | 'onboard' | 'overdue' | 'forms' | 'labs' | 'visits' | 'reviews' | 'orders' | 'messages' | 'engagement';

export interface QueueItem {
  key: string;
  memberId: string;
  category: QueueCategory;
  label: string;
  reason: string;
  ageLabel: string;
  priority: number; // 0 = pinned safety
  primary?: { label: string; action: QueueAction };
  secondary?: { label: string; action: QueueAction }[];
}
export type QueueAction =
  | { type: 'open_record'; memberId: string }
  | { type: 'onboard'; memberId: string }
  | { type: 'nudge'; memberId: string; taskKey: string; text: string }
  | { type: 'snooze'; memberId: string; taskKey: string }
  | { type: 'log_call'; memberId: string; taskKey: string }
  | { type: 'confirm_visit'; visitId: string }
  | { type: 'mark_drawn'; visitId: string }
  | { type: 'labs_received'; visitId: string }
  | { type: 'pre_review'; memberId: string };

// ---------- Results, report and plan (SCHEMA §1) ----------
export type Band =
  | 'optimal' | 'elite' | 'watch' | 'needs_attention' | 'below_target' | 'not_retested' | 'not_scored';
export interface Result {
  id: string;
  memberId: string;
  visitId?: string;
  panel: string;
  marker: string;
  value: number | string | null;
  unit?: string;
  target?: string;
  band: Band;
  source: string; // "Lab report p.3"
}

export interface Scores {
  vmri: number;
  vmriBand: 'optimized' | 'resilient' | 'moderate_burden' | 'high_vulnerability' | 'critical_burden';
  biologicalAge: number;
  symptoms: number;
}

export type ReportStatus =
  | 'building' | 'draft' | 'pre_reviewed' | 'wording_checked'
  | 'ready_for_visit' | 'final_review' | 'released' | 'withdrawn';
export interface Report {
  id: string;
  memberId: string;
  kind: 'baseline' | 'quarterly';
  version: number;
  status: ReportStatus;
  scores: Scores;
  focusAreas: string[];
  findings: Finding[];
  plan: PlanItem[];
  protocol: string; // template the draft started from
  builtAt?: string;
  building?: { kind: 'draft' | 'rebuild'; reason?: string; startedAt: string }; // simulated engine run (TRD §4)
}

export interface Finding {
  id: string;
  resultId: string;
  summary: string;
  decision?: 'treat' | 'refer' | 'monitor' | 'dismiss';
  note?: string;
  decidedById?: string;
  decidedAt?: string;
}

export type PlanGroup = 'prescription' | 'supplement' | 'peptide' | 'nutrition' | 'exercise' | 'sleep';
export type PlanField = 'dose' | 'form' | 'route' | 'frequency';
export interface PlanItem {
  id: string;
  group: PlanGroup;
  name: string;
  change: 'new' | 'continued' | 'changed' | 'discontinued';
  dose?: string;
  form?: string;
  route?: string;
  frequency?: string;
  options?: Partial<Record<PlanField, string[]>>;
  purpose: string;
  flag?: 'proposed' | 'incomplete'; // * or † from the report: blocks approval until resolved
  flagNote?: string; // "strength per troche missing"
  missing?: PlanField[]; // fields a † item needs filled before it can be marked reviewed
  resolved?: boolean;
  sideNote?: string;
  removed?: boolean;
  needsConsentFormId?: string;
  supplier?: 'compounding' | 'retail' | 'fullscript' | 'peptide_supplier';
}

export type GateType =
  | 'np_pre_review' | 'coach_wording' | 'completeness' | 'np_final_review'
  | 'release' | 'quarterly_review' | 'safety_close';
export interface Approval {
  id: string;
  gate: GateType;
  memberId: string;
  reportId?: string;
  reportVersion?: number;
  outcome: 'approved' | 'sent_back';
  reason?: string;
  byId: string;
  at: string;
}
