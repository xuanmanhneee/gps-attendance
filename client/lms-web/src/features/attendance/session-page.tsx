import { useEffect, useState } from 'react';
import { FiArrowLeft, FiFileText, FiSlash } from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import type { AttendanceSession } from '../../types';

export function SessionPage() {
  const externalId = decodeURIComponent(useParams().externalId ?? '');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'records' | 'cancel' | ''>('');
  function load() { setLoading(true); setError(''); lmsApi.session(externalId).then(setSession).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải phiên')).finally(() => setLoading(false)); }
  useEffect(load, [externalId]);
  async function inspectRecords() { setAction('records'); setError(''); try { setRecords(JSON.stringify(await lmsApi.records(externalId), null, 2)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải records'); } finally { setAction(''); } }
  async function cancel() { setAction('cancel'); setError(''); try { setSession(await lmsApi.cancelSession(externalId)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể hủy phiên'); } finally { setAction(''); } }
  if (loading) return <AsyncState kind="loading" message="Đang đọc trạng thái phiên…" />;
  if (!session) return <AsyncState kind="error" message={error || 'Không tìm thấy phiên'} onRetry={load} />;
  return (
    <>
      <Link className="back-link" to="/courses"><FiArrowLeft /> Danh sách lớp</Link>
      <header className="page-header"><div><p className="eyebrow">Điểm danh</p><h1>Chi tiết phiên</h1><span>Theo dõi trạng thái và kết quả trả về từ Attendance.</span></div><span className={`status status--${session.status === 'cancelled' ? 'danger' : 'success'}`}>{session.status}</span></header>
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      <section className="session-card"><div className="session-card__identity"><span>Mã phiên LMS</span><b>{session.externalId}</b><small>{session.participantCount} sinh viên · {session.finalized ? 'Đã chốt' : 'Đang mở'}</small></div><div className="action-cluster"><button className="button button--secondary" disabled={Boolean(action)} onClick={() => void inspectRecords()}><FiFileText /> {action === 'records' ? 'Đang tải…' : 'Xem records'}</button><button className="button button--danger" disabled={Boolean(action) || session.status === 'cancelled'} onClick={() => void cancel()}><FiSlash /> {action === 'cancel' ? 'Đang hủy…' : 'Hủy phiên'}</button></div></section>
      {records && <section className="records-panel"><header><h2>Records từ Attendance</h2><span>Dữ liệu kỹ thuật trả về nguyên trạng</span></header><pre>{records}</pre></section>}
    </>
  );
}
