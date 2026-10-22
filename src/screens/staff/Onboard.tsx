// G4 Onboard: after the discovery call, one step sends consents + intake and books the blood draw.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSignature, ClipboardList, Droplet } from 'lucide-react';
import { clsx } from 'clsx';
import { useDemo, ops } from '../../state/store';
import { Button, Card, Field, inputCls } from '../../components/ui';
import { BLOOD_DRAW_SLOTS, CLINIC_LOCATION, FORMS, ONBOARDING_FORM_IDS } from '../../data/seed';
import type { MenoStatus, Milestone } from '../../types';

export default function Onboard() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const s = useDemo();
  const m = s.members.find((x) => x.id === id);
  const [meno, setMeno] = useState<MenoStatus>(m?.menoStatus ?? 'peri');
  const [goals, setGoals] = useState<string[]>(m?.goals ?? []);
  const [ms, setMs] = useState<Milestone[]>(m?.milestones ?? []);
  const [slot, setSlot] = useState(BLOOD_DRAW_SLOTS[0].at);
  if (!m) return null;
  if (m.phase !== 'join') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Card className="p-6"><p className="text-plum-900">{m.name} is already onboarded.</p><Button className="mt-4" onClick={() => nav(`/staff/guide/member/${m.id}`)}>Open her record</Button></Card>
      </div>
    );
  }
  const selected = ms.filter((x) => x.selected).length;
  const ok = selected >= 3 && selected <= 6 && goals.some((g) => g.trim());
  const missing = [selected < 3 && 'pick at least 3 milestones', selected > 6 && 'keep it to 6 milestones', !goals.some((g) => g.trim()) && 'add at least one goal'].filter(Boolean).join(', ');

  const submit = () => {
    s.run((d) => ops.onboard(d, m.id, { menoStatus: meno, goals, milestones: ms, slotAt: slot, byId: 's-guide' }), `Sent to ${m.name.split(' ')[0]}'s phone · blood draw booked`);
    nav(`/staff/guide/member/${m.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6">
      <button onClick={() => nav(-1)} className="mb-3 flex items-center gap-1 text-sm text-muted hover:text-plum-900"><ArrowLeft size={16} /> Back</button>
      <h1 className="font-display text-[32px] font-semibold text-plum-700">Onboard {m.name}</h1>
      <p className="mb-6 text-sm text-muted">Discovery call done and paid. Capture her goals while they're fresh, then send everything in one step. Intake and blood draw happen at the same time.</p>

      <div className="space-y-5">
        <Card as="section" className="p-5">
          <h2 className="mb-3 text-base font-semibold text-plum-900">1 · Her stage</h2>
          <div role="radiogroup" aria-label="Menopause stage" className="flex flex-wrap gap-2">
            {(['peri', 'post', 'not_applicable'] as MenoStatus[]).map((v) => (
              <button key={v} role="radio" aria-checked={meno === v} onClick={() => setMeno(v)} className={clsx('rounded-full border px-4 py-2 text-sm', meno === v ? 'border-plum-700 bg-plum-100 font-semibold text-plum-700' : 'border-line bg-paper text-plum-900')}>
                {v === 'peri' ? 'Perimenopause' : v === 'post' ? 'Postmenopause' : 'Not sure yet'}
              </button>
            ))}
          </div>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="mb-1 text-base font-semibold text-plum-900">2 · Her goals, in her words</h2>
          <p className="mb-3 text-xs text-muted">These show on her home screen and in every report, so everything measures against them.</p>
          <ul className="space-y-2">
            {goals.map((g, i) => (
              <li key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={`goal-${i}`}>Goal {i + 1}</label>
                <input id={`goal-${i}`} className={inputCls} value={g} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? e.target.value : x)))} />
                <Button variant="ghost" aria-label={`Remove goal ${i + 1}`} onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Trash2 size={16} /></Button>
              </li>
            ))}
          </ul>
          <Button className="mt-2" size="sm" variant="ghost" onClick={() => setGoals([...goals, ''])}><Plus size={14} /> Add a goal</Button>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="mb-1 text-base font-semibold text-plum-900">3 · Milestones for this year</h2>
          <p className="mb-3 text-xs text-muted">Pick 3–6. She rates each 0–10 now and again at every quarterly review. {selected} selected.</p>
          <ul className="grid gap-2 md:grid-cols-2">
            {ms.map((x) => (
              <li key={x.id}>
                <label className={clsx('flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', x.selected ? 'border-plum-700 bg-plum-100' : 'border-line bg-paper')}>
                  <input type="checkbox" className="h-4 w-4 accent-plum-700" checked={x.selected} onChange={() => setMs(ms.map((y) => (y.id === x.id ? { ...y, selected: !y.selected } : y)))} />
                  <span className="flex-1 text-plum-900">{x.label}</span>
                  <span className="text-xs tabular-nums text-muted">now {x.score ?? '–'} · target {x.target}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="mb-1 text-base font-semibold text-plum-900">4 · Blood draw</h2>
          <p className="mb-3 text-xs text-muted">Morning slots so she can fast. {CLINIC_LOCATION}.</p>
          <div role="radiogroup" aria-label="Blood draw time" className="grid gap-2 sm:grid-cols-3">
            {BLOOD_DRAW_SLOTS.map((sl) => (
              <button key={sl.id} role="radio" aria-checked={slot === sl.at} onClick={() => setSlot(sl.at)} className={clsx('rounded-lg border p-3 text-left text-sm', slot === sl.at ? 'border-plum-700 bg-plum-100 font-semibold text-plum-700' : 'border-line bg-paper text-plum-900')}>
                {sl.label}
              </button>
            ))}
          </div>
        </Card>

        <Card as="section" className="p-5">
          <h2 className="mb-3 text-base font-semibold text-plum-900">5 · What she'll get on her phone</h2>
          <ul className="space-y-2 text-sm text-plum-900">
            {ONBOARDING_FORM_IDS.map((fid) => <li key={fid} className="flex items-center gap-2"><FileSignature size={16} className="text-terracotta-700" />{FORMS.find((f) => f.id === fid)!.title}</li>)}
            <li className="flex items-center gap-2"><ClipboardList size={16} className="text-terracotta-700" />Vyta intake · 7 short sections, save and come back</li>
            <li className="flex items-center gap-2"><Droplet size={16} className="text-terracotta-700" />Blood draw confirmation and prep reminders</li>
          </ul>
        </Card>
      </div>

      <div className="sticky bottom-0 z-30 -mx-6 mt-6 border-t border-line bg-paper/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <span className="text-sm text-muted">{ok ? 'Ready to send.' : `To send: ${missing}.`}</span>
          <Button size="lg" disabled={!ok} onClick={submit} title={ok ? undefined : missing}>Send intake and book blood draw</Button>
        </div>
      </div>
    </div>
  );
}
