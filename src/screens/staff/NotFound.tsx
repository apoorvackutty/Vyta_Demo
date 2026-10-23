// Shown for any staff link that doesn't match a screen, instead of silently redirecting.
import { Link } from 'react-router-dom';
import { useStaffRole } from '../../components/shell';
import { Card, EmptyState } from '../../components/ui';

export default function NotFound({ title = "We couldn't find that page", body = 'The link may be out of date, or the page was moved.' }: { title?: string; body?: string }) {
  const role = useStaffRole();
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Card>
        <EmptyState heading="h1" title={title} body={body}
          action={<Link to={`/staff/${role}/today`} className="rounded-lg bg-plum-700 px-4 py-2 text-sm font-medium text-paper hover:bg-plum-800">Back to Today</Link>} />
      </Card>
    </div>
  );
}
