// N3 Final review (Your Vyta Day): sections light up as the MA finishes each station; the NP sees only what
// changed since her pre-review, decides any new findings, and can correct a value or leave one out (with a reason).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Circle, Clock, Equal, MinusCircle, PencilLine, Presentation, Undo2 } from 'lucide-react';
import { useDemo, ops } from '../../state/store';
import { useStaffRole } from '../../components/shell';
import { BandChip, ActingNote } from '../../components/domain';
import { can, actingAs } from '../../state/permissions';
import { SourceLabel, fmtValue } from '../../components/results';
import { Button, Card, Chip, Dialog, EmptyState, Field, inputCls, type Tone } from '../../components/ui';
import { STAFF, STAFF_BY_ROLE } from '../../data/seed';
import { STATIONS } from '../../data/stations';
import { canFinishFinalReview, vytaDayFindings } from '../../state/guards';
import { vytaDayScores, VMRI_BAND_LABEL } from '../../lib/scores';
import { fmtDate, fmtTime } from '../../lib/time';
import type { Finding, Report, Result, StationStatus, Visit } from '../../types';

const staffFirst = (sid?: string) => STAFF.find((s) => s.id === sid)?.name.split(' ')[0] ?? '';
const DECISIONS = [
  { id: 'treat', label: 'Treat' }, { id: 'refer', label: 'Refer' }, { id: 'monitor', label: 'Monitor' }, { id: 'dismiss', label: 'Dismiss' },
] as const;
const SECTION_STATE: Record<StationStatus, { label: string; tone: Tone; Icon: typeof Check }> = {
  todo: { label: 'Waiting on the MA', tone: 'neutral', Icon: Circle },
  in_progress: { label: 'MA entering now', tone: 'info', Icon: Clock },
  done: { label: 'Arrived', tone: 'ok', Icon: Check },
  skipped: { label: 'Skipped · left out of scores', tone: 'watch', Icon: MinusCircle },
};

export default function FinalReview() {
  const role = useStaffRole();
  const { id = '' } = useParams();
  const s = useDemo();
  const m = s.members.find((x) => x.id === id);
  const report = s.reports.find((r) => r.memberId === id && r.kind === 'baseline');
  const visit = s.visits.find((v) => v.memberId === id && v.type === 'vyta_day' && v.stations);
  if (!m) return <EmptyState heading="h1" title="Member not found" action={<Link className="text-terracotta-700 underline" to={`/staff/${role}/today`}>Back to Today</Link>} />;
  const back = <Link to={`/staff/${role}/member/${m.id}`} className="mb-3 inline-flex min-h-[28px] items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} aria-hidden="true" /> {m.name}'s record</Link>;
  if (!report || !visit || !['final_review', 'released'].includes(report.status)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{back}
        <Card><EmptyState heading="h1" title="Final review opens when her visit starts" body={visit ? `Your Vyta Day is ${fmtDate(visit.at)} at ${fmtTime(visit.at)}. Sections arrive here as Jordan (MA) finishes each test.` : 'Her Vyta Day is booked once the Coach approves the wording.'} /></Card>
      </div>
    );
  }
  const results = s.results.filter((r) => r.visitId === visit.id);
  const open = report.status === 'final_review' && !report.finalReviewedAt;
  const canEdit = open && can(role, 'final_review');
  const arrived = STATIONS.filter((x) => ['done', 'skipped'].includes(visit.stations![x.id])).length;

  return (
    <div className="pb-36 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {back}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold leading-tight text-plum-700">Final review · {m.name}</h1>
            <p className="text-sm text-muted">Your Vyta Day · {fmtDate(visit.at)} · {arrived} of {STATIONS.length} sections in · pre-reviewed v{report.version}</p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            {canEdit && <ActingNote text={actingAs(role, 'final_review')} />}
            {report.finalReviewedAt
              ? <Chip tone="ok"><Check size={13} aria-hidden="true" /> Final review done · {staffFirst(report.finalReviewedById)} · {fmtTime(report.finalReviewedAt)}</Chip>
              : visit.completeness === 'passed' ? <Chip tone="watch">Waiting on NP final review</Chip> : <Chip tone="info"><Clock size={13} aria-hidden="true" /> Tests in progress</Chip>}
          </span>
        </header>
        {!can(role, 'final_review') && open && <p className="mb-4 rounded-lg bg-info-bg px-4 py-2 text-sm text-info-fg">Read only: the NP does the final review.</p>}

        <div className="grid items-start gap-5 xl:grid-cols-12">
          <Changes report={report} visit={visit} results={results} canEdit={canEdit} />
          <section aria-labelledby="sections-h" className="min-w-0 space-y-3 xl:col-span-7">
            <h2 id="sections-h" className="text-base font-semibold text-plum-900">Your Vyta Day sections <span className="text-xs font-normal text-muted">· light up as Jordan finishes each test</span></h2>
            {STATIONS.map((st, i) => (
              <StationSection key={st.id} index={i + 1} label={st.label} status={visit.stations![st.id]}
                rows={results.filter((r) => r.panel === st.panel)} canEdit={canEdit} />
            ))}
            <Card className="p-4 text-sm">
              <p className="font-semibold text-plum-900">Labs and HEAL plan</p>
              <p className="mt-0.5 text-muted">Unchanged since your pre-review: {s.results.filter((r) => r.memberId === m.id && r.visitId !== visit.id).length} lab markers, {report.findings.filter((f) => !f.fromVytaDay).length} findings decided, {report.plan.filter((p) => !p.removed).length} plan items.</p>
            </Card>
          </section>
        </div>
      </div>
      <Footer report={report} visit={visit} results={results} canEdit={canEdit} memberId={m.id} />
    </div>
  );
}

// "Only what changed since pre-review": scores before → now, new findings, and the NP's own corrections.
function Changes({ report, visit, results, canEdit }: { report: Report; visit: Visit; results: Result[]; canEdit: boolean }) {
  const pre = report.preReviewScores ?? report.scores;
  const now = report.finalReviewedAt ? { ...report.scores, body: null } : vytaDayScores(pre, results);
  const fresh = vytaDayFindings(report, results);
  const edits = results.filter((r) => r.corrected || (r.excludedFromScore && !r.skipped));
  const skipped = results.filter((r) => r.skipped);
  const rows: { label: string; before: number; after: number; unit?: string; better: 'up' | 'down'; note?: string }[] = [
    { label: 'VMRI', before: pre.vmri, after: now.vmri, better: 'up', note: VMRI_BAND_LABEL[now.vmriBand] },
    { label: 'Biological age', before: pre.biologicalAge, after: now.biologicalAge, unit: 'years', better: 'down' },
    { label: 'Symptoms', before: pre.symptoms, after: now.symptoms, better: 'up', note: 'From her intake' },
  ];
  return (
    <section aria-labelledby="diff-h" className="min-w-0 space-y-4 xl:sticky xl:top-16 xl:col-span-5">
      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 id="diff-h" className="text-base font-semibold text-plum-900">What changed since pre-review</h2>
          <p className="text-xs text-muted">Only the differences. Scores are illustrative and recalculate as sections arrive; skipped tests are left out, never zero.</p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Scores at pre-review and now</caption>
          <thead className="text-left text-[13px] text-muted"><tr><th className="px-4 py-1.5 font-medium">Score</th><th className="font-medium">Pre-review</th><th className="font-medium">Now</th><th className="pr-4 font-medium">Change</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const delta = r.after - r.before;
              const good = delta !== 0 && (r.better === 'up' ? delta > 0 : delta < 0);
              const Icon = delta === 0 ? Equal : delta > 0 ? ArrowUp : ArrowDown;
              return (
                <tr key={r.label} className="border-t border-line">
                  <td className="px-4 py-2 font-medium text-plum-900">{r.label}{r.note && <span className="block text-xs font-normal text-muted">{r.note}</span>}</td>
                  <td className="tabular-nums text-muted">{r.before}{r.unit ? ` ${r.unit}` : ''}</td>
                  <td className="font-semibold tabular-nums text-plum-900">{r.after}{r.unit ? ` ${r.unit}` : ''}</td>
                  <td className="pr-4">
                    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', delta === 0 ? 'text-muted' : good ? 'text-ok-fg' : 'text-attn-fg')}>
                      <Icon size={13} aria-hidden="true" />{delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta}${good ? ' · better' : ' · worse'}`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {'body' in now && now.body !== null && <p className="border-t border-line px-4 py-2 text-xs text-muted">Body tests so far score {now.body} (illustrative){skipped.length ? ` · ${skipped.map((x) => x.panel).join(', ')} left out` : ''}.</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-semibold text-plum-900">New findings</h2>
          <span className="text-xs tabular-nums text-muted">{fresh.filter((x) => x.finding?.decision).length} of {fresh.length} decided</span>
        </div>
        {fresh.length === 0
          ? <p className="px-4 py-3 text-sm text-muted">{visit.completeness === 'passed' ? 'Nothing new out of range from Your Vyta Day.' : 'None yet. Out-of-range body tests show here as they arrive.'}</p>
          : <ul>{fresh.map((x) => <NewFinding key={x.result.id} result={x.result} finding={x.finding} reportId={report.id} canEdit={canEdit} />)}</ul>}
      </Card>

      {(edits.length > 0 || skipped.length > 0) && (
        <Card className="p-4">
          <h2 className="mb-2 text-base font-semibold text-plum-900">Corrections and left out</h2>
          <ul className="space-y-1.5 text-sm text-plum-900">
            {skipped.map((r) => <li key={r.id}><strong>{r.panel}</strong> skipped by the MA: {r.skipped!.reason}</li>)}
            {edits.map((r) => (
              <li key={r.id}>
                <strong>{r.marker}</strong>{' '}
                {r.corrected && <>corrected {r.corrected.from ?? '—'} → {fmtValue(r)}: “{r.corrected.reason}”</>}
                {r.excludedFromScore && <>{r.corrected ? '; ' : ''}left out of scores: “{r.excludedReason}”</>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function NewFinding({ result: r, finding: f, reportId, canEdit }: { result: Result; finding?: Finding; reportId: string; canEdit: boolean }) {
  const { run } = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  return (
    <li className={clsx('border-b border-line px-4 py-3 last:border-b-0', !f?.decision && 'bg-cream-100/60')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Chip tone="plum">New</Chip>
        <span className="font-semibold text-plum-900">{r.marker}</span>
        <span className="font-semibold tabular-nums text-plum-900">{fmtValue(r)}</span>
        <BandChip band={r.band} />
        {r.target && <span className="text-xs text-muted">Target {r.target}</span>}
      </div>
      <p className="mt-0.5 text-xs text-muted">From {r.source}</p>
      <div role="group" aria-label={`Decision for ${r.marker}`} className="mt-2 inline-flex overflow-hidden rounded-lg border border-plum-700">
        {DECISIONS.map((d, i) => (
          <button key={d.id} aria-pressed={f?.decision === d.id} disabled={!canEdit}
            onClick={() => run((x) => ops.decideNewFinding(x, reportId, r.id, d.id, by), `${r.marker}: ${d.label}`, 'n3-finding', { memberId: r.memberId, by })}
            className={clsx('h-8 px-3 text-[13px] font-medium focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500 disabled:cursor-not-allowed',
              i > 0 && 'border-l border-plum-700', f?.decision === d.id ? 'bg-plum-700 text-paper' : 'bg-paper text-plum-700 enabled:hover:bg-plum-100')}>
            {f?.decision === d.id && <Check size={12} className="-ml-0.5 mr-1 inline" aria-hidden="true" />}{d.label}
          </button>
        ))}
      </div>
    </li>
  );
}

function StationSection({ index, label, status, rows, canEdit }: { index: number; label: string; status: StationStatus; rows: Result[]; canEdit: boolean }) {
  const lit = status === 'done' || status === 'skipped';
  const { label: stateLabel, tone, Icon } = SECTION_STATE[status];
  const [editing, setEditing] = useState<{ result: Result; mode: 'correct' | 'exclude' } | null>(null);
  const shown = rows.filter((r) => !r.skipped && r.value !== null && r.value !== '');
  return (
    <Card as="section" className={clsx('transition-all duration-500', lit ? 'border-plum-700/40' : 'border-dashed bg-cream-100 shadow-none')}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <h3 className={clsx('font-semibold', lit ? 'text-plum-900' : 'text-muted')}>{index} · {label}</h3>
        <Chip tone={tone}><Icon size={12} aria-hidden="true" /> {stateLabel}</Chip>
      </div>
      {status === 'skipped' && <p className="border-t border-line px-4 py-2.5 text-sm text-plum-900">{rows.find((r) => r.skipped)?.skipped?.reason}. Left out of her scores, not counted as zero.</p>}
      {status === 'done' && shown.length > 0 && (
        <div className="relative overflow-x-auto border-t border-line">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">{label} results</caption>
            <thead className="sr-only"><tr><th>Marker</th><th>Value</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={clsx('border-b border-line last:border-b-0', r.excludedFromScore && 'bg-cream-100')}>
                  <td className={clsx('py-1.5 pl-4', r.excludedFromScore ? 'text-muted line-through' : 'text-plum-900')}>{r.marker}{r.excludedFromScore && <span className="sr-only"> (left out of scores)</span>}</td>
                  <td className="tabular-nums text-plum-900">{fmtValue(r)}{r.corrected && <span className="ml-1 text-xs text-muted">(was {r.corrected.from})</span>}</td>
                  <td>{r.excludedFromScore ? <Chip tone="watch"><MinusCircle size={12} aria-hidden="true" /> Left out</Chip> : <BandChip band={r.band} />}</td>
                  <td>{r.corrected ? <Chip tone="plum"><PencilLine size={12} aria-hidden="true" /> Corrected by NP</Chip> : <SourceLabel result={r} />}</td>
                  <td className="whitespace-nowrap pr-2 text-right">
                    {canEdit && (
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" aria-label={`Correct ${r.marker}`} onClick={() => setEditing({ result: r, mode: 'correct' })}>Correct</Button>
                        {r.excludedFromScore
                          ? <IncludeButton result={r} />
                          : r.band !== 'not_scored' && <Button size="sm" variant="ghost" aria-label={`Leave ${r.marker} out of her scores`} onClick={() => setEditing({ result: r, mode: 'exclude' })}>Leave out</Button>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!lit && <p className="border-t border-dashed border-line px-4 py-2.5 text-sm text-muted">{status === 'todo' ? 'Not started yet.' : 'Jordan is entering this now. It appears here the moment the station is done.'}</p>}
      <EditDialog key={editing?.result.id ?? 'none'} editing={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}

function IncludeButton({ result }: { result: Result }) {
  const { run } = useDemo();
  const by = STAFF_BY_ROLE[useStaffRole()];
  return <Button size="sm" variant="ghost" onClick={() => run((d) => ops.includeResult(d, result.id, by), `${result.marker} back in her scores`, undefined, { memberId: result.memberId, by })}><Undo2 size={14} aria-hidden="true" /> Put back</Button>;
}

function EditDialog({ editing, onClose }: { editing: { result: Result; mode: 'correct' | 'exclude' } | null; onClose: () => void }) {
  const { run } = useDemo();
  const by = STAFF_BY_ROLE[useStaffRole()];
  const [value, setValue] = useState(editing ? String(editing.result.value ?? '') : '');
  const [reason, setReason] = useState('');
  if (!editing) return null;
  const r = editing.result;
  const numeric = typeof r.value === 'number';
  const parsed = numeric ? Number(value) : value.trim();
  const valid = numeric ? value.trim() !== '' && Number.isFinite(parsed) : !!value.trim();
  const correct = editing.mode === 'correct';
  const blocked = !reason.trim() || (correct && (!valid || parsed === r.value));
  return (
    <Dialog open title={correct ? `Correct ${r.marker}` : `Leave ${r.marker} out of her scores`} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={blocked} onClick={() => {
          if (correct) run((d) => ops.correctResult(d, r.id, parsed, reason, by), `${r.marker} corrected`, undefined, { memberId: r.memberId, by });
          else run((d) => ops.excludeResult(d, r.id, reason, by), `${r.marker} left out of her scores`, undefined, { memberId: r.memberId, by });
          onClose();
        }}>{correct ? 'Save correction' : 'Leave out'}</Button>
      </>}>
      <p className="text-sm text-muted">{correct ? `Now ${fmtValue(r)} from ${r.source}. The band follows the new value and the original is kept.` : 'It stays on her record but is left out of every score. It is never counted as zero.'}</p>
      {correct && (
        <Field label={`Correct value${r.unit ? ` (${r.unit})` : ''}`} htmlFor="n3-value">
          <input id="n3-value" inputMode={numeric ? 'decimal' : 'text'} className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      )}
      <Field label="Reason" htmlFor="n3-reason" hint={blocked ? (correct && !valid ? 'Enter a value, then a short reason.' : correct && parsed === r.value ? 'Change the value, then add a short reason.' : 'Add a short reason for the record.') : undefined}>
        <input id="n3-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={correct ? 'e.g. transcription: printout reads 6.6' : 'e.g. ate just before the scan'} />
      </Field>
    </Dialog>
  );
}

function Footer({ report, visit, results, canEdit, memberId }: { report: Report; visit: Visit; results: Result[]; canEdit: boolean; memberId: string }) {
  const s = useDemo();
  const role = useStaffRole();
  const nav = useNavigate();
  const by = STAFF_BY_ROLE[role];
  const check = canFinishFinalReview(report, visit, results);
  const [why, setWhy] = useState(false);
  if (report.finalReviewedAt) {
    return (
      <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-3 shadow-card sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-plum-900">Final review done. {report.status === 'released' ? 'Her report has been released.' : 'Next: the results conversation with her.'}</p>
          {report.status !== 'released' && <Button onClick={() => nav(`/staff/${role}/present/${memberId}`)}><Presentation size={16} aria-hidden="true" /> Open present mode</Button>}
        </div>
      </div>
    );
  }
  const finish = () => {
    if (!check.ok) { setWhy(true); return; }
    s.run((d) => ops.finishFinalReview(d, report.id, by), 'Final review done · ready for the results conversation');
  };
  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-paper px-4 py-2 shadow-card sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm text-plum-900">{visit.completeness === 'passed' ? 'Every test is in or skipped with a reason.' : 'Waiting on the MA: sections arrive as each test is done.'}</p>
        <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ActingNote text={actingAs(role, 'final_review')} className="max-sm:hidden" />
          <div className="group relative w-full sm:w-auto" onMouseLeave={() => setWhy(false)}>
            <Button aria-disabled={!check.ok || !canEdit} disabled={!canEdit} aria-describedby="n3-why" onClick={finish}
              className={clsx('w-full', !check.ok && 'cursor-not-allowed opacity-50 hover:bg-plum-700')}>
              Finish final review <ArrowRight size={16} aria-hidden="true" />
            </Button>
            {(!check.ok || !canEdit) && (
              <div id="n3-why" role="tooltip" className={clsx('absolute bottom-full right-0 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg bg-plum-900 p-3 text-xs text-cream-100 shadow-card group-hover:block group-focus-within:block', why ? 'block' : 'hidden')}>
                <p className="mb-1 font-semibold">Before you can finish:</p>
                <ul className="list-disc space-y-0.5 pl-4">{(canEdit ? check.missing : ['Only the NP does the final review']).map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
