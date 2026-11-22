import { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import type { AttendanceSummary } from '../../types';

export function AttendanceSummaryPage() {
  const classId = Number(useParams().classId);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function load() { setLoading(true); setError(''); lmsApi.attendanceSummary(classId).then(setSummary).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo')).finally(() => setLoading(false)); }
  useEffect(load, [classId]);
  const totals = useMemo(() => summary?.students.reduce((result, student) => ({ present: result.present + student.presentCount, late: result.late + student.lateCount, absent: result.absent + student.absentCount, excused: result.excused + student.excusedCount }), { present: 0, late: 0, absent: 0, excused: 0 }), [summary]);
  if (loading) return <AsyncState kind="loading" message="Đang tổng hợp dữ liệu điểm danh…" />;
  if (error || !summary || !totals) return <AsyncState kind="error" message={error || 'Không có dữ liệu báo cáo'} onRetry={load} />;
  return (
    <>
      <Link className="back-link" to={`/courses/${classId}`}><FiArrowLeft /> Chi tiết lớp</Link>
      <header className="page-header"><div><p className="eyebrow">{summary.class.code}</p><h1>Báo cáo điểm danh</h1><span>{summary.class.name} · {summary.finalizedSessionCount} phiên đã chốt</span></div><span className="status status--warning">Dữ liệu mẫu</span></header>
      <section className="summary-strip"><div><b>{totals.present}</b><span>Có mặt</span></div><div><b>{totals.late}</b><span>Đi trễ</span></div><div><b>{totals.absent}</b><span>Vắng</span></div><div><b>{totals.excused}</b><span>Có phép</span></div></section>
      <section className="table-panel"><div className="data-table data-table--report" role="table" aria-label="Báo cáo điểm danh sinh viên"><div className="data-table__head" role="row"><span>Sinh viên</span><span>Có mặt</span><span>Trễ</span><span>Vắng</span><span>Có phép</span><span>Tỷ lệ</span></div>{summary.students.map((student) => <div className="data-table__row" role="row" key={student.code}><span><b>{student.fullname}</b><small>{student.code}</small></span><span>{student.presentCount}</span><span>{student.lateCount}</span><span>{student.absentCount}</span><span>{student.excusedCount}</span><span><b>{student.attendanceRate}%</b><i className="progress"><i style={{ width: `${student.attendanceRate}%` }} /></i></span></div>)}</div></section>
    </>
  );
}
