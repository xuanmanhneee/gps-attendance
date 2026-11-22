import { useEffect, useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiServer, FiXCircle } from 'react-icons/fi';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import type { CallReport } from '../../types';

export function IntegrationPage() {
  const [report, setReport] = useState<CallReport[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  function load() { setLoading(true); setError(''); lmsApi.integrationReport().then(setReport).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo tích hợp')).finally(() => setLoading(false)); }
  useEffect(load, []);
  async function sync() { setSyncing(true); setError(''); setNotice(''); try { const result = await lmsApi.sync(); setReport(result.report); setNotice('Đã đồng bộ Unit, User, khóa học và tài khoản.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đồng bộ Attendance'); } finally { setSyncing(false); } }
  if (loading) return <AsyncState kind="loading" message="Đang tải lịch sử tích hợp…" />;
  const successCount = report.filter((call) => call.ok).length;
  const failureCount = report.length - successCount;
  const realCount = report.filter((call) => call.source === 'attendance').length;
  return (
    <>
      <header className="page-header"><div><p className="eyebrow">Attendance integration</p><h1>Trạng thái đồng bộ</h1><span>Báo cáo từng operation mà LMS gửi sang hệ thống Attendance.</span></div><button className="button button--primary" disabled={syncing} onClick={() => void sync()}><FiRefreshCw className={syncing ? 'spin' : ''} /> {syncing ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}</button></header>
      {notice && <div className="alert alert--success" role="status">{notice}</div>}{error && <div className="alert alert--error" role="alert">{error}</div>}
      <section className="stats-grid integration-stats"><div className="stat-card stat-card--lead"><FiServer /><div><b>{realCount}</b><span>Lời gọi Attendance thật</span></div></div><div className="stat-card"><FiCheckCircle /><div><b>{successCount}</b><span>Operation thành công</span></div></div><div className="stat-card stat-card--danger"><FiXCircle /><div><b>{failureCount}</b><span>Lỗi được ghi nhận</span></div></div></section>
      <section className="table-panel"><header className="section-header"><div><p className="eyebrow">Operation log</p><h2>Lịch sử gọi API</h2></div><span className="count-badge">{report.length} bản ghi</span></header>{report.length ? <div className="data-table data-table--integration" role="table"><div className="data-table__head" role="row"><span>Endpoint</span><span>Nguồn</span><span>Trạng thái</span><span>Thời gian</span></div>{report.slice().reverse().map((call, index) => <div className="data-table__row" role="row" key={`${call.endpoint}-${call.at}-${index}`}><b>{call.endpoint}</b><span><i className={`status ${call.source === 'mock' ? 'status--warning' : 'status--info'}`}>{call.source}</i></span><span className={call.ok ? 'text-success' : 'text-danger'}>{call.ok ? 'Thành công' : call.message || 'Thất bại'}</span><time>{new Date(call.at).toLocaleString('vi-VN')}</time></div>)}</div> : <AsyncState kind="empty" message="Chưa có operation tích hợp nào được ghi nhận." />}</section>
    </>
  );
}
