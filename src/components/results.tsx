// Lab result helpers shared by N2 and the member record's Results tab.
import { clsx } from 'clsx';
import { MinusCircle, PencilLine, ScanLine } from 'lucide-react';
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


// Where a Your Vyta Day value came from: word plus icon, never colour alone (MA3 and the Results tab).
// "Edited" reveals what the scan read on hover and focus, and always to screen readers.
export function SourceLabel({ result }: { result: Result }) {
  const base = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium';
  if (result.skipped) return <span className={clsx(base, 'bg-watch-bg text-watch-fg')}><MinusCircle size={12} aria-hidden="true" /> Skipped: {result.skipped.reason}</span>;
  if (result.origin === 'entered') return <span className={clsx(base, 'bg-neutral-bg text-neutral-fg')}><PencilLine size={12} aria-hidden="true" /> Entered</span>;
  if (result.origin === 'scan_edited') {
    const read = `${result.scanValue ?? '—'}${result.unit ? ` ${result.unit}` : ''}`;
    return (
      <span tabIndex={0} className={clsx(base, 'group relative cursor-help bg-info-bg text-info-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-500')}>
        <ScanLine size={12} aria-hidden="true" /> From scan · edited<span className="sr-only">. The scan read {read}</span>
        <span aria-hidden="true" className="pointer-events-none absolute bottom-full right-0 z-20 mb-1 hidden whitespace-nowrap rounded-md bg-plum-900 px-2 py-1 text-xs text-cream-100 shadow-card group-hover:block group-focus:block">Scan read {read}</span>
      </span>
    );
  }
  if (result.origin === 'scan' && !result.checked) return <span className={clsx(base, 'bg-watch-bg text-watch-fg')}><ScanLine size={12} aria-hidden="true" /> From scan · check</span>;
  if (result.origin === 'scan') return <span className={clsx(base, 'bg-ok-bg text-ok-fg')}><ScanLine size={12} aria-hidden="true" /> From scan</span>;
  return null;
}

// "Body composition · 8 from scan · 1 edited · 2 to check"
export function sectionSummary(rows: Result[]) {
  const n = (f: (r: Result) => boolean) => rows.filter(f).length;
  return [
    [n((r) => r.origin === 'scan'), 'from scan'], [n((r) => r.origin === 'scan_edited'), 'edited'],
    [n((r) => r.origin === 'entered'), 'entered'], [n((r) => r.origin === 'scan' && !r.checked), 'to check'],
  ].filter(([c]) => c).map(([c, w]) => `${c} ${w}`).join(' · ');
}
