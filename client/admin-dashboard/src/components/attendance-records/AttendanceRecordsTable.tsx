import type { AttendanceParticipantResponse } from '@gps-attendance/shared';

import {
  ATTENDANCE_STATUS_LABEL_KEYS,
  ATTENDANCE_STATUS_TONE_CLASS,
} from '../../config/attendance-status';
import { useTranslation } from '../../hooks/useTranslation';

interface AttendanceRecordsTableProps {
  participants: AttendanceParticipantResponse[];
  localeTag: string;
}

const cellHeadClass =
  'bg-surface-subtle px-5 py-3 text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase';

const formatDateTime = (iso: string, localeTag: string) =>
  new Date(iso).toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const AttendanceRecordsTable = ({
  participants,
  localeTag,
}: AttendanceRecordsTableProps) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th scope="col" className={cellHeadClass}>
              {t('attendanceRecords.code')}
            </th>
            <th scope="col" className={cellHeadClass}>
              {t('attendanceRecords.participant')}
            </th>
            <th scope="col" className={cellHeadClass}>
              {t('attendanceRecords.status')}
            </th>
            <th scope="col" className={cellHeadClass}>
              {t('attendanceRecords.checkedInAt')}
            </th>
            <th scope="col" className={cellHeadClass}>
              {t('attendanceRecords.updatedAt')}
            </th>
          </tr>
        </thead>

        <tbody>
          {participants.map((participant) => (
            <tr key={participant.user.code} className="border-t border-line">
              <td className="px-5 py-3 text-[12px] font-bold text-ink">
                {participant.user.code}
              </td>
              <th
                scope="row"
                className="px-5 py-3 text-left text-[12px] font-bold text-ink"
              >
                {participant.user.fullname}
              </th>
              <td className="px-5 py-3">
                <span
                  className={`rounded-[5px] px-2 py-1 text-[10px] font-extrabold ${ATTENDANCE_STATUS_TONE_CLASS[participant.status]}`}
                >
                  {t(ATTENDANCE_STATUS_LABEL_KEYS[participant.status])}
                </span>
              </td>
              <td className="px-5 py-3 text-[12px] text-muted">
                {participant.checkedInAt
                  ? formatDateTime(participant.checkedInAt, localeTag)
                  : '—'}
              </td>
              <td className="px-5 py-3 text-[12px] text-muted">
                {formatDateTime(participant.updatedAt, localeTag)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
