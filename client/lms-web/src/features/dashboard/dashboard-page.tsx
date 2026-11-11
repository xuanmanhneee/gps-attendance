import { useEffect, useState } from 'react';
import { FiArrowRight, FiBookOpen, FiMapPin, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import { useAuth } from '../../app/auth-provider';
import { AsyncState } from '../../components/async-state';
import { GeneralSessionForm } from '../attendance/general-session-form';
import type { AttendanceOptions, Building, Course } from '../../types';

export function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [attendanceOptions, setAttendanceOptions] = useState<AttendanceOptions | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([lmsApi.courses(), lmsApi.buildings(), user?.role === 'lecturer' ? lmsApi.attendanceOptions() : Promise.resolve(null)])
      .then(([nextCourses, nextBuildings, nextOptions]) => { setCourses(nextCourses); setBuildings(nextBuildings); setAttendanceOptions(nextOptions); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải tổng quan'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);
  if (loading) return <AsyncState kind="loading" message="Đang tải tổng quan học kỳ…" />;
  if (error) return <AsyncState kind="error" message={error} onRetry={load} />;
  return (
    <>
      <section className="stats-grid" aria-label="Tổng quan">
        <div className="stat-card stat-card--lead"><FiBookOpen /><div><b>{courses.length}</b><span>Lớp học đang hoạt động</span></div></div>
        <div className="stat-card"><FiUsers /><div><b>{new Set(courses.map((course) => course.lecturerCode)).size}</b><span>Giảng viên phụ trách</span></div></div>
        <div className="stat-card"><FiMapPin /><div><b>{buildings.length}</b><span>Tòa nhà có tọa độ</span></div></div>
      </section>
      <section className="content-section">
        <header className="section-header"><div><p className="eyebrow">Thao tác nhanh</p><h2>{user?.role === 'lecturer' ? 'Tạo phiên điểm danh chung' : 'Quản lý kết nối Attendance'}</h2></div>{user?.role === 'admin' && <Link to="/integration">Mở tích hợp <FiArrowRight /></Link>}</header>
        {user?.role === 'lecturer' && attendanceOptions
          ? <GeneralSessionForm buildings={buildings} options={attendanceOptions} />
          : <div className="admin-action-card"><FiRefreshCw /><div><h3>Đồng bộ dữ liệu học vụ</h3><p>Kiểm tra trạng thái Unit, người dùng và lớp học trước khi gửi sang Attendance.</p></div><Link className="button button--primary" to="/integration">Đến trang tích hợp <FiArrowRight /></Link></div>}
      </section>
    </>
  );
}
