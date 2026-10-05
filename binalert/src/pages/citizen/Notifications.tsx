import { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck, ClipboardList, Gift, MapPin, Trophy, Truck } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState, SkeletonRows } from '../../components/ui/Feedback';
import { notificationsService } from '../../services/notificationsService';
import { timeAgo } from '../../utils/format';
import type { AppNotification } from '../../types';

const TYPE_ICONS: Record<AppNotification['type'], typeof Bell> = {
  'report-submitted': ClipboardList,
  'report-assigned': MapPin,
  'status-changed': BellRing,
  resolved: CheckCheck,
  collection: Truck,
  achievement: Trophy,
  points: Gift,
};

export function Notifications() {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const load = useCallback(async () => {
    setItems(await notificationsService.list());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    setItems(await notificationsService.markAllRead());
  }

  const unread = items?.filter((n) => !n.read).length ?? 0;

  return (
    <>
      <PageHeader
        breadcrumb="Inbox"
        title="Notifications"
        subtitle="Report updates, collection schedules, achievements and points — in one place."
        actions={
          <Button variant="outline" icon={<CheckCheck className="h-4 w-4" />} onClick={markAll} disabled={unread === 0}>
            Mark all read
          </Button>
        }
      />
      <Card padded={false}>
        {!items ? (
          <div className="p-6"><SkeletonRows rows={5} /></div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications yet" body="Updates about your reports, points and achievements will land here." />
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((n) => {
              const Icon = TYPE_ICONS[n.type];
              return (
                <li key={n.id} className={`flex gap-4 px-5 py-4 transition-colors sm:px-6 ${n.read ? '' : 'bg-emerald-50/40'}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${n.read ? 'bg-ink-100 text-ink-500' : 'bg-emerald2-500 text-white shadow-glow'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">{n.title}</p>
                      <span className="text-xs text-ink-400">{timeAgo(n.at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald2-500" aria-label="Unread" />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
