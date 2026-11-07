import { Navigate } from 'react-router-dom';

import { ROUTE_PATHS } from '../routes/paths';

/**
 * Route tương thích cho bookmark cũ. Bản ghi điểm danh hiện nằm trong chi tiết
 * phiên để giữ ngữ cảnh phiên và tránh duy trì một màn hình trùng nghiệp vụ.
 */
const AttendanceRecordsPage = () => (
  <Navigate to={ROUTE_PATHS.attendanceSessions} replace />
);

export default AttendanceRecordsPage;
