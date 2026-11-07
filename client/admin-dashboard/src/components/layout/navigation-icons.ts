import type { IconType } from 'react-icons';
import {
  MdAccountBalance,
  MdEventNote,
  MdGridView,
  MdGroup,
  MdInsights,
  MdRateReview,
  MdSell,
} from 'react-icons/md';

import type { NavigationItemId } from '../../config/navigation';

/** Icon hiển thị cho từng mục menu, tách khỏi config để config thuần dữ liệu. */
export const NAVIGATION_ICONS: Record<NavigationItemId, IconType> = {
  overview: MdGridView,
  users: MdGroup,
  units: MdAccountBalance,
  tags: MdSell,
  attendanceSessions: MdEventNote,
  attendanceReviews: MdRateReview,
  statistics: MdInsights,
};
