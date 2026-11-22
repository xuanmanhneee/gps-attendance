import { useEffect, useMemo, useState } from 'react';
import {
  buildSessionReportCsv,
  buildSessionReportFileName,
  downloadCsvFile,
  filterRecords,
  NOT_AVAILABLE,
  sessionStatusLabel,
  statusLabel,
  summarizeRecords,
  toUtcIso,
  type SessionDetail,
  type SessionRecordsResponse,
} from './report-csv.ts';

type Loader = <T>(path: string) => Promise<T>;
type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; session: SessionDetail; data: SessionRecordsResponse };

export default function SessionReport({
  externalId,
  load,
  onBack,
}: {
  externalId: string;
  load: Loader;
  onBack: () => void;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    const base = `/api/integration/sessions/${encodeURIComponent(externalId)}`;
    Promise.all([
      load<SessionDetail>(base),
      load<SessionRecordsResponse>(`${base}/records`),
    ])
      .then(([session, data]) => {
        if (cancelled) return;
        // Không tin dữ liệu sai hình dạng: coi như lỗi thay vì render bảng hỏng.
        if (!session || !data || !Array.isArray(data.records)) {
          setState({ kind: 'error' });
          return;
        }
        setState({ kind: 'ready', session, data });
      })
      // Cố ý không hiển thị Error.message thô cho người dùng.
      .catch(() => !cancelled && setState({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [externalId, load, attempt]);

  const records = state.kind === 'ready' ? state.data.records : [];
  const summary = useMemo(() => summarizeRecords(records), [records]);
  const visible = useMemo(
    () => filterRecords(records, status, query),
    [records, status, query],
  );
  const statuses = Object.keys(summary.counts);

  const exportHint =
    state.kind === 'loading'
      ? 'Đang tải dữ liệu, chưa thể xuất'
      : state.kind === 'error'
        ? 'Không tải được dữ liệu nên chưa thể xuất'
        : records.length === 0
          ? 'Chưa có bản ghi để xuất'
          : '';

  function exportCsv() {
    if (state.kind !== 'ready') return;
    const generatedAt = new Date();
    // Luôn xuất toàn bộ records, không phụ thuộc bộ lọc đang xem.
    downloadCsvFile(
      buildSessionReportFileName(externalId, generatedAt),
      buildSessionReportCsv({
        session: state.session,
        records: state.data.records,
        generatedAt,
      }),
    );
  }

  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Quay lại phiên điểm danh
      </button>
      <div className="page-header">
        <div>
          <p>BÁO CÁO PHIÊN</p>
          <h1>{externalId}</h1>
        </div>
        <div className="export-action">
          <button
            className="primary"
            disabled={exportHint !== ''}
            title={exportHint || undefined}
            aria-describedby={exportHint ? 'export-hint' : undefined}
            onClick={exportCsv}
          >
            Xuất CSV
          </button>
          {exportHint && <small id="export-hint">{exportHint}</small>}
        </div>
      </div>
      {state.kind === 'loading' && (
        <div className="empty-state">
          <b>Đang tải báo cáo…</b>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="error-state">
          Không thể tải báo cáo phiên điểm danh. Vui lòng thử lại.{' '}
          <button onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>
        </div>
      )}
      {state.kind === 'ready' && (
        <>
          <div className="session-panel">
            <div>
              <span className={`status ${state.session.status}`}>
                {sessionStatusLabel(state.session.status)}
              </span>
              <h2>{state.session.title ?? NOT_AVAILABLE}</h2>
              <p>
                Mở: {toUtcIso(state.session.openAt)} · Đóng:{' '}
                {toUtcIso(state.session.closeAt)} (UTC) ·{' '}
                {state.data.finalized ? 'Đã chốt' : 'Chưa chốt'}
              </p>
              <p>
                Dữ liệu LMS không có vai trò và thời điểm cập nhật nên báo cáo
                không có các cột này.
              </p>
            </div>
          </div>
          <div className="integration-summary">
            <div>
              <b>{summary.total}</b>
              <span>Tổng số dòng</span>
            </div>
            {statuses.map((key) => (
              <div key={key}>
                <b>{summary.counts[key]}</b>
                <span>{statusLabel(key)}</span>
              </div>
            ))}
          </div>
          {records.length === 0 ? (
            <div className="empty-state">
              <b>Chưa có bản ghi điểm danh</b>
              <span>
                {state.session.participantCount
                  ? `Phiên có ${state.session.participantCount} sinh viên nhưng chưa có bản ghi. `
                  : ''}
                Danh sách rỗng có thể do chưa có ai điểm danh, hoặc do hệ thống
                Attendance không phản hồi và LMS đang dùng dữ liệu giả lập.
              </span>
            </div>
          ) : (
            <>
              <div className="page-header">
                <input
                  placeholder="Tìm theo mã hoặc họ tên…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  aria-label="Lọc theo trạng thái"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {statuses.map((key) => (
                    <option key={key} value={key}>
                      {statusLabel(key)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="report-table">
                <div className="table-head">
                  <span>Mã sinh viên</span>
                  <span>Họ và tên</span>
                  <span>Trạng thái</span>
                  <span>Điểm danh lúc (UTC)</span>
                </div>
                {visible.length === 0 ? (
                  <div className="empty-row">
                    Không có dòng nào khớp bộ lọc. Xuất CSV vẫn gồm toàn bộ{' '}
                    {summary.total} dòng.
                  </div>
                ) : (
                  visible.map((record) => (
                    <div className="table-row" key={record.code}>
                      <b>{record.code}</b>
                      <span>{record.fullname}</span>
                      <span>{statusLabel(record.status)}</span>
                      <time>
                        {record.checkedInAt
                          ? toUtcIso(record.checkedInAt)
                          : 'Chưa điểm danh'}
                      </time>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
