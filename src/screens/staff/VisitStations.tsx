// MA3 Visit stations: InBody → Functional → ShapeScale → VO2 max, then the completeness check (PRD V2, V4).
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, Check, Circle, Clock, MinusCircle } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { BandChip } from '../../components/domain';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls, type Tone } from '../../components/ui';
import { canPassCompleteness } from '../../state/guards';
import { STATIONS, stationOf, SKIP_REASONS, UPLOADS, FUNCTIONAL, functionalBand, type FunctionalId } from '../../data/stations';
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
  const canEdit = (role === 'ma' || role === 'admin') && v.completeness !== 'passed';
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
          {v.completeness === 'passed' ? <Chip tone="ok"><Check size={13} aria-hidden="true" /> Completeness passed</Chip> : <Chip tone="info">Tests in clinic order</Chip>}
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
            <StatusChip status={v.stations![active]} />
          </div>
          {v.stations![active] === 'skipped'
            ? <SkippedNote visit={v} station={active} result={results.find((r) => r.panel === st.panel && r.skipped)} canEdit={canEdit} />
            : active === 'functional'
              ? <FunctionalStation key={v.id} visit={v} results={results.filter((r) => r.panel === 'Functional')} canEdit={canEdit} />
              : <UploadStation visit={v} station={active} results={results.filter((r) => r.panel === st.panel)} canEdit={canEdit} />}
        </Card>
      </div>
      <CompletenessFooter visit={v} canEdit={canEdit} />
    </div>
  );
}

function useBy() {
  const role = useStaffRole();
  return STAFF_BY_ROLE[role];
}

// InBody, ShapeScale and VO2: "Upload" fills the seeded values after 0.8 s (TRD §4); every value stays editable.
function UploadStation({ visit, station, results, canEdit }: { visit: Visit; station: Exclude<Station, 'functional'>; results: Result[]; canEdit: boolean }) {
  const s = useDemo();
  const by = useBy();
  const st = stationOf(station);
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const upload = () => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      s.run((d) => ops.uploadStation(d, visit.id, station, by), `${st.label} uploaded · ${UPLOADS[station].length} values sent to the NP`);
    }, 800);
  };

  if (!results.length) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Upload the {st.label} {station === 'vo2' ? 'report' : 'scan'}. The values fill in for you to check, and each one can be corrected.</p>
        <p role="status" className="text-sm text-plum-900">{busy ? `Reading the ${st.label} ${station === 'vo2' ? 'report' : 'scan'}…` : ''}</p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={upload} disabled={busy} aria-busy={busy}>{busy ? 'Uploading…' : st.upload}</Button>
            <Button variant="danger" onClick={() => setSkipping(true)} disabled={busy}>Skip with reason</Button>
          </div>
        )}
        <SkipDialog open={skipping} visit={visit} station={station} onClose={() => setSkipping(false)} />
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-[13px] text-muted">Source: {st.source}. Bands use the targets from her report.{canEdit ? ' Change any value that doesn\'t match the printout.' : ''}</p>
      <table className="w-full text-sm">
        <thead className="text-left text-[13px] text-muted">
          <tr><th className="pb-1 font-medium">Measure and target</th><th className="pb-1 font-medium">Value</th><th className="pb-1 text-right font-medium">Band</th></tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-t border-line align-middle">
              <td className="py-1.5 pr-2 text-plum-900">{r.marker}<span className="block text-xs text-muted">{r.target ? `Target ${r.target}` : 'No target'}</span></td>
              <td className="py-1.5 pr-2"><ValueInput result={r} canEdit={canEdit} /></td>
              <td className="py-1.5 text-right">{r.band === 'not_scored' ? <span className="text-xs text-muted">Not scored</span> : <BandChip band={r.band} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

// Functional tests: typed in by the MA, with a band that appears as she types (illustrative cutoffs).
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
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {FUNCTIONAL.map((t) => {
          const band = functionalBand(t.id, entry[t.id]);
          const fid = `fn-${t.id}`;
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
                    <input id={fid} inputMode="decimal" className={inputCls} value={entry[t.id]} disabled={!canEdit} onChange={(e) => set(t.id, e.target.value)} />
                  )}
                </Field>
              </div>
              <span className="mb-6 w-32 shrink-0 text-right" aria-live="polite">
                {band && band !== 'not_scored' ? <BandChip band={band} /> : band === 'not_scored' ? <span className="text-xs text-muted">Not scored</span>
                  : entry[t.id].trim() ? <span className="text-xs text-attn-fg">Enter a number</span> : <span className="text-xs text-muted">No band yet</span>}
              </span>
            </div>
          );
        })}
      </div>
      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {missing.length > 0 && <p className="w-full text-[13px] text-plum-900">Still to enter: {missing.join(', ')}</p>}
          <Button onClick={save} disabled={missing.length > 0}>{status === 'done' ? 'Update functional tests' : 'Save functional tests'}</Button>
          <Button variant="ghost" onClick={fillSample}>Fill the rest with sample values</Button>
          {status !== 'done' && <Button variant="danger" onClick={() => setSkipping(true)}>Skip with reason</Button>}
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
      <p className="text-plum-900"><strong>Skipped:</strong> {result?.skipped?.reason}{result?.skipped && ` · ${staffName(result.skipped.byId)} · ${fmtTime(result.skipped.at)}`}</p>
      <p className="rounded-lg bg-watch-bg px-3 py-2 text-watch-fg">Not counted as zero; scores are worked out without it.</p>
      {canEdit && <Button variant="ghost" onClick={() => s.run((d) => ops.unskipStation(d, visit.id, station, by), `${st.label} back to enter results`)}>Enter results instead</Button>}
    </div>
  );
}

function CompletenessFooter({ visit, canEdit }: { visit: Visit; canEdit: boolean }) {
  const s = useDemo();
  const by = useBy();
  const check = canPassCompleteness(visit);
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
              <span className="sm:hidden">Still missing: {STATIONS.filter((x) => visit.stations![x.id] === 'todo' || visit.stations![x.id] === 'in_progress').map((x) => x.label).join(', ') || check.missing.join(', ')}</span>
              <span className="hidden sm:inline">Still missing: {check.missing.join(' · ')}</span>
            </p>
          )}
        </div>
        <Button className="w-full sm:w-auto" disabled={!check.ok || !canEdit} aria-describedby={!check.ok ? 'completeness-missing' : undefined}
          onClick={() => s.run((d) => ops.passCompleteness(d, visit.id, by), `Completeness passed · final review sent to ${staffName(visit.npId).split(' ')[0]} (NP)`)}>
          Pass completeness
        </Button>
      </div>
    </div>
  );
}
