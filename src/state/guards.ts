// Gate guards (docs/SCHEMA.md §4). The UI disables the gate button and lists `missing` in plain words.
import type { PlanItem, PlanField, Report, Result, Station, Visit } from '../types';
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
