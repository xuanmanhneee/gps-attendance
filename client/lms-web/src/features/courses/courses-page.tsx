import { useEffect, useState } from 'react';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import { CourseGrid } from '../../components/course-grid';
import type { Course } from '../../types';

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true); setError('');
    lmsApi.courses().then(setCourses).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải lớp học')).finally(() => setLoading(false));
  }
  useEffect(load, []);
  return (
    <>
      <header className="page-header"><div><p className="eyebrow">Học vụ</p><h1>Lớp học</h1><span>Mở lớp để xem roster, báo cáo và tạo phiên điểm danh.</span></div><span className="count-badge">{courses.length} lớp</span></header>
      {loading ? <AsyncState kind="loading" message="Đang tải danh sách lớp…" /> : error ? <AsyncState kind="error" message={error} onRetry={load} /> : courses.length ? <CourseGrid courses={courses} /> : <AsyncState kind="empty" message="Chưa có lớp học nào được phân công." />}
    </>
  );
}
