import { useEffect, useRef } from 'react';

import type { SessionDayGroup } from '../utils/attendance-sessions/group-sessions-by-day';
import { findAnchorGroupIndex } from '../utils/attendance-sessions/group-sessions-by-day';

/**
 * Tự động scroll tới nhóm "anchor" (hôm nay hoặc gần nhất) MỘT LẦN khi
 * data sẵn sàng. Trả về `anchorRef` (gắn vào section anchor) và
 * `anchorIndex` (index của section cần gắn ref).
 *
 * Dùng cờ `hasScrolledRef` để chỉ scroll lần đầu — sau đó user đổi filter
 * sẽ không bị giật scroll.
 */
export const useScrollToAnchor = <T extends SessionDayGroup>(
  groups: T[],
  isReady: boolean,
) => {
  const anchorRef = useRef<HTMLElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (hasScrolledRef.current) return;
    if (!isReady || groups.length === 0) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    anchor.scrollIntoView({ block: 'start' });
    hasScrolledRef.current = true;
  }, [isReady, groups.length]);

  const anchorIndex = findAnchorGroupIndex(groups);

  return { anchorRef, anchorIndex };
};

/**
 * Scroll chủ động về anchor. Dùng cho nút "Về hôm nay".
 */
export const scrollToAnchor = (anchor: HTMLElement | null) => {
  if (!anchor) return;
  anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
