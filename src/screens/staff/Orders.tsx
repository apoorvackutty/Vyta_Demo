// N6 Orders, across members: everything still red first.
import { Card } from '../../components/ui';
import { OrdersList } from '../../components/orders';

export default function Orders() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="mb-1 font-display text-[32px] font-semibold leading-tight text-plum-700">Orders</h1>
      <p className="mb-4 text-sm text-muted">Created when a plan is released. Each stays red until it's placed.</p>
      <Card className="p-4 sm:p-5"><OrdersList showMember /></Card>
    </div>
  );
}
