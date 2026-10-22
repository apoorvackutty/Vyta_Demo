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
  | { type: 'labs_received'; visitId: string };
