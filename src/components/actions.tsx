// Shared handler for queue actions, including the Snooze and Log-call dialogs (screen G3).
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { QueueAction, StaffRole } from '../types';
import { useDemo, ops } from '../state/store';
import { STAFF_BY_ROLE } from '../data/seed';
import { addDays } from '../lib/time';
import { can, queueActionKind } from '../state/permissions';
import { Button, Dialog, Field, inputCls } from './ui';

const SNOOZE_REASONS = ['On antibiotics, retry later', 'Travelling', 'Asked to be contacted next week', 'Waiting on another provider', 'Other'];
const CALL_OUTCOMES = ['Spoke with her: will finish tonight', 'Left a voicemail', 'No answer', 'Asked for help: booked a call'];

export function useQueueActions(role: StaffRole) {
  const nav = useNavigate();
  const { run, now } = useDemo();
  const by = STAFF_BY_ROLE[role];
  const [snoozeFor, setSnoozeFor] = useState<{ memberId: string; taskKey: string } | null>(null);
  const [callFor, setCallFor] = useState<{ memberId: string; taskKey: string } | null>(null);
  const [reason, setReason] = useState(SNOOZE_REASONS[0]);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [outcome, setOutcome] = useState(CALL_OUTCOMES[0]);

  const handle = useCallback((a: QueueAction) => {
    const kind = queueActionKind(a);
    if (kind && !can(role, kind)) return;
    switch (a.type) {
      case 'open_record': nav(`/staff/${role}/member/${a.memberId}`); break;
      case 'onboard': nav(`/staff/${role}/onboard/${a.memberId}`); break;
      case 'nudge': run((d) => ops.nudge(d, a.memberId, by, a.text), 'Reminder sent to her phone'); break;
      case 'snooze': setSnoozeFor({ memberId: a.memberId, taskKey: a.taskKey }); break;
      case 'log_call': setCallFor({ memberId: a.memberId, taskKey: a.taskKey }); break;
      case 'confirm_visit': run((d) => ops.confirmVisit(d, a.visitId, by), 'Blood draw confirmed'); break;
      case 'mark_drawn': run((d) => ops.markDrawn(d, a.visitId, by), 'Marked as drawn · sent to lab'); break;
      case 'labs_received': run((d) => ops.labsReceived(d, a.visitId, by), 'Labs received · building the draft HEAL plan'); break;
      case 'pre_review': nav(`/staff/${role}/pre-review/${a.memberId}`); break;
      case 'start_visit': {
        const v = useDemo.getState().visits.find((x) => x.id === a.visitId);
        if (v && can(role, 'start_visit') && !ops.visitStarted(v) && v.completeness !== 'passed') run((d) => ops.startVisit(d, a.visitId, by), 'Visit started · InBody first');
        nav(`/staff/${role}/visit/${a.visitId}`);
        break;
      }
    }
  }, [nav, role, run, by]);

  const dialogs = (
    <>
      <Dialog
        open={!!snoozeFor} title="Snooze with a reason" onClose={() => setSnoozeFor(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setSnoozeFor(null)}>Cancel</Button>
          <Button disabled={reason === 'Other' && !note.trim()} onClick={() => {
            const r = reason === 'Other' ? note.trim() : note ? `${reason}: ${note}` : reason;
            run((d) => ops.snooze(d, snoozeFor!.memberId, snoozeFor!.taskKey, r, addDays(now, days), by), `Snoozed for ${days} days`, undefined, { memberId: snoozeFor!.memberId, by });
            setSnoozeFor(null); setNote('');
          }}>Snooze</Button>
        </>}
      >
        <p className="text-sm text-muted">It leaves your list and comes back on the date you set, so nobody chases twice.</p>
        <Field label="Reason" htmlFor="sz-reason">
          <select id="sz-reason" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {SNOOZE_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label={reason === 'Other' ? 'What is the reason?' : 'Note (optional)'} htmlFor="sz-note" hint={reason === 'Other' && !note.trim() ? 'Add a short reason so the next person knows why.' : undefined}>
          <input id="sz-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. finishing antibiotics on Friday" />
        </Field>
        <Field label="Bring it back in" htmlFor="sz-days">
          <select id="sz-days" className={inputCls} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 3, 7, 14].map((n) => <option key={n} value={n}>{n} day{n > 1 ? 's' : ''}</option>)}
          </select>
        </Field>
      </Dialog>
      <Dialog
        open={!!callFor} title="Log a call" onClose={() => setCallFor(null)}
        footer={<>
          <Button variant="ghost" onClick={() => setCallFor(null)}>Cancel</Button>
          <Button onClick={() => { run((d) => ops.logCall(d, callFor!.memberId, by, note ? `${outcome}. ${note}` : outcome), 'Call logged', undefined, { memberId: callFor!.memberId, by }); setCallFor(null); setNote(''); }}>Save</Button>
        </>}
      >
        <Field label="Outcome" htmlFor="call-outcome">
          <select id="call-outcome" className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {CALL_OUTCOMES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)" htmlFor="call-note"><input id="call-note" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Dialog>
    </>
  );
  return { handle, dialogs };
}
