import { describe, it, expect } from 'vitest';
import { buildScenario } from '../scenarios';
import * as ops from '../ops';
import { canPassCompleteness, stationCount } from '../guards';
import { useDemo } from '../store';
import { nameMatches, FUNCTIONAL, UPLOADS } from '../../data/stations';

const setup = () => {
  const d = buildScenario('vyta_day');
  const id = ops.vytaDayVisit(d, 'm-testelle')!.id;
  return { d, id, v: () => d.visits.find((x) => x.id === id)!, row: (marker: string) => d.results.find((r) => r.marker === marker && r.visitId === id)! };
};
const SAMPLE = Object.fromEntries(FUNCTIONAL.map((t) => [t.id, t.seed])) as ops.FunctionalEntry;

describe('Check before apply', () => {
  it('keeps edits made in the review list when applied, tagged as edited with the scan value kept', () => {
    const { d, id, row } = setup();
    ops.applyUpload(d, id, 'inbody', { SMI: 6.6, Weight: 171.0 }, 's-ma');
    expect(row('SMI')).toMatchObject({ value: 6.6, origin: 'scan_edited', checked: true, scanValue: 6.3, band: 'optimal' });
    // Same value as the scan: still plain "From scan", waiting to be checked.
    expect(row('Weight')).toMatchObject({ value: 171, origin: 'scan', checked: false });
    expect(row('BMI')).toMatchObject({ origin: 'scan', checked: false, section: 'Body composition' });
    expect(d.timeline[d.timeline.length - 1].text).toContain('1 corrected before applying');
  });

  it('checks the name on the report', () => {
    expect(nameMatches('Testelle M')).toBe(true);
    expect(nameMatches(' testelle m ')).toBe(true);
    expect(nameMatches('Maren Holt')).toBe(false);
  });
});

describe('Origin tagging', () => {
  it('editing an applied scan value marks it edited and checked; typing the scan value back makes it "From scan"', () => {
    const { d, id, row } = setup();
    ops.uploadStation(d, id, 'vo2', 's-ma');
    const r = row('VO2 max');
    ops.editStationResult(d, r.id, 30, 's-ma');
    expect(row('VO2 max')).toMatchObject({ origin: 'scan_edited', checked: true, scanValue: 32 });
    ops.editStationResult(d, r.id, 32, 's-ma');
    expect(row('VO2 max')).toMatchObject({ origin: 'scan', checked: true });
  });

  it('functional values are "entered" and need no check', () => {
    const { d, id, row } = setup();
    ops.saveFunctional(d, id, SAMPLE, 's-ma');
    expect(row('Grip strength')).toMatchObject({ origin: 'entered', checked: true, section: 'Strength' });
    expect(row('Subjective strength').section).toBe('Recorded only (not scored)');
  });
});

describe('"Check" blocks completeness', () => {
  it('lists unchecked values in the missing text until Mark all checked', () => {
    const { d, id, v } = setup();
    ops.uploadStation(d, id, 'inbody', 's-ma');
    ops.saveFunctional(d, id, SAMPLE, 's-ma');
    ops.skipStation(d, id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    ops.applyUpload(d, id, 'vo2', { 'VO2 max': 31 }, 's-ma');
    expect(canPassCompleteness(v(), d.results).missing).toEqual(['InBody: 15 values still to check', 'VO2 max: 6 values still to check']);
    expect(ops.passCompleteness(d, id, 's-ma')).toBe(false);
    ops.markStationChecked(d, id, 'inbody', 's-ma');
    ops.markStationChecked(d, id, 'vo2', 's-ma');
    expect(canPassCompleteness(v(), d.results).ok).toBe(true);
    expect(ops.passCompleteness(d, id, 's-ma')).toBe(true);
  });

  it('counts values in per station', () => {
    const { d, id, v } = setup();
    expect(stationCount(v(), d.results, 'inbody')).toMatchObject({ in: 0, total: UPLOADS.inbody.length });
    ops.uploadStation(d, id, 'inbody', 's-ma');
    expect(stationCount(v(), d.results, 'inbody')).toMatchObject({ in: 15, total: 15, toCheck: 15 });
    expect(stationCount(v(), d.results, 'functional')).toMatchObject({ in: 0, total: 8, needed: 6 });
  });
});

describe('Re-upload, Clear and Undo', () => {
  it('re-upload is logged and the new scan replaces the old values on apply', () => {
    const { d, id, row } = setup();
    ops.uploadStation(d, id, 'inbody', 's-ma');
    ops.markStationChecked(d, id, 'inbody', 's-ma');
    ops.reuploadStation(d, id, 'inbody', 's-ma');
    expect(d.timeline[d.timeline.length - 1].kind).toBe('station_reupload');
    expect(row('SMI').checked).toBe(true); // her values stay until the new scan is applied
    ops.uploadStation(d, id, 'inbody', 's-ma');
    expect(row('SMI').checked).toBe(false);
    expect(d.results.filter((r) => r.panel === 'InBody').length).toBe(15);
  });

  it('Clear removes the values, blocks completeness, and Undo brings them back with the timeline kept', () => {
    useDemo.getState().loadScenario('vyta_day');
    const id = ops.vytaDayVisit(useDemo.getState(), 'm-testelle')!.id;
    const run = useDemo.getState().run;
    run((d) => ops.applyUpload(d, id, 'inbody', { SMI: 6.6 }, 's-ma'));
    run((d) => ops.clearStation(d, id, 'inbody', 's-ma'), 'InBody cleared', undefined, { memberId: 'm-testelle', by: 's-ma' });
    let s = useDemo.getState();
    expect(s.results.filter((r) => r.panel === 'InBody').length).toBe(0);
    const v = s.visits.find((x) => x.id === id)!;
    expect(v.stations!.inbody).toBe('in_progress');
    expect(canPassCompleteness(v, s.results).missing[0]).toBe('InBody: 0 of 15 values in');
    expect(s.timeline[s.timeline.length - 1].kind).toBe('station_cleared');
    s.toasts[s.toasts.length - 1].undo!();
    s = useDemo.getState();
    expect(s.results.find((r) => r.marker === 'SMI')).toMatchObject({ value: 6.6, origin: 'scan_edited' });
    expect(s.timeline.slice(-2).map((e) => e.kind)).toEqual(['station_cleared', 'undo']);
  });

  it('nothing changes once completeness has passed', () => {
    const { d, id, v } = setup();
    ops.uploadStation(d, id, 'inbody', 's-ma');
    ops.saveFunctional(d, id, SAMPLE, 's-ma');
    ops.skipStation(d, id, 'shapescale', 'Scanner offline – reschedule at 3-month', 's-ma');
    ops.uploadStation(d, id, 'vo2', 's-ma');
    ops.markStationChecked(d, id, 'inbody', 's-ma');
    ops.markStationChecked(d, id, 'vo2', 's-ma');
    ops.passCompleteness(d, id, 's-ma');
    ops.clearStation(d, id, 'inbody', 's-ma');
    expect(d.results.filter((r) => r.panel === 'InBody').length).toBe(15);
    expect(v().stations!.inbody).toBe('done');
  });
});
