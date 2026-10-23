import { forwardRef } from 'react';

import type { AttendanceSessionResponse } from '@gps-attendance/shared';

import type { SessionDayGroup } from '../../utils/attendance-sessions/group-sessions-by-day';
import { SessionCard } from './SessionCard';

const formatDay = (date: Date): string =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

type Props = {
  group: SessionDayGroup;
  onCancel?: (session: AttendanceSessionResponse) => void;
  cancellingId?: number | null;
};

export const SessionDaySection = forwardRef<HTMLElement, Props>(
  ({ group, onCancel, cancellingId }, ref) => {
    return (
      <section
        ref={ref}
        data-day-key={group.dateKey}
        className={`scroll-mt-[50vh] rounded-xl border-2 p-3 transition-colors ${
          group.isToday
            ? 'border-accent-strong bg-accent-soft'
            : 'border-line bg-surface'
        }`}
      >
        <h2
          className={`sticky top-0 z-10 mb-3 -mx-3 -mt-3 rounded-t-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide backdrop-blur ${
            group.isToday
              ? 'bg-accent-soft/95 text-accent-strong'
              : 'bg-surface/95 text-muted'
          }`}
        >
          {formatDay(group.date)}
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              canManage={Boolean(onCancel)}
              isCancelling={cancellingId === s.id}
              onCancel={onCancel}
            />
          ))}
        </div>
      </section>
    );
  },
);

SessionDaySection.displayName = 'SessionDaySection';
