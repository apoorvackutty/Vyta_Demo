// Pure data operations. Each op mutates a cloned DemoData draft. Every op writes a TimelineEvent.
import type {
  Member, FormAssignment, Visit, SafetyFlag, FollowUp, TimelineEvent, MemberNotice, IntakeValue, MenoStatus, Milestone,
  Result, Report, Approval, Finding, PlanField, Station, PlanItem, Order, SageMessage, FlagAction,
} from '../types';
import { ONBOARDING_FORM_IDS, FORMS, CLINIC_LOCATION, TESTELLE_INTAKE } from '../data/seed';
import { INTAKE } from '../data/intake';
import { extraKeys } from '../lib/intakeFormat';
import { fillRequired } from '../lib/intakeFlow';
import { fmtDateTime, fmtDate, toMs } from '../lib/time';
import { baselineLabs, draftFindings, draftPlan, PRE_REVIEW_SCORES, BASELINE_FOCUS, PROTOCOL_NAME, FORM_ROUTE, FIELD_LABEL } from '../data/protocol';
import { STAFF } from '../data/seed';
import { BASELINE_SUMMARY, wordingSlots, wordingChanged } from '../data/wording';
import { canApprovePreReview, canPassCompleteness, unfilled, canFinishFinalReview, vytaDayFindings, canRelease, needsChoice } from './guards';
import { SAGE_SCRIPT, matchSage } from '../data/sage';
import { vytaDayScores } from '../lib/scores';
import { STATIONS, stationOf, uploadResults, bandFor, resultId, FUNCTIONAL, functionalBand, type FunctionalId } from '../data/stations';

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
  orders: Order[];
  sage: SageMessage[];
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

export function logCall(d: DemoData, memberId: string, byId: string, outcome: string, taskKey?: string) {
  member(d, memberId).lastContactAt = d.now;
  // G1 next-day call after release: logging it takes it off the Guide's list.
  const next = taskKey?.startsWith('nextday-') ? d.reports.find((r) => `nextday-${r.id}` === taskKey) : undefined;
  if (next) next.nextDayCallAt = d.now;
  log(d, memberId, byId, 'call', `${next ? 'Next-day call' : 'Call'} logged: ${outcome}`);
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
      scores: { ...PRE_REVIEW_SCORES }, focusAreas: [...BASELINE_FOCUS], findings: [], plan: [], protocol: PROTOCOL_NAME, summary: BASELINE_SUMMARY,
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
  r.preReviewScores = { ...r.scores };
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

// ---------- Coach wording review (C1). Member-facing text only; clinical fields stay locked. ----------
export function editWording(d: DemoData, reportId: string, key: string, text: string, byId: string) {
  const r = report(d, reportId);
  const slot = wordingSlots(r).find((x) => x.key === key);
  if (!slot || r.status !== 'pre_reviewed') return;
  const next = text.trim();
  const before = r.wordingEdits?.[key] ?? slot.original;
  if (!next || next === before) return;
  r.wordingEdits = { ...(r.wordingEdits ?? {}) };
  if (next === slot.original) delete r.wordingEdits[key];
  else r.wordingEdits[key] = next;
  log(d, r.memberId, byId, 'wording_edit', next === slot.original ? `${slot.label}: back to the original wording` : `${slot.label} reworded: "${next}"`);
}

// Approval writes the Coach's versions into the report, then the visit is booked so the MA has it.
export function approveWording(d: DemoData, reportId: string, byId: string): boolean {
  const r = report(d, reportId);
  if (r.status !== 'pre_reviewed') return false;
  const changed = wordingChanged(r);
  for (const slot of changed) {
    const text = r.wordingEdits![slot.key];
    if (slot.key === 'summary') r.summary = text;
    else if (slot.key.startsWith('focus-')) r.focusAreas[Number(slot.key.slice(6))] = text;
    else { const item = r.plan.find((i) => `purpose-${i.id}` === slot.key); if (item) item.purpose = text; }
  }
  delete r.wordingEdits;
  r.status = 'ready_for_visit';
  d.approvals.push({ id: id(d, 'ap'), gate: 'coach_wording', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'approved', byId, at: d.now });
  log(d, r.memberId, byId, 'approval', `Coach wording review approved · v${r.version} · ${staffName(byId)}${changed.length ? ` · ${changed.length} sentence${changed.length > 1 ? 's' : ''} reworded` : ''}. Ready for Your Vyta Day`);
  refreshStep(d, r.memberId);
  bookVytaDayVisit(d, r.memberId, 'system');
  return true;
}

// "Send back to NP – clinical change": the draft returns to pre-review with the Coach's note. Her rewording so far is kept.
export function sendBackWording(d: DemoData, reportId: string, note: string, byId: string) {
  const r = report(d, reportId);
  if (r.status !== 'pre_reviewed' || !note.trim()) return;
  d.approvals.push({ id: id(d, 'ap'), gate: 'coach_wording', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'sent_back', reason: note.trim(), byId, at: d.now });
  r.status = 'draft';
  log(d, r.memberId, byId, 'sent_back', `Wording review sent back to the NP by ${staffName(byId)} for a clinical change: "${note.trim()}"`);
  refreshStep(d, r.memberId);
}

// ---------- Your Vyta Day: MA stations (MA1, MA3) ----------
export const vytaDayVisit = (d: DemoData, memberId: string) => d.visits.find((v) => v.memberId === memberId && v.type === 'vyta_day');
const visitOf = (d: DemoData, visitId: string) => d.visits.find((v) => v.id === visitId && v.type === 'vyta_day' && v.stations);
const stationLabel = (st: Station) => stationOf(st).label;

export function bookVytaDayVisit(d: DemoData, memberId: string, byId: string) {
  const m = member(d, memberId);
  if (!m.vytaDayAt || vytaDayVisit(d, memberId)) return;
  d.visits.push({
    id: id(d, 'v'), memberId, type: 'vyta_day', at: m.vytaDayAt, location: 'Vyta MenoClinic, Salt Lake City', status: 'confirmed',
    maId: m.maId, npId: m.npId, completeness: 'open',
    stations: { inbody: 'todo', functional: 'todo', shapescale: 'todo', vo2: 'todo' },
  });
  m.phase = 'vyta_day';
  m.step = 'Your Vyta Day booked · report ready for the visit';
  log(d, memberId, byId, 'visit_booked', `Your Vyta Day confirmed for ${fmtDateTime(m.vytaDayAt)}: InBody, functional tests, ShapeScale, VO2 max`);
}

export const visitStarted = (v: { stations?: Record<Station, string> }) => !!v.stations && Object.values(v.stations).some((x) => x !== 'todo');

export function startVisit(d: DemoData, visitId: string, byId: string): boolean {
  const v = visitOf(d, visitId);
  if (!v || visitStarted(v) || v.completeness === 'passed') return false;
  v.stations!.inbody = 'in_progress';
  const r = d.reports.find((x) => x.memberId === v.memberId && x.kind === 'baseline');
  if (r?.status === 'ready_for_visit') r.status = 'final_review';
  member(d, v.memberId).step = 'Your Vyta Day · tests in progress';
  log(d, v.memberId, byId, 'visit_started', `Your Vyta Day started by ${staffName(byId)}: checked in, InBody first`);
  return true;
}

// Check before apply: the MA reviews the parsed scan, may correct values, then applies them.
// Values she corrected in the review list are kept as "edited" (and count as checked); the rest are
// "From scan · check" until she confirms them. `reviewed` maps marker → value from the review list.
export type Reviewed = Record<string, number | string>;
export function applyUpload(d: DemoData, visitId: string, station: Exclude<Station, 'functional'>, reviewed: Reviewed, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.completeness === 'passed') return;
  const panel = stationOf(station).panel;
  const again = d.results.some((r) => r.visitId === v.id && r.panel === panel && !r.skipped);
  const rows = uploadResults(v.memberId, v.id, station).map((r) => {
    const val = reviewed[r.marker];
    if (val === undefined || val === r.value) return r;
    return { ...r, value: val, band: bandFor(station, r.marker, val), origin: 'scan_edited' as const, checked: true };
  });
  d.results = d.results.filter((r) => !(r.visitId === v.id && r.panel === panel)).concat(rows);
  v.stations![station] = 'done';
  const edited = rows.filter((r) => r.origin === 'scan_edited').length;
  log(d, v.memberId, byId, 'station_done', `${stationLabel(station)} ${again ? 're-uploaded scan' : 'scan'} applied: ${rows.length} values${edited ? `, ${edited} corrected before applying` : ''}. ${rows.length - edited} to check against the printout. Sent to the NP`);
}
// Apply exactly as read (tests and demo shortcuts).
export const uploadStation = (d: DemoData, visitId: string, station: Exclude<Station, 'functional'>, byId: string) => applyUpload(d, visitId, station, {}, byId);

export function reuploadStation(d: DemoData, visitId: string, station: Exclude<Station, 'functional'>, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.completeness === 'passed') return;
  log(d, v.memberId, byId, 'station_reupload', `${stationLabel(station)} re-upload started: the values on her record stay until the new scan is applied`);
}

export function clearStation(d: DemoData, visitId: string, station: Station, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.completeness === 'passed') return;
  const panel = stationOf(station).panel;
  const n = d.results.filter((r) => r.visitId === v.id && r.panel === panel && !r.skipped).length;
  if (!n) return;
  d.results = d.results.filter((r) => !(r.visitId === v.id && r.panel === panel));
  v.stations![station] = 'in_progress';
  log(d, v.memberId, byId, 'station_cleared', `${stationLabel(station)} cleared: ${n} values removed`);
}

export function markStationChecked(d: DemoData, visitId: string, station: Station, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.completeness === 'passed') return;
  const open = d.results.filter((r) => r.visitId === v.id && r.panel === stationOf(station).panel && r.origin === 'scan' && !r.checked);
  if (!open.length) return;
  open.forEach((r) => { r.checked = true; });
  log(d, v.memberId, byId, 'station_checked', `${stationLabel(station)}: ${open.length} scan values checked against the printout`);
}

export function editStationResult(d: DemoData, resultIdArg: string, value: number | string | null, byId: string) {
  const r = d.results.find((x) => x.id === resultIdArg);
  const st = STATIONS.find((x) => x.panel === r?.panel);
  const v = r?.visitId ? visitOf(d, r.visitId) : undefined;
  if (!r || !st || !v || v.completeness === 'passed' || r.value === value) return;
  const before = r.value;
  r.value = value;
  r.band = bandFor(st.id, r.marker, value);
  // Editing a scan value confirms it. Typing back the scan's own value makes it plain "From scan" again.
  if (r.origin === 'scan' || r.origin === 'scan_edited') r.origin = value === r.scanValue ? 'scan' : 'scan_edited';
  r.checked = true;
  log(d, r.memberId, byId, 'result_edit', `${st.label} · ${r.marker}: ${before ?? '—'} → ${value ?? '—'}${r.unit ? ` ${r.unit}` : ''}`);
}

export function startStation(d: DemoData, visitId: string, station: Station, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.stations![station] !== 'todo' || v.completeness === 'passed') return;
  v.stations![station] = 'in_progress';
  log(d, v.memberId, byId, 'station_started', `${stationLabel(station)} started`);
}

export type FunctionalEntry = Partial<Record<FunctionalId, number | string>>;
export function saveFunctional(d: DemoData, visitId: string, entry: FunctionalEntry, byId: string): boolean {
  const v = visitOf(d, visitId);
  if (!v || v.completeness === 'passed') return false;
  if (FUNCTIONAL.some((t) => t.scored && functionalBand(t.id, entry[t.id]) === null)) return false;
  const rows: Result[] = FUNCTIONAL.filter((t) => entry[t.id] !== undefined && entry[t.id] !== '').map((t) => ({
    id: resultId(v.id, 'functional', t.marker), memberId: v.memberId, visitId: v.id, panel: 'Functional', marker: t.marker,
    value: entry[t.id]!, unit: t.unit, target: t.scored ? `${t.rule} (illustrative)` : 'Recorded, not scored',
    band: functionalBand(t.id, entry[t.id]) ?? 'not_scored', source: stationOf('functional').source,
    section: t.section, origin: 'entered' as const, checked: true,
  }));
  const again = v.stations!.functional === 'done';
  d.results = d.results.filter((r) => !(r.visitId === v.id && r.panel === 'Functional')).concat(rows);
  v.stations!.functional = 'done';
  const grip = rows.find((r) => r.marker === 'Grip strength');
  log(d, v.memberId, byId, 'station_done', `Functional tests ${again ? 'updated' : 'entered'}: ${rows.length} results${grip ? `, grip ${grip.value} lb` : ''}. Sent to the NP`);
  return true;
}

// Skip with reason: kept as a skipped result so the NP sees why, and left out of every score (never zero).
export function skipStation(d: DemoData, visitId: string, station: Station, reason: string, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || !reason.trim() || v.completeness === 'passed') return;
  const st = stationOf(station);
  d.results = d.results.filter((r) => !(r.visitId === v.id && r.panel === st.panel)).concat({
    id: resultId(v.id, station, 'skipped'), memberId: v.memberId, visitId: v.id, panel: st.panel, marker: `${st.label} scan`,
    value: null, band: 'not_scored', source: st.source, skipped: { reason: reason.trim(), byId, at: d.now }, excludedFromScore: true,
  });
  v.stations![station] = 'skipped';
  log(d, v.memberId, byId, 'station_skipped', `${st.label} skipped: "${reason.trim()}". Left out of her scores, not counted as zero`);
}

export function unskipStation(d: DemoData, visitId: string, station: Station, byId: string) {
  const v = visitOf(d, visitId);
  if (!v || v.stations![station] !== 'skipped' || v.completeness === 'passed') return;
  d.results = d.results.filter((r) => r.id !== resultId(v.id, station, 'skipped'));
  v.stations![station] = 'in_progress';
  log(d, v.memberId, byId, 'station_unskipped', `${stationLabel(station)} no longer skipped: entering results instead`);
}

export function passCompleteness(d: DemoData, visitId: string, byId: string): boolean {
  const v = visitOf(d, visitId);
  if (!v || !canPassCompleteness(v, d.results).ok) return false;
  v.completeness = 'passed';
  v.status = 'done';
  const skipped = STATIONS.filter((s) => v.stations![s.id] === 'skipped').map((s) => s.label);
  d.approvals.push({ id: id(d, 'ap'), gate: 'completeness', memberId: v.memberId, outcome: 'approved', byId, at: d.now });
  member(d, v.memberId).step = 'Your Vyta Day · waiting on NP final review';
  log(d, v.memberId, byId, 'approval', `Completeness check passed by ${staffName(byId)}: every test in${skipped.length ? ` or skipped with a reason (${skipped.join(', ')})` : ''}. Final review is with the NP`);
  return true;
}

// ---------- N3 Final review: sections arrive from the MA, the NP checks only what changed ----------
const dayResults = (d: DemoData, memberId: string) => {
  const v = vytaDayVisit(d, memberId);
  return v ? d.results.filter((r) => r.visitId === v.id) : [];
};
const inFinalReview = (d: DemoData, r: Result) => {
  const rep = d.reports.find((x) => x.memberId === r.memberId && x.kind === 'baseline');
  return rep && rep.status === 'final_review' && !rep.finalReviewedAt ? rep : null;
};

export function decideNewFinding(d: DemoData, reportId: string, resultIdArg: string, decision: NonNullable<Finding['decision']>, byId: string) {
  const r = report(d, reportId);
  if (r.status !== 'final_review' || r.finalReviewedAt) return;
  const hit = vytaDayFindings(r, dayResults(d, r.memberId)).find((x) => x.result.id === resultIdArg);
  if (!hit) return;
  const res = hit.result;
  const f = hit.finding ?? (r.findings.push({
    id: `fd-${res.id}`, resultId: res.id, fromVytaDay: true,
    summary: `${res.marker} ${res.value}${res.unit ? ` ${res.unit}` : ''}, outside the ${res.target ?? 'target'} target · from Your Vyta Day (${res.source})`,
  }), r.findings[r.findings.length - 1]);
  Object.assign(f, { decision, decidedById: byId, decidedAt: d.now });
  log(d, r.memberId, byId, 'finding_decided', `New finding ${res.marker} (Your Vyta Day): ${DECISION_LABEL[decision]}`);
}

// Correct a value with a reason. The band follows the new value; the original is kept for the audit trail.
export function correctResult(d: DemoData, resultIdArg: string, value: number | string, reason: string, byId: string) {
  const res = d.results.find((x) => x.id === resultIdArg);
  const st = STATIONS.find((x) => x.panel === res?.panel);
  if (!res || !st || !reason.trim() || res.skipped || !inFinalReview(d, res) || res.value === value) return;
  res.corrected = { from: res.corrected?.from ?? res.value, reason: reason.trim(), byId, at: d.now };
  const before = res.value;
  res.value = value;
  res.band = bandFor(st.id, res.marker, value);
  log(d, res.memberId, byId, 'result_corrected', `Final review · ${st.label} · ${res.marker} corrected ${before ?? '—'} → ${value}${res.unit ? ` ${res.unit}` : ''}: "${reason.trim()}"`);
}

// Leave a value out of her scores, with a reason. Never counted as zero.
export function excludeResult(d: DemoData, resultIdArg: string, reason: string, byId: string) {
  const res = d.results.find((x) => x.id === resultIdArg);
  if (!res || !reason.trim() || res.skipped || res.excludedFromScore || !inFinalReview(d, res)) return;
  res.excludedFromScore = true;
  res.excludedReason = reason.trim();
  log(d, res.memberId, byId, 'result_excluded', `Final review · ${res.marker} left out of her scores: "${reason.trim()}". Not counted as zero`);
}

export function includeResult(d: DemoData, resultIdArg: string, byId: string) {
  const res = d.results.find((x) => x.id === resultIdArg);
  if (!res || res.skipped || !res.excludedFromScore || !inFinalReview(d, res)) return;
  res.excludedFromScore = false;
  delete res.excludedReason;
  log(d, res.memberId, byId, 'result_included', `Final review · ${res.marker} back in her scores`);
}

export function finishFinalReview(d: DemoData, reportId: string, byId: string): boolean {
  const r = report(d, reportId);
  const v = vytaDayVisit(d, r.memberId);
  const results = dayResults(d, r.memberId);
  if (!canFinishFinalReview(r, v, results).ok) return false;
  const pre = r.preReviewScores ?? r.scores;
  const { body: _body, ...scores } = vytaDayScores(pre, results);
  r.scores = scores;
  r.finalReviewedAt = d.now;
  r.finalReviewedById = byId;
  d.approvals.push({ id: id(d, 'ap'), gate: 'np_final_review', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'approved', byId, at: d.now });
  member(d, r.memberId).step = 'Your Vyta Day · results with your NP';
  log(d, r.memberId, byId, 'approval', `NP final review done · ${staffName(byId)} · VMRI ${pre.vmri} → ${scores.vmri}, biological age ${pre.biologicalAge} → ${scores.biologicalAge}. Ready for the results conversation`);
  return true;
}

// ---------- N4 Results conversation: her choices, and consents pushed to her phone ----------
const presenting = (r: Report) => r.status === 'final_review' && !!r.finalReviewedAt;
const CHOICE_LABEL = { accept: 'Accepted', decline: 'Declined', defer: 'Deferred' } as const;

export function recordChoice(d: DemoData, reportId: string, itemId: string, choice: NonNullable<PlanItem['memberChoice']>, reason: string, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((i) => i.id === itemId);
  if (!item || item.removed || !presenting(r) || (choice !== 'accept' && !reason.trim())) return;
  item.memberChoice = choice;
  item.choiceReason = choice === 'accept' ? undefined : reason.trim();
  log(d, r.memberId, byId, 'member_choice', `Results conversation · ${item.name}: ${CHOICE_LABEL[choice].toLowerCase()} by her${item.choiceReason ? ` ("${item.choiceReason}")` : ''}`);
}

// "Accept the rest": every medication, supplement and peptide she hasn't chosen on yet.
export function acceptRemaining(d: DemoData, reportId: string, byId: string) {
  const r = report(d, reportId);
  if (!presenting(r)) return;
  const open = r.plan.filter((i) => needsChoice(i) && !i.memberChoice);
  if (!open.length) return;
  open.forEach((i) => { i.memberChoice = 'accept'; });
  log(d, r.memberId, byId, 'member_choice', `Results conversation · accepted: ${open.map((i) => i.name).join(', ')}`);
}

export function pushConsent(d: DemoData, reportId: string, itemId: string, byId: string) {
  const r = report(d, reportId);
  const item = r.plan.find((i) => i.id === itemId);
  if (!item?.needsConsentFormId || item.memberChoice !== 'accept' || item.consentAssignmentId || !presenting(r)) return;
  sendForm(d, r.memberId, item.needsConsentFormId, byId);
  item.consentAssignmentId = d.assignments[d.assignments.length - 1].id;
  log(d, r.memberId, byId, 'consent_pushed', `${formTitle(item.needsConsentFormId)} pushed to her phone during the results conversation`);
}

// ---------- N5 Approve and release ----------
export function releaseReport(d: DemoData, reportId: string, byId: string): boolean {
  const r = report(d, reportId);
  if (!canRelease(d, r).ok) return false;
  r.version += 1;
  r.status = 'released';
  r.releasedAt = d.now;
  r.releasedById = byId;
  d.approvals.push({ id: id(d, 'ap'), gate: 'release', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'approved', byId, at: d.now });
  // One order line per accepted item that's supplied from outside (PRD V9). Declined and deferred items aren't ordered.
  const toOrder = r.plan.filter((i) => !i.removed && i.supplier && i.memberChoice === 'accept');
  for (const i of toOrder) d.orders.push({ id: id(d, 'ord'), memberId: r.memberId, reportId: r.id, planItemId: i.id, item: i.name, supplier: i.supplier!, status: 'open', createdAt: d.now });
  const m = member(d, r.memberId);
  m.phase = 'first_30';
  m.step = 'Report and plan released · first 30 days';
  log(d, r.memberId, byId, 'release', `Report and plan v${r.version} released to her app by ${staffName(byId)}. ${toOrder.length} orders created`);
  notify(d, r.memberId, `Your report and plan are ready. Approved by ${staffName(byId)}, ${STAFF.find((x) => x.id === byId)?.title === 'Nurse Practitioner' ? 'NP' : STAFF.find((x) => x.id === byId)?.title}.`);
  return true;
}

// "Not ready": back to final review with a reason. Her choices so far are kept.
export function notReady(d: DemoData, reportId: string, reason: string, byId: string) {
  const r = report(d, reportId);
  if (!presenting(r) || !reason.trim()) return;
  d.approvals.push({ id: id(d, 'ap'), gate: 'release', memberId: r.memberId, reportId: r.id, reportVersion: r.version, outcome: 'sent_back', reason: reason.trim(), byId, at: d.now });
  delete r.finalReviewedAt;
  delete r.finalReviewedById;
  member(d, r.memberId).step = 'Your Vyta Day · waiting on NP final review';
  log(d, r.memberId, byId, 'sent_back', `Release held by ${staffName(byId)}: "${reason.trim()}". Back to final review`);
}

// ---------- N6 Orders ----------
const SUPPLIER_LABEL = { compounding: 'compounding pharmacy', retail: 'retail pharmacy', fullscript: 'Fullscript', peptide_supplier: 'peptide supplier' } as const;
export function placeOrder(d: DemoData, orderId: string, byId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o || o.status === 'placed') return;
  o.status = 'placed';
  o.placedAt = d.now;
  o.placedById = byId;
  log(d, o.memberId, byId, 'order_placed', `Order placed: ${o.item} with the ${SUPPLIER_LABEL[o.supplier]}`);
}

// ---------- M10 SAGE (scripted) and safety flags (G6, N7) ----------
export function askSage(d: DemoData, memberId: string, text: string) {
  const q = text.trim();
  if (!q) return;
  const turn = matchSage(q);
  d.sage.push({ id: id(d, 'sg'), memberId, from: 'member', text: q, at: d.now, flagged: !!turn.flag });
  d.sage.push({ id: id(d, 'sg'), memberId, from: 'sage', text: turn.reply, at: d.now, citation: turn.citation });
  if (turn.flag) {
    d.flags.push({ id: id(d, 'flag'), memberId, source: 'sage', quote: q, severity: turn.flag, status: 'open', raisedAt: d.now, actions: [] });
    log(d, memberId, 'sage', 'flag_raised', `${turn.flag === 'urgent' ? 'Urgent safety' : 'Review'} flag raised by SAGE: "${q}"`);
  }
}

const FLAG_WORDS: Record<FlagAction['kind'], string> = {
  call: 'Called her', message: 'Messaged her', escalate: 'Escalated to the NP', reply: 'Replied to the Guide', order_labs: 'Ordered labs',
  adjust_plan: 'Plan adjustment noted', note: 'Note', close: 'Closed',
};
export function flagAction(d: DemoData, flagId: string, kind: FlagAction['kind'], note: string, byId: string) {
  const f = d.flags.find((x) => x.id === flagId);
  if (!f || f.status === 'closed' || ((kind === 'escalate' || kind === 'close') && !note.trim())) return;
  f.actions = [...(f.actions ?? []), { at: d.now, byId, kind, note: note.trim() }];
  if (kind === 'escalate') f.status = 'escalated';
  if (kind === 'close') { f.status = 'closed'; f.outcome = note.trim(); f.closedAt = d.now; f.closedById = byId; }
  if (kind === 'close') d.approvals.push({ id: id(d, 'ap'), gate: 'safety_close', memberId: f.memberId, outcome: 'approved', reason: note.trim(), byId, at: d.now });
  log(d, f.memberId, byId, kind === 'close' ? 'flag_closed' : 'flag_action', `Safety flag · ${FLAG_WORDS[kind]} (${staffName(byId)})${note.trim() ? `: "${note.trim()}"` : ''}`);
  if (kind === 'message') notify(d, f.memberId, `${staffName(byId).split(' ')[0]} from your care team: ${note.trim() || 'We got your message and will call you shortly.'}`);
}
export { SAGE_SCRIPT };

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
        : rep?.status === 'ready_for_visit' ? 'report ready for Your Vyta Day'
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
    saveIntake(d, memberId, sec.id, { ...answers, ...fillRequired(sec.questions, answers, new Date(d.now).getFullYear()) }, true);
  }
}
