// N6 Orders: one line per accepted plan item. Red until someone marks it placed (PRD V9).
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, Check } from 'lucide-react';
import { useDemo, ops } from '../state/store';
import { useStaffRole } from './shell';
import { can } from '../state/permissions';
import { Button, Chip, EmptyState } from './ui';
import { STAFF, STAFF_BY_ROLE } from '../data/seed';
import { fmtDateTime } from '../lib/time';

export const SUPPLIER_LABEL = { compounding: 'Compounding pharmacy', retail: 'Retail pharmacy', fullscript: 'Fullscript', peptide_supplier: 'Peptide supplier' } as const;

export function OrdersList({ memberId, showMember }: { memberId?: string; showMember?: boolean }) {
  const s = useDemo();
  const role = useStaffRole();
  const by = STAFF_BY_ROLE[role];
  const orders = s.orders.filter((o) => !memberId || o.memberId === memberId)
    .slice().sort((a, b) => Number(a.status === 'placed') - Number(b.status === 'placed'));
  const open = orders.filter((o) => o.status === 'open').length;
  if (!orders.length) return <EmptyState title="No orders yet" body="Orders are created from her plan when the NP releases it, and stay red until they're placed." />;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-plum-900">{open ? <><strong>{open}</strong> of {orders.length} still to place</> : <>All {orders.length} placed</>}</p>
        <span className="flex flex-col items-end">
          <Button size="sm" variant="secondary" disabled aria-describedby="fullscript-why">Send via Fullscript</Button>
          <span id="fullscript-why" className="text-xs text-muted">Connects later: place Fullscript orders by hand for now.</span>
        </span>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-[13px] text-muted"><tr>{showMember && <th className="py-1.5 font-medium">Member</th>}<th className="py-1.5 font-medium">Item</th><th className="font-medium">Supplier</th><th className="font-medium">Status</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>
            {orders.map((o) => {
              const m = s.members.find((x) => x.id === o.memberId);
              const red = o.status === 'open';
              return (
                <tr key={o.id} className={clsx('border-t border-line', red && 'bg-danger-bg/60')}>
                  {showMember && <td className="py-2 pl-2"><Link className="text-plum-900 underline-offset-2 hover:underline" to={`/staff/${role}/member/${o.memberId}?tab=orders`}>{m?.name}</Link></td>}
                  <td className={clsx('py-2 font-medium text-plum-900', !showMember && 'pl-2')}>{o.item}</td>
                  <td className="text-plum-900">{SUPPLIER_LABEL[o.supplier]}</td>
                  <td>{red
                    ? <Chip tone="danger"><AlertCircle size={12} aria-hidden="true" /> Not placed</Chip>
                    : <Chip tone="ok"><Check size={12} aria-hidden="true" /> Placed · {STAFF.find((x) => x.id === o.placedById)?.name.split(' ')[0]} · {fmtDateTime(o.placedAt!)}</Chip>}</td>
                  <td className="pr-2 text-right">
                    {red && (can(role, 'place_order')
                      ? <Button size="sm" onClick={() => s.run((d) => ops.placeOrder(d, o.id, by), `${o.item}: order placed`, undefined, { memberId: o.memberId, by })}>Mark placed</Button>
                      : <span className="text-xs text-muted">NP or MA places orders</span>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
