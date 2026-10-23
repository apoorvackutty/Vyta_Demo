// Lab result helpers shared by N2 and the member record's Results tab.
import { clsx } from 'clsx';
import { useDemo } from '../state/store';
import { LAB_SOURCE } from '../data/protocol';
import { fmtDate } from '../lib/time';
import { Button, Dialog } from './ui';
import type { Result } from '../types';

export const fmtValue = (r: Result) => `${typeof r.value === 'number' ? r.value.toLocaleString('en-US') : r.value ?? '—'}${r.unit ? ` ${r.unit}` : ''}`;

// "Source one click away" (PRD I6): the lab report page with this result highlighted.
export function SourceDialog({ result, results, onClose }: { result: Result | null; results: Result[]; onClose: () => void }) {
  const s = useDemo();
  if (!result) return null;
  const visit = s.visits.find((v) => v.id === result.visitId);
  const panel = results.filter((r) => r.panel === result.panel);
  return (
    <Dialog open title={`Source · ${result.source.replace(`${LAB_SOURCE} `, 'Lab report ')}`} onClose={onClose} footer={<Button onClick={onClose}>Done</Button>}>
      <p className="text-sm text-muted">{LAB_SOURCE} · {result.panel} panel{visit ? ` · drawn ${fmtDate(visit.at)}` : ''}</p>
      <table className="w-full text-sm">
        <thead className="text-left text-[13px] text-muted"><tr><th className="pb-1 font-medium">Marker</th><th className="font-medium">Value</th><th className="font-medium">Target</th></tr></thead>
        <tbody>
          {panel.map((r) => (
            <tr key={r.id} className={clsx('border-t border-line', r.id === result.id && 'bg-plum-100 font-semibold')} aria-current={r.id === result.id ? 'true' : undefined}>
              <td className="py-1.5 pl-1 text-plum-900">{r.marker}</td>
              <td className="tabular-nums text-plum-900">{fmtValue(r)}</td>
              <td className="text-muted">{r.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}

