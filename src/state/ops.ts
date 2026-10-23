// Pure data operations. Each op mutates a cloned DemoData draft. Every op writes a TimelineEvent.
import type {
  Member, FormAssignment, Visit, SafetyFlag, FollowUp, TimelineEvent, MemberNotice, IntakeValue, MenoStatus, Milestone,
  Result, Report, Approval, Finding, PlanField,
} from '../types';
import { ONBOARDING_FORM_IDS, FORMS, CLINIC_LOCATION, TESTELLE_INTAKE } from '../data/seed';
import { INTAKE } from '../data/intake';
import { extraKeys } from '../lib/intakeFormat';
import { fmtDateTime, fmtDate, toMs } from '../lib/time';
import { baselineLabs, draftFindings, draftPlan, BASELINE_SCORES, BASELINE_FOCUS, PROTOCOL_NAME, FORM_ROUTE, FIELD_LABEL } from '../data/protocol';
import { STAFF } from '../data/seed';
import { canApprovePreReview, unfilled } from './guards';

export interface DemoData {
  now: string;
  members: Member[];
  assignments: FormAssignment[];
  visits: Visit[];
  flags: SafetyFlag[];
  followUps: FollowUp[];
  timeline: TimelineEvent[];
  notices: MemberNotice[];
  intake: Record<string, Record<string, IntakeValue>>;
  intakeDone: Record<string, string[]>; // completed section ids per member
  results: Result[];
  reports: Report[];
  approvals: Approval[];
  seq: number;
}

const id = (d: DemoData, p: string) => `${p}-${++d.seq}`;
export const member = (d: DemoData, memberId: string) => {
  const m = d.members.find((x) => x.id === memberId);
  if (!m) throw new Error(`Unknown member ${memberId}`);
  return m;
};
export function log(d: DemoData, memberId: string, by: string, kind: string, text: string, at = d.now) {
  d.timeline.push({ id: id(d, 'ev'), memberId, at, by, kind, text });
}
export function notify(d: DemoData, memberId: string, text: string, at = d.now) {
  d.notices.push({ id: id(d, 'n'), memberId, at, text, read: false });
}
const formTitle = (formId: string) => FORMS.find((f) => f.id === formId)?.title ?? formId;

export interface OnboardInput {
  menoStatus: MenoStatus;
  goals: string[];
  milestones: Milestone[];
  slotAt: string;
  byId: string;
}

export function onboard(d: DemoData, memberId: string, input: OnboardInput) {
  const m = member(d, memberId);
  m.menoStatus = input.menoStatus;
  m.goals = input.goals.filter((g) => g.trim());
  m.milestones = input.milestones;
  m.phase = 'intake_labs';
  m.step = 'Intake sent · blood draw booked';
  m.lastContactAt = d.now;
  for (const formId of [...ONBOARDING_FORM_IDS, 'f-intake']) {
    d.assignments.push({ id: id(d, 'fa'), memberId, formId, sentAt: d.now, sentById: input.byId, status: 'sent', progress: 0 });
  }
  d.visits.push({ id: id(d, 'v'), memberId, type: 'blood_draw', at: input.slotAt, location: CLINIC_LOCATION, status: 'booked' });
  log(d, memberId, input.byId, 'goals', `Goals recorded and ${m.milestones.filter((x) => x.selected).length} milestones set`);
  log(d, memberId, input.byId, 'forms_sent', '3 consents and the intake form sent to her phone');
  log(d, memberId, input.byId, 'visit_booked', `Blood draw booked for ${fmtDateTime(input.slotAt)}`);
  notify(d, memberId, `Welcome to Vyta. Your first steps are ready, and your blood draw is booked for ${fmtDateTime(input.slotAt)}.`);
}

export function signForm(d: DemoData, assignmentId: string, name: string) {
  const a = d.assignments.find((x) => x.id === assignmentId);
  if (!a || a.status === 'signed') return;
  a.status = 'signed';
  a.signedAt = d.now;
  a.signedName = name;
  log(d, a.memberId, 'member', 'form_signed', `Signed "${formTitle(a.formId)}" (${FORMS.find((f) => f.id === a.formId)?.version})`);
  refreshStep(d, a.memberId);
}

export function sendForm(d: DemoData, memberId: string, formId: string, byId: string) {
  d.assignments.push({ id: id(d, 'fa'), memberId, formId, sentAt: d.now, sentById: byId, status: 'sent' });
  log(d, memberId, byId, 'form_sent', `Sent "${formTitle(formId)}" to her phone`);
  notify(d, memberId, `New form to sign: ${formTitle(formId)}.`);
}

const TOTAL_Q = INTAKE.reduce((n, s) => n + s.questions.length, 0);
function answered(v: IntakeValue | undefined) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

export function saveIntake(d: DemoData, memberId: string, sectionId: string, answers: Record<string, IntakeValue>, sectionComplete: boolean) {
  const a = d.assignments.find((x) => x.memberId === memberId && x.formId === 'f-intake');
  if (!a) return;
  d.intake[memberId] = { ...(d.intake[memberId] ?? {}), ...answers };
  const done = new Set(d.intakeDone[memberId] ?? []);
  if (sectionComplete) done.add(sectionId);
  d.intakeDone[memberId] = [...done];
  // Count questions only: optional "_more" details don't move the progress bar.
  const count = INTAKE.flatMap((x) => x.questions).filter((q) => answered(d.intake[memberId][q.id])).length;
  a.progress = Math.min(1, count / TOTAL_Q);
  if (a.status === 'sent') {
    a.status = 'in_progress';
    a.startedAt = d.now;
    log(d, memberId, 'member', 'intake_started', 'Started the intake form');
  }
  const title = INTAKE.find((s) => s.id === sectionId)?.title ?? sectionId;
  if (sectionComplete) log(d, memberId, 'member', 'intake_section', `Finished intake section: ${title}`);
  if (done.size === INTAKE.length) {
    a.status = 'signed';
    a.signedAt = d.now;
    a.progress = 1;
    log(d, memberId, 'member', 'intake_done', 'Completed the intake form');
    // Safety screen: any "Yes" on self-harm, seizures/cardiac, or urgent concerns raises a flag.
    const ans = d.intake[memberId];
    const hits = INTAKE.flatMap((s) => s.questions).filter((q) => q.safety && ans[q.id] === 'Yes');
    for (const q of hits) {
      d.flags.push({ id: id(d, 'flag'), memberId, source: 'intake', quote: `Intake: "${q.text}" answered Yes`, severity: 'urgent', status: 'open', raisedAt: d.now });
      log(d, memberId, 'system', 'flag_raised', `Safety flag raised from intake (${q.id})`);
    }
  }
  refreshStep(d, memberId);
}

export function nudge(d: DemoData, memberId: string, byId: string, text: string) {
  notify(d, memberId, text);
  log(d, memberId, byId, 'nudge', `In-app reminder sent: "${text}"`);
}

export function snooze(d: DemoData, memberId: string, taskKey: string, reason: string, dueAt: string, byId: string) {
  d.followUps = d.followUps.filter((f) => f.taskKey !== taskKey);
  d.followUps.push({ id: id(d, 'fu'), memberId, taskKey, reason, dueAt, byId });
  log(d, memberId, byId, 'snooze', `Follow-up set for ${fmtDate(dueAt)}: ${reason}`);
}

export function logCall(d: DemoData, memberId: string, byId: string, outcome: string) {
  member(d, memberId).lastContactAt = d.now;
  log(d, memberId, byId, 'call', `Call logged: ${outcome}`);
}

export function confirmVisit(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.status = 'confirmed';
  log(d, v.memberId, byId, 'visit_confirmed', `Blood draw confirmed with her for ${fmtDateTime(v.at)}`);
  notify(d, v.memberId, `Your blood draw is confirmed for ${fmtDateTime(v.at)}. Remember to fast for 12 hours.`);
}

// ---------- Changing appointment times (member or staff) ----------
export interface RescheduleOpts { reason?: string; tellMember?: boolean }
const isFuture = (d: DemoData, at: string) => toMs(at) > toMs(d.now);
export const canRescheduleVisit = (d: DemoData, v: Visit) => v.status !== 'done' && v.status !== 'missed' && isFuture(d, v.at);
export const canRescheduleVytaDay = (d: DemoData, m: Member) =>
  !!m.vytaDayAt && isFuture(d, m.vytaDayAt) && !['first_30', 'ongoing', 'renewal'].includes(m.phase);
const VISIT_LABEL: Partial<Record<Visit['type'], string>> = { blood_draw: 'Blood draw', vyta_day: 'Your Vyta Day' };
const changedBy = (byId: string, reason?: string) => (byId === 'member' ? ' (changed in the app)' : '') + (reason?.trim() ? `. Reason: ${reason.trim()}` : '');

// A moved visit goes back to "booked", so the MA confirms the new time with her again.
export function rescheduleVisit(d: DemoData, visitId: string, newAt: string, byId: string, opts: RescheduleOpts = {}): boolean {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v || !canRescheduleVisit(d, v) || !isFuture(d, newAt) || newAt === v.at) return false;
  const label = VISIT_LABEL[v.type] ?? 'Visit';
  const from = v.at;
  v.at = newAt;
  v.status = 'booked';
  log(d, v.memberId, byId, 'visit_rescheduled', `${label} moved from ${fmtDateTime(from)} to ${fmtDateTime(newAt)}${changedBy(byId, opts.reason)}`);
  if (byId !== 'member' && opts.tellMember !== false) notify(d, v.memberId, `${label.startsWith('Your') ? label : `Your ${label.toLowerCase()}`} has moved to ${fmtDateTime(newAt)}.${v.type === 'blood_draw' ? ' Remember to fast for 12 hours.' : ''}`);
  refreshStep(d, v.memberId);
  return true;
}

export function rescheduleVytaDay(d: DemoData, memberId: string, newAt: string, byId: string, opts: RescheduleOpts = {}): boolean {
  const m = member(d, memberId);
  if (!canRescheduleVytaDay(d, m) || !isFuture(d, newAt) || newAt === m.vytaDayAt) return false;
  const from = m.vytaDayAt!;
  m.vytaDayAt = newAt;
  log(d, memberId, byId, 'visit_rescheduled', `Your Vyta Day moved from ${fmtDateTime(from)} to ${fmtDateTime(newAt)}${changedBy(byId, opts.reason)}`);
  if (byId !== 'member' && opts.tellMember !== false) notify(d, memberId, `Your Vyta Day has moved to ${fmtDateTime(newAt)}.`);
  return true;
}

// Simulated: the real app would hand her phone an .ics file (TRD §4).
export function addToCalendar(d: DemoData, visitId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  log(d, v.memberId, 'member', 'calendar', `Added the blood draw on ${fmtDateTime(v.at)} to her calendar`);
}

export function markDrawn(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.status = 'done';
  log(d, v.memberId, byId, 'blood_drawn', 'Blood drawn and sent to the lab');
  refreshStep(d, v.memberId);
}

export function labsReceived(d: DemoData, visitId: string, byId: string) {
  const v = d.visits.find((x) => x.id === visitId);
  if (!v) return;
  v.labsReceivedAt = d.now;
  d.results = d.results.filter((r) => r.memberId !== v.memberId).concat(baselineLabs(v.memberId, v.id));
  log(d, v.memberId, byId, 'labs_received', 'Lab results received (sample lab PDF attached)');
  notify(d, v.memberId, 'Your lab results are in. Your care team is preparing your report.');
  if (!d.reports.some((r) => r.memberId === v.memberId && r.kind === 'baseline')) {
    d.reports.push({
      id: `r-${v.memberId}-baseline`, memberId: v.memberId, kind: 'baseline', version: 1, status: 'building',
      scores: { ...BASELINE_SCORES }, focusAreas: [...BASELINE_FOCUS], findings: [], plan: [], protocol: PROTOCOL_NAME,
      building: { kind: 'draft', startedAt: d.now },
    });
    log(d, v.memberId, 'system', 'draft_building', `Building draft HEAL plan from the ${PROTOCOL_NAME.toLowerCase()}`);
  }
  refreshStep(d, v.memberId);
}

// ---------- Report: draft and NP pre-review (N2) ----------
export const report = (d: DemoData, reportId: string) => {
  const r = d.reports.find((x) => x.id === reportId);
  if (!r) throw new Error(`Unknown report ${reportId}`);
  return r;
};
const staffName = (sid: string) => STAFF.find((s) => s.id === sid)?.name ?? sid;
const markerOf = (d: DemoData, f: Finding) => d.results.find((r) => r.id === f.resultId)?.marker ?? f.resultId;

// End of the simulated engine run. A rebuild keeps the NP's decisions and edits and bumps the version.
export function finishDraft(d: DemoData, reportId: string) {
  const r = report(d, reportId);
  if (r.status !== 'building' || !r.building) return;
  if (r.building.kind === 'rebuild') {
    r.version += 1;
    log(d, r.memberId, 'system', 'draft_ready', `Draft rebuilt as v${r.version} with the change applied: "${r.building.reason}". Back with the NP for pre-review`);
  } else {
    r.findings = draftFindings().filter((f) => d.results.some((x) => x.id === f.resultId && x.memberId === r.memberId));
    r.plan = draftPlan();
    log(d, r.memberId, 'system', 'draft_ready', `Draft HEAL plan v${r.version} ready: ${r.findings.length} findings, ${r.plan.length} plan items. Waiting on NP pre-review`);
  }
  r.status = 'draft';
  r.builtAt = d.now;
  delete r.building;
  refreshStep(d, r.memberId);
}

const DECISION_LABEL = { treat: 'Treat', refer: 'Refer', monitor: 'Monitor', dismiss: 'Dismiss' } as const;
export function decideFinding(d: DemoData, reportId: string, findingId: string, decision: NonNullable<Finding['decision']>, byId: string) {
  const r = report(d, reportId);
  const f = r.findings.find((x) => x.id === findingId);
  if (!f || r.status !== 'draft') return;
  f.decision = decision;
  f.decidedById = byId;
  f.decidedAt = d.now;
  log(d, r.memberId, byId, 'finding_decided', `Finding ${markerOf(d, f)}: ${DECISION_LABEL[decision]}`);
}

export function noteFinding(d: DemoData, reportId: string, findingId: string, note: string, byId: string) {
  const r = report(d, reportId);
  const f = r.findings.find((x) => x.id === findingId);
  if (!f || r.status !== 'draft') return;
  f.note = note.trim() || undefined;
  log(d, r.memberId, byId, 'finding_note', f.note ? `Note on ${markerOf(d, f)}: "${f.note}"` : `Note on ${markerOf(d, f)} removed`);
}

// Accept the protocol's suggestion for every finding the NP hasn't decided yet.
export function acceptSuggestions(d: DemoData, reportId: string, byId: string) {
  const r = report(d, reportId);
  const open = r.findings.filter((f) => !f.decision && f.suggested);
  if (!open.length || r.status !== 'draft') return;
  for (const f of open) Object.assign(f, { decision: f.suggested, decidedById: byId, decidedAt: d.now });
  log(d, r.memberId, byId, 'finding_decided', `Protocol suggestions accepted for ${open.length} findings: ${open.map((f) => `${markerOf(d, f)} (${DECISION_LABEL[f.suggested!]})`).join(', ')}`);
}

export function editPlanItem(d: DemoData, reportId: string, itemId: string, field: PlanField, value: string, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((x) => x.id === itemId);
  if (!item || r.status !== 'draft' || item[field] === value) return;
  const before = item[field];
  item[field] = value;
  if (field === 'form' && FORM_ROUTE[value] && (!item.options?.route || item.options.route.includes(FORM_ROUTE[value]))) item.route = FORM_ROUTE[value];
  if (item.change === 'continued') item.change = 'changed';
  log(d, r.memberId, byId, 'plan_edit', `${item.name}: ${FIELD_LABEL[field].toLowerCase()} ${before ? `${before} → ` : 'set to '}${value}`);
}

export function setSideNote(d: DemoData, reportId: string, itemId: string, note: string, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((x) => x.id === itemId);
  if (!item || r.status !== 'draft') return;
  item.sideNote = note.trim() || undefined;
  log(d, r.memberId, byId, 'plan_note', item.sideNote ? `${item.name}: side note "${item.sideNote}"` : `${item.name}: side note removed`);
}

export function reviewPlanItem(d: DemoData, reportId: string, itemId: string, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((x) => x.id === itemId);
  if (!item || !item.flag || r.status !== 'draft' || unfilled(item).length) return;
  item.resolved = true;
  log(d, r.memberId, byId, 'plan_reviewed', `${item.name}: ${item.flag === 'proposed' ? 'proposed step reviewed and kept' : 'instruction completed and reviewed'}`);
}

export function removePlanItem(d: DemoData, reportId: string, itemId: string, removed: boolean, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((x) => x.id === itemId);
  if (!item || r.status !== 'draft') return;
  item.removed = removed;
  log(d, r.memberId, byId, 'plan_edit', `${item.name} ${removed ? 'removed from' : 'restored to'} the plan`);
}

export function approvePreReview(d: DemoData, reportId: string, byId: string): boolean {
  const r = report(d, reportId);
  if (!canApprovePreReview(r, d.results).ok) return false;
  r.status = 'pre_reviewed';
  d.approvals.push({ id: id(d, 'ap'), gate: 'np_pre_review', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'approved', byId, at: d.now });
  log(d, r.memberId, byId, 'approval', `NP pre-review approved · v${r.version} · ${staffName(byId)}. Wording review is with the Coach`);
  refreshStep(d, r.memberId);
  return true;
}

export function sendBackDraft(d: DemoData, reportId: string, reason: string, byId: string) {
  const r = report(d, reportId);
  if (r.status !== 'draft' || !reason.trim()) return;
  d.approvals.push({ id: id(d, 'ap'), gate: 'np_pre_review', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'sent_back', reason, byId, at: d.now });
  r.status = 'building';
  r.building = { kind: 'rebuild', reason, startedAt: d.now };
  log(d, r.memberId, byId, 'sent_back', `Draft v${r.version} sent back by ${staffName(byId)}: "${reason}". Rebuilding`);
  refreshStep(d, r.memberId);
}

export function refreshStep(d: DemoData, memberId: string) {
  const m = member(d, memberId);
  if (m.phase !== 'intake_labs') return;
  const intake = d.assignments.find((x) => x.memberId === memberId && x.formId === 'f-intake');
  const draw = d.visits.find((x) => x.memberId === memberId && x.type === 'blood_draw');
  const pct = Math.round((intake?.progress ?? 0) * 100);
  const intakePart = intake?.status === 'signed' ? 'Intake done' : `Intake ${pct}%`;
  const rep = d.reports.find((x) => x.memberId === memberId && x.kind === 'baseline');
  const labsPart = rep?.status === 'building' ? 'draft building'
    : rep?.status === 'draft' ? 'waiting on NP pre-review'
      : rep?.status === 'pre_reviewed' ? 'waiting on Coach wording review'
        : draw?.labsReceivedAt ? 'labs received' : draw?.status === 'done' ? 'labs awaited' : 'blood draw booked';
  m.step = `${intakePart} · ${labsPart}`;
}

// Demo shortcut: keep every answer already chosen, fill the gaps with Testelle's sample answers, and finish all sections.
export function skipIntakeToEnd(d: DemoData, memberId: string, current: Record<string, IntakeValue> = {}) {
  const chosen = { ...(d.intake[memberId] ?? {}), ...current };
  for (const sec of INTAKE) {
    const answers = Object.fromEntries(
      sec.questions.flatMap((q) => [[q.id, chosen[q.id] ?? TESTELLE_INTAKE[q.id]], ...extraKeys(q.id).map((k) => [k, chosen[k]])]).filter(([, v]) => v !== undefined),
    );
    saveIntake(d, memberId, sec.id, answers, true);
  }
}
