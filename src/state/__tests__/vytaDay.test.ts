import { describe, it, expect } from 'vitest';
import { buildScenario, SCENARIOS } from '../scenarios';
import * as ops from '../ops';
import { canPassCompleteness } from '../guards';
import { getQueue } from '../queues';
import { functionalBand, rangeBand, FUNCTIONAL } from '../../data/stations';
import { scoreResults, scoreByPanel } from '../../lib/scores';
import type { Result } from '../../types';
import { can, actingAs } from '../permissions';
import { STAFF_BY_ROLE } from '../../data/seed';

const setup = () => {
  const d = buildScenario('vyta_day');
  const v = ops.vytaDayVisit(d, 'm-testelle')!;
  return { d, v: () => d.visits.find((x) => x.id === v.id)! };
};
const SAMPLE = Object.fromEntries(FUNCTIONAL.map((t) => [t.id, t.seed])) as ops.FunctionalEntry;

describe('Scenario 4: Your Vyta Day – morning', () => {
  it('is ready, with the report ready for the visit and every station to do', () => {
    const { d, v } = setup();
    expect(SCENARIOS.find((s) => s.id === 'vyta_day')!.ready).toBe(true);
    expect(d.reports[0].status).toBe('ready_for_visit');
    expect(d.approvals.map((a) => a.gate)).toEqual(['np_pre_review', 'coach_wording']);
    expect(v().stations).toEqual({ inbody: 'todo', functional: 'todo', shapescale: 'todo', vo2: 'todo' });
    expect(v().completeness).toBe('open');
  });

  it('MA1 shows "Your Vyta Day · 8:30" with Start visit', () => {
    const { d } = setup();
    const item = getQueue(d, 'ma').find((q) => q.label.startsWith('Your Vyta Day'))!;
    expect(item.label).toBe('Your Vyta Day · 8:30');
    expect(item.primary?.label).toBe('Start visit');
    expect(item.primary?.action.type).toBe('start_visit');
  });
});

describe('MA3 stations', () => {
  it('upload fills InBody with the seeded values and bands them against the report targets', () => {
    const { d, v } = setup();
    ops.startVisit(d, v().id, 's-ma');
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    const inbody = d.results.filter((r) => r.panel === 'InBody');
    expect(inbody.length).toBe(15);
    expect(inbody.every((r) => r.source === 'InBody scan')).toBe(true);
    expect(inbody.find((r) => r.marker === 'Skeletal muscle mass')!.band).toBe('optimal');
    expect(inbody.find((r) => r.marker === 'Visceral fat area')!.band).toBe('needs_attention');
    expect(inbody.find((r) => r.marker === 'SMI')!.band).toBe('below_target');
    expect(v().stations!.inbody).toBe('done');
    expect(d.reports[0].status).toBe('final_review');
  });

  it('editing a value re-bands it and is logged', () => {
    const { d, v } = setup();
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    const smi = d.results.find((r) => r.marker === 'SMI')!;
    ops.editStationResult(d, smi.id, 6.6, 's-ma');
    expect(d.results.find((r) => r.id === smi.id)!.band).toBe('optimal');
    expect(d.timeline[d.timeline.length - 1].text).toContain('SMI: 6.3 → 6.6');
  });

  it('functional bands follow the illustrative cutoffs', () => {
    expect(functionalBand('grip', '58')).toBe('optimal');
    expect(functionalBand('grip', '61')).toBe('elite');
    expect(functionalBand('grip', '30')).toBe('watch');
    expect(functionalBand('grip', '')).toBeNull();
    expect(functionalBand('grip', 'abc')).toBeNull();
    expect(functionalBand('carry', 100)).toBe('elite');
    expect(functionalBand('gait', 7.6)).toBe('watch');
    expect(functionalBand('sitStand', 'One-hand assistance')).toBe('watch');
    expect(functionalBand('sitStand', 'Unable')).toBe('needs_attention');
    expect(functionalBand('subjective', 'Fair')).toBe('not_scored');
    expect(rangeBand(27.6, { min: 18.5, max: 24.9 })).toBe('watch');
  });

  it('functional save needs every scored test and records the unscored ones too', () => {
    const { d, v } = setup();
    expect(ops.saveFunctional(d, v().id, { ...SAMPLE, grip: undefined }, 's-ma')).toBe(false);
    expect(ops.saveFunctional(d, v().id, SAMPLE, 's-ma')).toBe(true);
    const fn = d.results.filter((r) => r.panel === 'Functional');
    expect(fn.length).toBe(8);
    expect(fn.find((r) => r.marker === 'Subjective strength')!.band).toBe('not_scored');
    expect(v().stations!.functional).toBe('done');
  });

  it('skipping ShapeScale stores a skipped result left out of scores', () => {
    const { d, v } = setup();
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    const r = d.results.find((x) => x.panel === 'ShapeScale')!;
    expect(r.skipped?.reason).toBe('Scanner offline – reschedule at 3-month');
    expect(r.excludedFromScore).toBe(true);
    expect(r.value).toBeNull();
    expect(v().stations!.shapescale).toBe('skipped');
  });
});

describe('Completeness check', () => {
  it('stays blocked, listing what is missing, until every station is done or skipped', () => {
    const { d, v } = setup();
    expect(canPassCompleteness(v(), d.results).missing).toEqual(['InBody: not started', 'Functional: not started', 'ShapeScale: not started', 'VO2 max: not started']);
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    ops.saveFunctional(d, v().id, SAMPLE, 's-ma');
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    expect(ops.passCompleteness(d, v().id, 's-ma')).toBe(false);
    expect(canPassCompleteness(v(), d.results).missing).toEqual(['InBody: 15 values still to check', 'VO2 max: not started']);
    ops.markStationChecked(d, v().id, 'inbody', 's-ma');
    ops.uploadStation(d, v().id, 'vo2', 's-ma');
    ops.markStationChecked(d, v().id, 'vo2', 's-ma');
    expect(getQueue(d, 'ma').some((q) => q.label === 'Completeness check')).toBe(true);
    expect(ops.passCompleteness(d, v().id, 's-ma')).toBe(true);
    expect(v().completeness).toBe('passed');
  });

  it('passing puts the final review in the NP queue and takes the visit off the MA list', () => {
    const { d, v } = setup();
    expect(getQueue(d, 'np').some((q) => q.label.startsWith('Final review'))).toBe(false);
    ops.startVisit(d, v().id, 's-ma');
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    ops.saveFunctional(d, v().id, SAMPLE, 's-ma');
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    ops.uploadStation(d, v().id, 'vo2', 's-ma');
    ops.markStationChecked(d, v().id, 'inbody', 's-ma');
    ops.markStationChecked(d, v().id, 'vo2', 's-ma');
    ops.passCompleteness(d, v().id, 's-ma');
    const task = getQueue(d, 'np').find((q) => q.label.startsWith('Final review'))!;
    expect(task.reason).toContain('ShapeScale skipped');
    expect(task.primary?.action).toEqual({ type: 'open_record', memberId: 'm-testelle' });
    expect(getQueue(d, 'ma').some((q) => q.memberId === 'm-testelle' && (q.label.startsWith('Your Vyta Day') || q.label === 'Completeness check'))).toBe(false);
    expect(d.approvals[d.approvals.length - 1].gate).toBe('completeness');
    // Locked once passed.
    ops.skipStation(d, v().id, 'vo2', 'Other reason', 's-ma');
    expect(v().stations!.vo2).toBe('done');
  });

  it('every station action writes a timeline event', () => {
    const { d, v } = setup();
    const before = d.timeline.length;
    ops.startVisit(d, v().id, 's-ma');
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    ops.saveFunctional(d, v().id, SAMPLE, 's-ma');
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    ops.uploadStation(d, v().id, 'vo2', 's-ma');
    ops.markStationChecked(d, v().id, 'inbody', 's-ma');
    ops.markStationChecked(d, v().id, 'vo2', 's-ma');
    ops.passCompleteness(d, v().id, 's-ma');
    expect(d.timeline.length - before).toBe(8);
  });
});

describe('Scores: a skipped test never counts as zero', () => {
  const r = (marker: string, band: Result['band'], extra: Partial<Result> = {}): Result =>
    ({ id: marker, memberId: 'm', panel: extra.panel ?? 'P', marker, value: 1, band, source: 's', ...extra });

  it('leaves a skipped result out instead of scoring it zero', () => {
    const kept = [r('a', 'optimal'), r('b', 'watch')];
    const skipped = r('scan', 'not_scored', { value: null, skipped: { reason: 'offline', byId: 's-ma', at: '' }, excludedFromScore: true });
    const withSkip = scoreResults([...kept, skipped]);
    expect(withSkip.score).toBe(scoreResults(kept).score);
    expect(withSkip.counted).toBe(2);
    expect(withSkip.excluded).toEqual(['scan']);
    // Had it counted as zero, the score would have dropped.
    expect(withSkip.score).toBeGreaterThan(Math.round((85 + 60 + 0) / 3));
  });

  it('a skipped panel drops out of the overall score instead of dragging it down', () => {
    const panels = [r('a', 'optimal', { panel: 'InBody' }), r('b', 'elite', { panel: 'VO2' })];
    const shape = r('ShapeScale scan', 'needs_attention', { panel: 'ShapeScale', value: null, skipped: { reason: 'offline', byId: 's-ma', at: '' }, excludedFromScore: true });
    const { overall, panels: by } = scoreByPanel([...panels, shape]);
    expect(by.ShapeScale.score).toBeNull();
    expect(overall).toBe(scoreByPanel(panels).overall);
  });

  it('scenario 4 scores the same with ShapeScale skipped as without it', () => {
    const { d, v } = setup();
    ops.uploadStation(d, v().id, 'inbody', 's-ma');
    ops.uploadStation(d, v().id, 'vo2', 's-ma');
    const without = scoreByPanel(d.results.filter((x) => x.visitId === v().id)).overall;
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    expect(scoreByPanel(d.results.filter((x) => x.visitId === v().id)).overall).toBe(without);
  });
});

describe('Super admin on Your Vyta Day', () => {
  const ADMIN = STAFF_BY_ROLE.admin;

  it('may take every MA visit action, labelled "Acting as MA"; other roles may not', () => {
    for (const a of ['start_visit', 'visit_stations'] as const) {
      expect(can('admin', a)).toBe(true);
      expect(can('ma', a)).toBe(true);
      expect(actingAs('admin', a)).toBe('Acting as MA');
      expect(actingAs('ma', a)).toBeNull();
      for (const r of ['guide', 'np', 'coach'] as const) expect(can(r, a)).toBe(false);
    }
  });

  it('sees Start visit and gets the queue row labelled as the MA\'s', () => {
    const { d } = setup();
    const item = getQueue(d, 'admin').find((q) => q.label === 'Your Vyta Day · 8:30')!;
    expect(item.primary?.label).toBe('Start visit');
    expect(item.roles[0]).toBe('ma');
    expect(getQueue(d, 'guide').find((q) => q.label === 'Your Vyta Day · 8:30')!.primary?.label).toBe('Open');
  });

  it('runs the whole visit, with every action recorded under her own staff id', () => {
    const { d, v } = setup();
    const before = d.timeline.length;
    ops.startVisit(d, v().id, ADMIN);
    ops.uploadStation(d, v().id, 'inbody', ADMIN);
    ops.saveFunctional(d, v().id, SAMPLE, ADMIN);
    ops.skipStation(d, v().id, 'shapescale', 'Scanner offline – reschedule at 3-month', ADMIN);
    ops.uploadStation(d, v().id, 'vo2', ADMIN);
    ops.markStationChecked(d, v().id, 'inbody', ADMIN);
    ops.markStationChecked(d, v().id, 'vo2', ADMIN);
    expect(ops.passCompleteness(d, v().id, ADMIN)).toBe(true);
    const events = d.timeline.slice(before);
    expect(events.length).toBe(8);
    expect(events.every((e) => e.by === ADMIN)).toBe(true);
    expect(events[events.length - 1].text).toContain('Quinn Harper');
    expect(d.results.find((r) => r.panel === 'ShapeScale')!.skipped!.byId).toBe(ADMIN);
    expect(d.approvals[d.approvals.length - 1]).toMatchObject({ gate: 'completeness', byId: ADMIN });
    expect(getQueue(d, 'np').some((q) => q.label.startsWith('Final review'))).toBe(true);
  });

  it('is still blocked by the completeness guard and the functional entry check', () => {
    const { d, v } = setup();
    ops.uploadStation(d, v().id, 'inbody', ADMIN);
    expect(ops.passCompleteness(d, v().id, ADMIN)).toBe(false);
    expect(v().completeness).toBe('open');
    expect(ops.saveFunctional(d, v().id, { ...SAMPLE, grip: 'abc' }, ADMIN)).toBe(false);
    expect(v().stations!.functional).toBe('todo');
    ops.skipStation(d, v().id, 'vo2', '   ', ADMIN);
    expect(v().stations!.vo2).toBe('todo');
  });
});
