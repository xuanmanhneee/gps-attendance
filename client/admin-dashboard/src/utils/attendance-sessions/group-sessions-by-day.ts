import type { AttendanceSessionResponse } from '@gps-attendance/shared';

export type SessionDayGroup = {
  /** Khóa ngày dạng YYYY-MM-DD, dùng làm React key. */
  dateKey: string;
  /** Timestamp đầu ngày (00:00 local). */
  date: Date;
  /** Đúng nếu là ngày hôm nay. */
  isToday: boolean;
  /** Các phiên trong ngày, sort theo openAt tăng dần. */
  sessions: AttendanceSessionResponse[];
};

const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Gom phiên theo ngày mở phiên (openAt). Các nhóm được sort tăng dần theo
 * ngày; các phiên trong cùng ngày sort tăng dần theo openAt.
 *
 * Generic `<T extends AttendanceSessionResponse>` để giữ nguyên type con
 * (ví dụ `MyAttendanceSessionResponse`) khi trả về.
 */
export const groupSessionsByOpenDay = <T extends AttendanceSessionResponse>(
  sessions: T[],
): (Omit<SessionDayGroup, 'sessions'> & { sessions: T[] })[] => {
  const todayKey = toDateKey(new Date());
  const map = new Map<
    string,
    Omit<SessionDayGroup, 'sessions'> & { sessions: T[] }
  >();

  for (const session of sessions) {
    const open = new Date(session.openAt);
    if (Number.isNaN(open.getTime())) continue;

    const key = toDateKey(open);
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        date: startOfDay(open),
        isToday: key === todayKey,
        sessions: [],
      });
    }
    map.get(key)!.sessions.push(session);
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const group of groups) {
    group.sessions.sort(
      (a, b) => new Date(a.openAt).getTime() - new Date(b.openAt).getTime(),
    );
  }

  return groups;
};

/**
 * Chọn index của nhóm anchor để scroll tới:
 *   1. Nhóm isToday nếu có.
 *   2. Không → nhóm tương lai gần nhất (openAt > now).
 *   3. Không → nhóm quá khứ gần nhất (nhóm cuối cùng).
 *   4. Rỗng → -1.
 */
export const findAnchorGroupIndex = (
  groups: { date: Date; isToday: boolean }[],
): number => {
  if (groups.length === 0) return -1;

  const todayIdx = groups.findIndex((g) => g.isToday);
  if (todayIdx >= 0) return todayIdx;

  const now = Date.now();
  const futureIdx = groups.findIndex((g) => g.date.getTime() > now);
  if (futureIdx >= 0) return futureIdx;

  return groups.length - 1;
};
