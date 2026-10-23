// Staff view of a member's SAGE chats (PRD S2: every chat is visible, concerns called out).
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { useDemo } from '../state/store';
import { fmtDateTime } from '../lib/time';

export function SageThread({ memberId, name }: { memberId: string; name: string }) {
  const msgs = useDemo((s) => s.sage.filter((x) => x.memberId === memberId));
  if (!msgs.length) return <p className="text-sm text-muted">No SAGE conversations yet. Once her report is released she can ask SAGE about it; anything SAGE flags is highlighted here.</p>;
  return (
    <ol className="space-y-2" aria-label="SAGE conversation">
      {msgs.map((x) => (
        <li key={x.id} className={clsx('rounded-lg px-3 py-2 text-sm', x.from === 'member' ? 'bg-plum-100 text-plum-900' : 'border border-line bg-paper text-plum-900', x.flagged && 'border-2 border-danger-fg bg-danger-bg')}>
          <p className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-semibold text-plum-900">{x.from === 'member' ? name : 'SAGE (AI)'}</span>{fmtDateTime(x.at)}
            {x.flagged && <span className="inline-flex items-center gap-1 font-semibold text-danger-fg"><AlertTriangle size={12} aria-hidden="true" /> Flagged</span>}
          </p>
          <p>{x.text}</p>
          {x.citation && <p className="mt-0.5 text-xs text-muted">{x.citation}</p>}
        </li>
      ))}
    </ol>
  );
}
