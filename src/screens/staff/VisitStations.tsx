// MA3 Visit stations: InBody → Functional → ShapeScale → VO2 max, then the completeness check (PRD V2, V4).
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, Check, Circle, Clock, MinusCircle } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { BandChip, ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls, type Tone } from '../../components/ui';
import { canPassCompleteness, stationCount } from '../../state/guards';
import { SourceLabel, sectionSummary } from '../../components/results';
import { STATIONS, stationOf, SKIP_REASONS, UPLOADS, SECTIONS, REPORT_NAME, nameMatches, FUNCTIONAL, functionalBand, type FunctionalId } from '../../data/stations';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { scoreByPanel } from '../../lib/scores';
import { fmtDate, fmtTime } from '../../lib/time';
import type { Result, Station, StationStatus, Visit } from '../../types';

const staffName = (id?: string) => STAFF.find((s) => s.id === id)?.name ?? '';
const STATUS: Record<StationStatus, { label: string; tone: Tone; Icon: typeof Check }> = {
  todo: { label: 'To do', tone: 'neutral', Icon: Circle },
  in_progress: { label: 'In progress', tone: 'info', Icon: Clock },
  done: { label: 'Done · sent to NP', tone: 'ok', Icon: Check },
  skipped: { label: 'Skipped', tone: 'watch', Icon: MinusCircle },
};
function StatusChip({ status }: { status: StationStatus }) {
  const { label, tone, Icon } = STATUS[status];
  return <Chip tone={tone}><Icon size={12} aria-hidden="true" /> {label}</Chip>;
}

export default function VisitStations() {
  const role = useStaffRole();
  const { visitId = '' } = useParams();
  const s = useDemo();
  const v = s.visits.find((x) => x.id === visitId && x.stations);
  const firstOpen = v ? STATIONS.find((x) => v.stations![x.id] === 'todo' || v.stations![x.id] === 'in_progress')?.id : undefined;
  const [active, setActive] = useState<Station>(firstOpen ?? 'inbody');
  if (!v) return <EmptyState heading="h1" title="Visit not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const m = s.members.find((x) => x.id === v.memberId)!;
  const canEdit = can(role, 'visit_stations') && v.completeness !== 'passed';
  const results = s.results.filter((r) => r.visitId === v.id);
  const st = stationOf(active);
  const scores = scoreByPanel(results);

  return (
    <div className="pb-40 sm:pb-32">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Link to={`/staff/${role}/member/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> {m.name}'s record</Link>
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Your Vyta Day · {m.name}</h1>
            <p className="text-sm text-muted">{fmtDate(v.at)} · {fmtTime(v.at)} · {staffName(v.maId)} (MA) · {staffName(v.npId)} (NP)</p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
          {canEdit && <ActingNote text={actingAs(role, 'visit_stations')} />}
          {v.completeness === 'passed' ? <Chip tone="ok"><Check size={13} aria-hidden="true" /> Completeness passed</Chip> : <Chip tone="info">Tests in clinic order</Chip>}
          </span>
        </header>
        {!canEdit && v.completeness !== 'passed' && <p className="mb-4 rounded-lg bg-info-bg px-4 py-2 text-sm text-info-fg">Read only: the MA enters the test results.</p>}

        <nav aria-label="Test stations" className="mb-4">
          <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {STATIONS.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setActive(x.id)} aria-current={active === x.id ? 'step' : undefined}
                  className={clsx('flex h-full min-h-[64px] w-full flex-col items-start gap-1 rounded-card border bg-paper px-3 py-2 text-left shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-500',
                    active === x.id ? 'border-plum-700 ring-1 ring-plum-700' : 'border-line hover:border-plum-700')}>
                  <span className="text-sm font-semibold text-plum-900">{i + 1} · {x.label}</span>
                  <StatusChip status={v.stations![x.id]} />
                  <CountText visit={v} station={x.id} />
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <p className="mb-4 text-[13px] text-muted">
          Body tests score so far (illustrative): <strong className="tabular-nums text-plum-900">{scores.overall ?? '—'}</strong>
          {' '}from {Object.values(scores.panels).filter((p) => p.score !== null).length} station{Object.values(scores.panels).filter((p) => p.score !== null).length === 1 ? '' : 's'}
          {STATIONS.filter((x) => v.stations![x.id] === 'skipped').map((x) => ` · ${x.label} left out, not counted as zero`).join('')}
        </p>

        <Card as="section" className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-plum-900">{STATIONS.findIndex((x) => x.id === active) + 1} · {st.label}</h2>
            <span className="flex flex-wrap items-center gap-2"><CountText visit={v} station={active} /><StatusChip status={v.stations![active]} /></span>
          </div>
          {v.stations![active] === 'skipped'
            ? <SkippedNote visit={v} station={active} result={results.find((r) => r.panel === st.panel && r.skipped)} canEdit={canEdit} />
            : active === 'functional'
              ? <FunctionalStation key={`${v.id}-${results.some((r) => r.panel === 'Functional') ? 'saved' : 'empty'}`} visit={v} results={results.filter((r) => r.panel === 'Functional')} canEdit={canEdit} />
              : <UploadStation key={active} memberName={m.name} visit={v} station={active} results={results.filter((r) => r.panel === st.panel)} canEdit={canEdit} />}
        </Card>
      </div>
      <CompletenessFooter visit={v} canEdit={canEdit} />
    </div>
  );
}

// "12 of 15 values in", the same count the completeness check uses.
function CountText({ visit, station }: { visit: Visit; station: Station }) {
  const results = useDemo((s) => s.results);
  if (visit.stations![station] === 'skipped') return null;
  const c = stationCount(visit, results, station);
  return <span className="text-xs text-muted"><span className="tabular-nums">{c.in} of {c.total}</span> values in{c.toCheck ? ` · ${c.toCheck} to check` : ''}</span>;
}

function useBy() {
  const role = useStaffRole();
  return STAFF_BY_ROLE[role];
}

// InBody, ShapeScale and VO2: check before apply. Upload → reading (0.8 s, TRD §4) → review the parsed values,
// correct any that don't match the printout → Apply to her record. Applied values stay editable.
function UploadStation({ visit, station, results, canEdit, memberName }: { visit: Visit; station: Exclude<Station, 'functional'>; results: Result[]; canEdit: boolean; memberName: string }) {
  const s = useDemo();
  const by = useBy();
  const st = stationOf(station);
  const doc = station === 'vo2' ? 'report' : 'scan';
  const [phase, setPhase] = useState<'idle' | 'reading' | 'review'>('idle');
  const [review, setReview] = useState<Record<string, string>>({});
  const [skipping, setSkipping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const applied = results.filter((r) => !r.skipped);
  const count = stationCount(visit, s.results, station);
  const read = (again: boolean) => {
    if (again) s.run((d) => ops.reuploadStation(d, visit.id, station, by), `Re-uploading the ${st.label} ${doc} · her current values stay until you apply`);
    setPhase('reading');
    timer.current = setTimeout(() => {
      setReview(Object.fromEntries(UPLOADS[station].map((r) => [r.marker, String(r.value)])));
      setPhase('review');
    }, 800);
  };
  const apply = () => {
    const reviewed: ops.Reviewed = Object.fromEntries(Object.entries(review).map(([k, v]) => [k, Number(v)]));
    const edited = UPLOADS[station].filter((r) => reviewed[r.marker] !== r.value).length;
    s.run((d) => ops.applyUpload(d, visit.id, station, reviewed, by),
      `${st.label} applied · ${UPLOADS[station].length} values${edited ? ` · ${edited} edited` : ''} · sent to the NP`);
    setPhase('idle');
  };

  if (phase === 'reading') return <p role="status" className="text-sm text-plum-900">Reading the {st.label} {doc}…</p>;
  if (phase === 'review') {
    const match = nameMatches(memberName, REPORT_NAME);
    return (
      <div>
        <h3 className="mb-1 text-sm font-semibold text-plum-900">Check before apply</h3>
        <p className="mb-2 text-[13px] text-muted">These are the values read from the {doc}. Correct any that don't match the printout, then apply them to her record.</p>
        <p role="status" className={clsx('mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', match ? 'bg-ok-bg text-ok-fg' : 'bg-danger-bg text-danger-fg')}>
          {match ? <><Check size={14} aria-hidden="true" /> Name on report matches {memberName} ✓</> : <>Name on report ({REPORT_NAME}) does not match {memberName}. Don't apply this {doc}.</>}
        </p>
        {SECTIONS[station].map((sec) => (
          <section key={sec} aria-label={sec} className="mb-3">
            <h4 className="mb-1 text-[13px] font-medium text-muted">{sec}</h4>
            <ul className="divide-y divide-line border-y border-line">
              {UPLOADS[station].filter((r) => r.section === sec).map((r) => (
                <li key={r.marker} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="text-plum-900">{r.marker}</span>
                  <ReviewInput label={r.marker} unit={r.unit} scan={r.value} value={review[r.marker] ?? ''} onCommit={(x) => setReview((v) => ({ ...v, [r.marker]: x }))} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-[44px]" disabled={!match} onClick={apply}>Apply to her record</Button>
          <Button className="min-h-[44px]" variant="ghost" onClick={() => setPhase('idle')}>Cancel</Button>
        </div>
      </div>
    );
  }
  if (!applied.length) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Upload the {st.label} {doc}. You check the values it reads before they go on her record.</p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-[44px]" onClick={() => read(false)}>{st.upload}</Button>
            <Button className="min-h-[44px]" variant="danger" onClick={() => setSkipping(true)}>Skip with reason</Button>
          </div>
        )}
        <SkipDialog open={skipping} visit={visit} station={station} onClose={() => setSkipping(false)} />
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">Source: {st.source}. Bands use the targets from her report.{canEdit ? ' Editing a value confirms it.' : ''}</p>
      {canEdit && (
        <div className="mb-3 flex flex-wrap gap-2">
          {count.toCheck > 0 && <Button className="min-h-[44px]" onClick={() => s.run((d) => ops.markStationChecked(d, visit.id, station, by), `${st.label}: ${count.toCheck} values checked`, undefined, { memberId: visit.memberId, by })}>Mark all checked ({count.toCheck})</Button>}
          <Button className="min-h-[44px]" variant="secondary" onClick={() => read(true)}>Re-upload {doc}</Button>
          <Button className="min-h-[44px]" variant="danger" onClick={() => s.run((d) => ops.clearStation(d, visit.id, station, by), `${st.label} cleared`, undefined, { memberId: visit.memberId, by })}>Clear</Button>
        </div>
      )}
      {SECTIONS[station].map((sec) => {
        const rows = applied.filter((r) => r.section === sec);
        return (
          <section key={sec} aria-label={sec} className="mb-4">
            <h3 className="mb-1 text-[13px] font-medium text-plum-900">{sec} <span className="font-normal text-muted">· {sectionSummary(rows)}</span></h3>
            <table className="w-full text-sm">
              <thead className="sr-only"><tr><th>Measure and target</th><th>Value and source</th><th>Band</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="py-1.5 pr-2 text-plum-900">{r.marker}<span className="block text-xs text-muted">{r.target ? `Target ${r.target}` : 'No target'}</span></td>
                    <td className="py-1.5 pr-2"><ValueInput result={r} canEdit={canEdit} /><span className="mt-1 block"><SourceLabel result={r} /></span></td>
                    <td className="py-1.5 text-right">{r.band === 'not_scored' ? <span className="text-xs text-muted">Not scored</span> : <BandChip band={r.band} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

// One value in the review list: Enter or leaving the field commits; anything that isn't a number reverts.
function ReviewInput({ label, unit, scan, value, onCommit }: { label: string; unit?: string; scan: number | string; value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const n = Number(text.trim());
    if (!text.trim() || !Number.isFinite(n)) { setText(value); return; }
    onCommit(String(n));
  };
  const edited = Number(value) !== scan;
  return (
    <span className="inline-flex items-center gap-1.5">
      <input aria-label={`${label}${unit ? ` (${unit})` : ''}`} inputMode="decimal" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className={clsx(inputCls, 'w-24 px-2 py-1 tabular-nums')} />
      {unit && <span className="text-xs text-muted">{unit}</span>}
      {edited && <span className="text-xs text-info-fg">Edited · scan read {scan}</span>}
    </span>
  );
}

function ValueInput({ result, canEdit }: { result: Result; canEdit: boolean }) {
  const s = useDemo();
  const by = useBy();
  const [text, setText] = useState(String(result.value ?? ''));
  useEffect(() => setText(String(result.value ?? '')), [result.value]);
  const unit = result.unit ? ` ${result.unit}` : '';
  if (!canEdit) return <span className="tabular-nums text-plum-900">{result.value}{unit}</span>;
  const commit = () => {
    const n = Number(text.trim());
    if (!text.trim() || !Number.isFinite(n)) { setText(String(result.value ?? '')); return; }
    if (n === result.value) return;
    s.run((d) => ops.editStationResult(d, result.id, n, by), `${result.marker} changed to ${n}${unit}`, `edit-${result.id}`, { memberId: result.memberId, by });
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input aria-label={`${result.marker}${result.unit ? ` (${result.unit})` : ''}`} inputMode="decimal" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className={clsx(inputCls, 'w-20 px-2 py-1 tabular-nums sm:w-24')} />
      {result.unit && <span className="text-xs text-muted">{result.unit}</span>}
    </span>
  );
}

// Functional tests: typed in by the MA, in sections, with a band that appears as she types (illustrative cutoffs).
function FunctionalStation({ visit, results, canEdit }: { visit: Visit; results: Result[]; canEdit: boolean }) {
  const s = useDemo();
  const by = useBy();
  const saved = Object.fromEntries(FUNCTIONAL.map((t) => [t.id, String(results.find((r) => r.marker === t.marker)?.value ?? '')])) as Record<FunctionalId, string>;
  const [entry, setEntry] = useState<Record<FunctionalId, string>>(saved);
  const [skipping, setSkipping] = useState(false);
  const status = visit.stations!.functional;
  const set = (id: FunctionalId, value: string) => {
    if (status === 'todo') s.run((d) => ops.startStation(d, visit.id, 'functional', by));
    setEntry((e) => ({ ...e, [id]: value }));
  };
  const missing = FUNCTIONAL.filter((t) => t.scored && functionalBand(t.id, entry[t.id]) === null).map((t) => t.label);
  const toEntry = () => Object.fromEntries(FUNCTIONAL.map((t) => [t.id, t.choices ? entry[t.id] : entry[t.id].trim() === '' ? '' : Number(entry[t.id])]).filter(([, x]) => x !== '')) as ops.FunctionalEntry;
  const save = () => {
    const again = status === 'done';
    s.run((d) => ops.saveFunctional(d, visit.id, toEntry(), by), again ? 'Functional tests updated · sent to the NP' : 'Functional tests saved · sent to the NP',
      undefined, again ? { memberId: visit.memberId, by } : undefined);
  };
  const fillSample = () => setEntry((e) => Object.fromEntries(FUNCTIONAL.map((t) => [t.id, e[t.id] || String(t.seed)])) as Record<FunctionalId, string>);

  return (
    <div>
      <p className="mb-3 rounded-lg bg-cream-100 px-3 py-2 text-[13px] text-plum-900">
        Bands use <strong>illustrative cutoffs</strong> until the clinic confirms its own. Subjective strength and exercise consistency are recorded but not scored.
      </p>
      {SECTIONS.functional.map((sec) => {
        const tests = FUNCTIONAL.filter((t) => t.section === sec);
        const rows = results.filter((r) => r.section === sec);
        return (
          <section key={sec} aria-label={sec} className="mb-4">
            <h3 className="mb-2 text-[13px] font-medium text-plum-900">{sec}{rows.length > 0 && <span className="font-normal text-muted"> · {sectionSummary(rows)}</span>}</h3>
            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
              {tests.map((t) => {
                const band = functionalBand(t.id, entry[t.id]);
                const fid = `fn-${t.id}`;
                const savedRow = results.find((r) => r.marker === t.marker);
                const unchanged = savedRow && String(savedRow.value) === entry[t.id];
                return (
                  <div key={t.id} className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <Field label={`${t.label}${t.unit ? ` (${t.unit})` : ''}`} htmlFor={fid} hint={t.scored ? `${t.rule} · illustrative` : t.rule}>
                        {t.choices ? (
                          <select id={fid} className={inputCls} value={entry[t.id]} disabled={!canEdit} onChange={(e) => set(t.id, e.target.value)}>
                            <option value="">Choose…</option>
                            {t.choices.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input id={fid} inputMode="decimal" className={inputCls} value={entry[t.id]} disabled={!canEdit} placeholder={`e.g. ${t.seed}`} onChange={(e) => set(t.id, e.target.value)} />
                        )}
                      </Field>
                    </div>
                    <span className="mb-6 flex w-32 shrink-0 flex-col items-end gap-1 text-right">
                      <span aria-live="polite">
                        {band && band !== 'not_scored' ? <BandChip band={band} /> : band === 'not_scored' ? <span className="text-xs text-muted">Not scored</span>
                          : entry[t.id].trim() ? <span className="text-xs text-attn-fg">Enter a number</span> : <span className="text-xs text-muted">No band yet</span>}
                      </span>
                      {unchanged && <SourceLabel result={savedRow} />}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {missing.length > 0 && <p className="w-full text-[13px] text-plum-900">Still to enter: {missing.join(', ')}</p>}
          <Button className="min-h-[44px]" onClick={save} disabled={missing.length > 0}>{status === 'done' ? 'Update functional tests' : 'Save functional tests'}</Button>
          <Button className="min-h-[44px]" variant="ghost" onClick={fillSample}>Fill the rest with sample values</Button>
          {results.length > 0 && <Button className="min-h-[44px]" variant="danger" onClick={() => s.run((d) => ops.clearStation(d, visit.id, 'functional', by), 'Functional tests cleared', undefined, { memberId: visit.memberId, by })}>Clear</Button>}
          {status !== 'done' && <Button className="min-h-[44px]" variant="danger" onClick={() => setSkipping(true)}>Skip with reason</Button>}
        </div>
      )}
      <SkipDialog open={skipping} visit={visit} station="functional" onClose={() => setSkipping(false)} />
    </div>
  );
}

function SkipDialog({ open, visit, station, onClose }: { open: boolean; visit: Visit; station: Station; onClose: () => void }) {
  const s = useDemo();
  const by = useBy();
  const st = stationOf(station);
  const [reason, setReason] = useState(SKIP_REASONS[0]);
  const [note, setNote] = useState('');
  const final = reason === 'Other' ? note.trim() : reason;
  const skip = () => {
    s.run((d) => ops.skipStation(d, visit.id, station, final, by), `${st.label} skipped · left out of her scores, not counted as zero`);
    onClose(); setNote('');
  };
  return (
    <Dialog open={open} title={`Skip ${st.label} with a reason`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!final} onClick={skip}>Skip {st.label}</Button></>}>
      <p className="text-sm text-muted">A skipped test is not counted as zero: her scores are worked out without it, and the NP sees why.</p>
      <fieldset className="space-y-1">
        <legend className="mb-1 text-[13px] font-medium text-plum-900">Reason</legend>
        {SKIP_REASONS.map((r) => (
          <label key={r} className="flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-plum-900">
            <input type="radio" name="skip-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-plum-700" /> {r}
          </label>
        ))}
      </fieldset>
      {reason === 'Other' && (
        <Field label="What is the reason?" htmlFor="skip-note" hint={!note.trim() ? 'Add a short reason so the NP knows why.' : undefined}>
          <input id="skip-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      )}
    </Dialog>
  );
}

function SkippedNote({ visit, station, result, canEdit }: { visit: Visit; station: Station; result?: Result; canEdit: boolean }) {
  const s = useDemo();
  const by = useBy();
  const st = stationOf(station);
  return (
    <div className="space-y-2 text-sm">
      <p className="flex flex-wrap items-center gap-2 text-plum-900">{result && <SourceLabel result={result} />}{result?.skipped && <span className="text-muted">{staffName(result.skipped.byId)} · {fmtTime(result.skipped.at)}</span>}</p>
      <p className="rounded-lg bg-watch-bg px-3 py-2 text-watch-fg">Not counted as zero; scores are worked out without it.</p>
      {canEdit && <Button variant="ghost" onClick={() => s.run((d) => ops.unskipStation(d, visit.id, station, by), `${st.label} back to enter results`)}>Enter results instead</Button>}
    </div>
  );
}

function CompletenessFooter({ visit, canEdit }: { visit: Visit; canEdit: boolean }) {
  const s = useDemo();
  const role = useStaffRole();
  const by = useBy();
  const check = canPassCompleteness(visit, s.results);
  const inCount = STATIONS.filter((x) => visit.stations![x.id] === 'done' || visit.stations![x.id] === 'skipped').length;
  if (visit.completeness === 'passed') {
    return (
      <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-3 shadow-card sm:px-6">
        <p className="mx-auto max-w-5xl text-sm text-plum-900"><Check size={14} className="mr-1 inline" aria-hidden="true" />Completeness passed. Final review is with {staffName(visit.npId)} (NP).</p>
      </div>
    );
  }
  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-2 shadow-card sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1 text-[13px] text-plum-900">
          <p><strong>Completeness check</strong> · <span className="tabular-nums">{inCount} of {STATIONS.length}</span> <span className="hidden sm:inline">tests in or skipped</span><span className="sm:hidden">in</span> · owner: MA or NP (to confirm)</p>
          {!check.ok && (
            <p id="completeness-missing" className="text-muted">
              {/* Small screens: station names only, so the footer leaves room for the tests. */}
              <span className="sm:hidden">Still missing: {[...new Set(check.missing.map((x) => x.split(':')[0]))].map((label) => {
                const toCheck = check.missing.find((x) => x.startsWith(`${label}:`) && x.endsWith('to check'));
                return toCheck ? `${label} (${toCheck.split(': ')[1].replace(' values still', '').replace(' value still', '')})` : label;
              }).join(', ')}</span>
              <span className="hidden sm:inline">Still missing: {check.missing.join(' · ')}</span>
            </p>
          )}
        </div>
        {canEdit && <ActingNote text={actingAs(role, 'visit_stations')} className="max-sm:hidden" />}
        <Button className="w-full sm:w-auto" disabled={!check.ok || !canEdit} aria-describedby={!check.ok ? 'completeness-missing' : undefined}
          onClick={() => s.run((d) => ops.passCompleteness(d, visit.id, by), `Completeness passed · final review sent to ${staffName(visit.npId).split(' ')[0]} (NP)`)}>
          Pass completeness
        </Button>
      </div>
    </div>
  );
}
