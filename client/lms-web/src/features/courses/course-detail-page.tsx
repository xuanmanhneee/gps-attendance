import { useEffect, useState } from 'react';
import { FiArrowLeft, FiBarChart2, FiCalendar } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import type { CourseDetail } from '../../types';

export function CourseDetailPage() {
  const classId = Number(useParams().classId);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true); setError('');
    lmsApi.course(classId).then(setDetail).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải lớp học')).finally(() => setLoading(false));
  }
  useEffect(load, [classId]);
  if (loading) return <AsyncState kind="loading" message="Đang tải lớp học…" />;
  if (error || !detail) return <AsyncState kind="error" message={error || 'Không tìm thấy lớp học'} onRetry={load} />;
  return (
    <>
      <Link className="back-link" to="/courses"><FiArrowLeft /> Danh sách lớp</Link>
      <section className="detail-hero">
        <div><p className="eyebrow">{detail.course.code} · Học kỳ 1</p><h1>{detail.course.name}</h1><span>{detail.students.length} sinh viên · Giảng viên {detail.course.lecturerCode}</span></div>
        <div className="action-cluster"><Link className="button button--secondary" to={`/courses/${classId}/report`}><FiBarChart2 /> Báo cáo</Link><Link className="button button--primary" to={`/courses/${classId}/create-session`}><FiCalendar /> Tạo phiên điểm danh</Link></div>
      </section>
      <section className="table-panel">
        <header className="section-header"><div><p className="eyebrow">Roster lớp học</p><h2>Danh sách sinh viên</h2></div><span className="count-badge">{detail.students.length} thành viên</span></header>
        {detail.students.length ? <div className="data-table" role="table" aria-label="Danh sách sinh viên">
          <div className="data-table__head" role="row"><span>Mã sinh viên</span><span>Họ và tên</span><span>Đơn vị</span><span>Trạng thái</span></div>
          {detail.students.map((student) => <div className="data-table__row" role="row" key={student.code}><b>{student.code}</b><span>{student.fullname}</span><span>{student.unitCode}</span><span><i className="status status--success">Đã ghi danh</i></span></div>)}
        </div> : <AsyncState kind="empty" message="Lớp chưa có sinh viên trong roster." />}
      </section>
    </>
  );
}
