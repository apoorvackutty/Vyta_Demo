// Gate guards (docs/SCHEMA.md §4). The UI disables the gate button and lists `missing` in plain words.
import type { Finding, PlanItem, PlanField, Report, Result, Station, Visit, FormAssignment, Approval } from '../types';
import { STATIONS, UPLOADS, FUNCTIONAL, stationOf } from '../data/stations';
import { FIELD_LABEL, BAND_RANK } from '../data/protocol';

const empty = (v?: string) => !v || !v.trim();

// Fields a † item still needs before the NP can mark it reviewed.
export function unfilled(item: PlanItem): PlanField[] {
  return (item.missing ?? []).filter((f) => empty(item[f]));
}

export const needsReview = (item: PlanItem) => !!item.flag && !item.resolved && !item.removed;

export interface GateCheck {
  ok: boolean;
  missing: string[];
  findingsDecided: number;
  findingsTotal: number;
  itemsResolved: number;
  itemsTotal: number;
}

export function canApprovePreReview(report: Report, results: Result[]): GateCheck {
  const marker = (resultId: string) => results.find((r) => r.id === resultId)?.marker ?? resultId;
  const rank = (resultId: string) => BAND_RANK[results.find((r) => r.id === resultId)?.band ?? 'optimal'];
  const undecided = report.findings.filter((f) => !f.decision).sort((a, b) => rank(a.resultId) - rank(b.resultId));
  const open = report.plan.filter(needsReview);
  const missing: string[] = [];
  if (undecided.length) {
    const names = undecided.slice(0, 3).map((f) => marker(f.resultId)).join(', ');
    missing.push(`${undecided.length} finding${undecided.length > 1 ? 's' : ''} need${undecided.length > 1 ? '' : 's'} a decision (${names}${undecided.length > 3 ? '…' : ''})`);
  }
  for (const item of open) {
    const gaps = unfilled(item);
    if (gaps.length) missing.push(`${item.name}: ${gaps.map((g) => FIELD_LABEL[g].toLowerCase()).join(' and ')} missing`);
    else if (item.flag === 'proposed') missing.push(`${item.name}: proposed step needs your review`);
    else missing.push(`${item.name}: mark as reviewed`);
  }
  if (report.status !== 'draft') missing.push('The draft is not waiting on pre-review');
  return {
    ok: missing.length === 0,
    missing,
    findingsDecided: report.findings.length - undecided.length,
    findingsTotal: report.findings.length,
    itemsResolved: report.plan.length - open.length,
    itemsTotal: report.plan.length,
  };
}

// Values in for one station, e.g. "12 of 15 values in". Functional counts every field; the two unscored ones are optional.
export function stationCount(visit: Visit, results: Result[], station: Station) {
  const rows = results.filter((r) => r.visitId === visit.id && r.panel === stationOf(station).panel && !r.skipped);
  const total = station === 'functional' ? FUNCTIONAL.length : UPLOADS[station].length;
  const needed = station === 'functional' ? FUNCTIONAL.filter((t) => t.scored).length : total;
  const inCount = rows.filter((r) => r.value !== null && r.value !== '').length;
  const toCheck = rows.filter((r) => r.origin === 'scan' && !r.checked).length;
  return { in: inCount, total, needed, toCheck };
}

// Completeness check (MA3 footer, PRD V4): every test is in or skipped with a reason, and every scan value checked.
export function canPassCompleteness(visit: Visit, results: Result[] = []): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!visit.stations) return { ok: false, missing: ['This visit has no test stations'] };
  for (const st of STATIONS) {
    const status = visit.stations[st.id];
    if (status === 'skipped') continue;
    if (status === 'todo') { missing.push(`${st.label}: not started`); continue; }
    const c = stationCount(visit, results, st.id);
    if (status === 'in_progress' || c.in < c.needed) missing.push(`${st.label}: ${c.in} of ${c.total} values in`);
    if (c.toCheck) missing.push(`${st.label}: ${c.toCheck} value${c.toCheck > 1 ? 's' : ''} still to check`);
  }
  if (visit.completeness === 'passed') missing.push('Completeness has already passed');
  return { ok: missing.length === 0, missing };
}

// ---------- N3 Final review ----------
// New since pre-review: Your Vyta Day results out of range. Each needs a decision, like the pre-review findings.
const NEW_FINDING_BANDS = new Set(['needs_attention', 'below_target']);
export function vytaDayFindings(report: Report, visitResults: Result[]): { result: Result; finding?: Finding }[] {
  return visitResults
    .filter((r) => NEW_FINDING_BANDS.has(r.band) && !r.skipped && !r.excludedFromScore)
    .map((r) => ({ result: r, finding: report.findings.find((f) => f.resultId === r.id) }));
}

export function canFinishFinalReview(report: Report, visit: Visit | undefined, visitResults: Result[]): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!visit || visit.completeness !== 'passed') missing.push('Waiting on the completeness check (MA or NP)');
  const open = vytaDayFindings(report, visitResults).filter((x) => !x.finding?.decision);
  if (open.length) missing.push(`${open.length} new finding${open.length > 1 ? 's' : ''} from Your Vyta Day need${open.length > 1 ? '' : 's'} a decision (${open.map((x) => x.result.marker).join(', ')})`);
  if (report.status !== 'final_review') missing.push('The report is not waiting on final review');
  else if (report.finalReviewedAt) missing.push('Final review is already done');
  return { ok: missing.length === 0, missing };
}

// ---------- N4 / N5 ----------
// Items she says yes or no to in the results conversation: medications, supplements, peptides. Habits are just part of the plan.
export const needsChoice = (i: PlanItem) => !i.removed && (i.group === 'prescription' || i.group === 'supplement' || i.group === 'peptide');

export interface ReleaseData { visits: Visit[]; results: Result[]; assignments: FormAssignment[]; approvals: Approval[] }
export interface ReleaseCheck { ok: boolean; missing: string[]; items: { label: string; ok: boolean; detail: string }[] }

// Release (SCHEMA §4): completeness passed, every finding decided, every consent for an accepted item signed, Coach wording approved.
export function canRelease(d: ReleaseData, report: Report): ReleaseCheck {
  const visit = d.visits.find((v) => v.memberId === report.memberId && v.type === 'vyta_day');
  const dayResults = visit ? d.results.filter((r) => r.visitId === visit.id) : [];
  const undecided = report.findings.filter((f) => !f.decision).length + vytaDayFindings(report, dayResults).filter((x) => !x.finding?.decision).length;
  const consentItems = report.plan.filter((i) => !i.removed && i.memberChoice === 'accept' && i.needsConsentFormId);
  const unsigned = consentItems.filter((i) => d.assignments.find((a) => a.id === i.consentAssignmentId)?.status !== 'signed');
  const unchosen = report.plan.filter((i) => needsChoice(i) && !i.memberChoice);
  const wording = d.approvals.some((a) => a.reportId === report.id && a.gate === 'coach_wording' && a.outcome === 'approved');
  const items = [
    { label: 'Completeness', ok: visit?.completeness === 'passed', detail: visit?.completeness === 'passed' ? 'Every test in or skipped with a reason' : 'Waiting on the completeness check' },
    { label: 'NP final review', ok: !!report.finalReviewedAt, detail: report.finalReviewedAt ? 'Changes since pre-review checked, new findings decided' : 'Not done yet' },
    { label: 'All findings decided', ok: undecided === 0, detail: undecided ? `${undecided} still to decide` : `${report.findings.length} decided` },
    { label: 'Her choices recorded', ok: unchosen.length === 0, detail: unchosen.length ? `Still to ask: ${unchosen.map((i) => i.name).join(', ')}` : 'Every medication, supplement and peptide' },
    { label: 'Consents signed', ok: unsigned.length === 0, detail: unsigned.length ? unsigned.map((i) => `${i.name}: ${i.consentAssignmentId ? 'waiting on her signature' : 'consent not sent yet'}`).join('; ') : consentItems.length ? `${consentItems.length} signed on her phone` : 'None needed' },
    { label: 'Coach wording', ok: wording, detail: wording ? 'Approved' : 'Not approved' },
  ];
  const missing = items.filter((x) => !x.ok).map((x) => `${x.label}: ${x.detail}`);
  if (report.status !== 'final_review') missing.push(report.status === 'released' ? 'Already released' : 'The report is not in final review');
  return { ok: missing.length === 0, missing, items };
}
