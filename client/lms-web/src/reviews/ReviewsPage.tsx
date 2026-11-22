import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { attendanceRequest, tokenStore } from '../attendance/attendance-client.ts';
import {
  describeFailure,
  type ApiFailure,
} from '../attendance/attendance-envelope.ts';
import {
  buildResolveBody,
  getResolutionState,
  isHistoryItem,
  isOwnSession,
  isReasonTooLong,
  isReviewCandidate,
  MAX_REASON_LENGTH,
  normalizeToken,
  parseList,
  REASON_LABELS,
  removeCandidate,
  RESOLUTION_LABELS,
  type OwnSession,
  type ReviewCandidate,
  type ReviewDecision,
  type ReviewHistoryItem,
} from './review-model.ts';

type Load<T> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; items: T[]; dropped: number };

const DECISION_LABEL: Record<ReviewDecision, string> = {
  approve: 'Duyệt có mặt',
  reject: 'Từ chối',
};

export default function ReviewsPage() {
  const [token, setToken] = useState(() => tokenStore.get());
  const [draft, setDraft] = useState('');
  const [sessions, setSessions] = useState<Load<OwnSession>>({ kind: 'idle' });
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queue, setQueue] = useState<Load<ReviewCandidate>>({ kind: 'idle' });
  const [history, setHistory] = useState<Load<ReviewHistoryItem>>({ kind: 'idle' });
  const [pending, setPending] = useState<{
    candidate: ReviewCandidate;
    decision: ReviewDecision;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [resolving, setResolving] = useState(false);
  const [notice, setNotice] = useState('');
  const [dialogError, setDialogError] = useState('');
  const inFlight = useRef(false);
  const queueRequest = useRef(0);

  function saveToken(event: FormEvent) {
    event.preventDefault();
    const cleaned = normalizeToken(draft);
    if (!cleaned) return;
    tokenStore.set(cleaned);
    setToken(cleaned);
    setDraft('');
  }
  function clearToken() {
    tokenStore.clear();
    setToken('');
    setSessions({ kind: 'idle' });
    setQueue({ kind: 'idle' });
    setHistory({ kind: 'idle' });
    setSessionId(null);
    setPending(null);
    setNotice('');
  }

  const fail = (failure: ApiFailure, context: 'list' | 'sessions' | 'history') => ({
    kind: 'error' as const,
    message: describeFailure(failure, context),
  });

  // Danh sách phiên do organizer của JWT tạo (GET /v0/attendance-sessions/created-by-me).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setSessions({ kind: 'loading' });
    void attendanceRequest('/v0/attendance-sessions/created-by-me', { token }).then(
      (result) => {
        if (cancelled) return;
        if (!result.ok) return setSessions(fail(result.failure, 'sessions'));
        const parsed = parseList(result.data, isOwnSession);
        setSessions(
          parsed
            ? { kind: 'ready', items: parsed.items, dropped: parsed.dropped }
            : fail({ kind: 'invalid-response' }, 'sessions'),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadQueue = useCallback(
    async (id: number) => {
      const requestId = ++queueRequest.current;
      setQueue({ kind: 'loading' });
      const result = await attendanceRequest(`/v0/attendance/sessions/${id}/reviews`, { token });
      if (requestId !== queueRequest.current) return; // đã đổi phiên: bỏ kết quả cũ
      if (!result.ok) return setQueue(fail(result.failure, 'list'));
      const parsed = parseList(result.data, isReviewCandidate);
      setQueue(
        parsed
          ? { kind: 'ready', items: parsed.items, dropped: parsed.dropped }
          : fail({ kind: 'invalid-response' }, 'list'),
      );
    },
    [token],
  );

  useEffect(() => {
    setPending(null);
    setNotice('');
    if (token && sessionId !== null) void loadQueue(sessionId);
    else {
      queueRequest.current += 1;
      setQueue({ kind: 'idle' });
    }
  }, [token, sessionId, loadQueue]);

  async function loadHistory() {
    setHistory({ kind: 'loading' });
    const result = await attendanceRequest('/v0/attendance/reviews/history', { token });
    if (!result.ok) return setHistory(fail(result.failure, 'history'));
    const parsed = parseList(result.data, isHistoryItem);
    setHistory(
      parsed
        ? { kind: 'ready', items: parsed.items, dropped: parsed.dropped }
        : fail({ kind: 'invalid-response' }, 'history'),
    );
  }

  function openDecision(candidate: ReviewCandidate, decision: ReviewDecision) {
    if (inFlight.current) return;
    setReason('');
    setDialogError('');
    setNotice('');
    setPending({ candidate, decision });
  }

  async function confirm() {
    if (!pending || sessionId === null || inFlight.current) return;
    const { candidate, decision } = pending;
    if (isReasonTooLong(reason)) {
      setDialogError(`Ghi chú tối đa ${MAX_REASON_LENGTH} ký tự.`);
      return;
    }
    // Phiên không còn trong hàng chờ (đã xử lý ở nơi khác) thì báo lỗi, không gửi lại.
    if (queue.kind !== 'ready' || !queue.items.some((c) => c.userId === candidate.userId)) {
      setPending(null);
      setNotice('Yêu cầu này không còn trong hàng chờ. Hàng chờ đang được cập nhật.');
      void loadQueue(sessionId);
      return;
    }
    inFlight.current = true;
    setResolving(true);
    setDialogError('');
    const result = await attendanceRequest(
      `/v0/attendance/sessions/${sessionId}/reviews/${candidate.userId}`,
      { method: 'PATCH', body: buildResolveBody(decision, reason), token },
    );
    inFlight.current = false;
    setResolving(false);
    if (!result.ok) {
      setDialogError(describeFailure(result.failure, 'resolve'));
      // Yêu cầu đã được xử lý / không còn: làm mới hàng chờ thay vì để dữ liệu cũ.
      if (['already-resolved', 'not-found'].includes(result.failure.kind)) {
        setPending(null);
        setNotice(describeFailure(result.failure, 'resolve'));
        void loadQueue(sessionId);
      }
      return;
    }
    setQueue((q) =>
      q.kind === 'ready' ? { ...q, items: removeCandidate(q.items, candidate.userId) } : q,
    );
    setPending(null);
    setNotice(
      `${decision === 'approve' ? 'Đã duyệt có mặt' : 'Đã từ chối'}: ${candidate.student.fullname} (${candidate.student.code}).`,
    );
    if (history.kind === 'ready') void loadHistory();
  }

  const session =
    sessions.kind === 'ready' ? sessions.items.find((s) => s.id === sessionId) : undefined;
  const resolution = session ? getResolutionState(session.openAt, session.closeAt) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <p>ATTENDANCE · KIỂM DUYỆT</p>
          <h1>Duyệt yêu cầu điểm danh</h1>
        </div>
      </div>

      <section className="session-panel">
        <div>
          <h2>JWT Attendance</h2>
          <p>
            Màn này cần JWT của một organizer trên máy chủ Attendance. Dán JWT vào
            đây; token chỉ lưu trong sessionStorage của tab này và bị xóa khi đóng tab.
          </p>
        </div>
        {token ? (
          <div className="session-actions">
            <span className="status">Đã lưu token</span>
            <button className="danger" onClick={clearToken}>
              Xóa token
            </button>
          </div>
        ) : (
          <form className="token-form" onSubmit={saveToken}>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Dán JWT Attendance"
              aria-label="JWT Attendance"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary" disabled={!normalizeToken(draft)}>
              Lưu token
            </button>
          </form>
        )}
      </section>

      {!token && (
        <div className="empty-state">
          <b>Cần dán JWT Attendance</b>
          <span>Chưa có token nên chưa thể tải danh sách phiên và hàng chờ duyệt.</span>
        </div>
      )}

      {token && (
        <>
          <div className="notice-block">
            {sessions.kind === 'loading' && <b>Đang tải danh sách phiên của bạn…</b>}
            {sessions.kind === 'error' && <div className="error-state">{sessions.message}</div>}
            {sessions.kind === 'ready' &&
              (sessions.items.length === 0 ? (
                <div className="empty-state">
                  <b>Chưa có phiên nào</b>
                  <span>JWT này chưa tạo phiên điểm danh nào trên Attendance.</span>
                </div>
              ) : (
                <label>
                  Phiên điểm danh (id số của Attendance)
                  <select
                    value={sessionId ?? ''}
                    onChange={(event) =>
                      setSessionId(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">— Chọn phiên —</option>
                    {sessions.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} · {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>

          {resolution && <div className="notice">{RESOLUTION_LABELS[resolution]}</div>}
          {notice && (
            <div className="notice">
              {notice}
              <button onClick={() => setNotice('')}>×</button>
            </div>
          )}

          {sessionId !== null && (
            <section>
              <div className="section-heading">
                <div>
                  <p>HÀNG CHỜ</p>
                  <h2>Yêu cầu cần duyệt</h2>
                </div>
                <button onClick={() => void loadQueue(sessionId)} disabled={queue.kind === 'loading'}>
                  Tải lại
                </button>
              </div>
              {queue.kind === 'loading' && (
                <div className="empty-state">
                  <b>Đang tải hàng chờ…</b>
                </div>
              )}
              {queue.kind === 'error' && <div className="error-state">{queue.message}</div>}
              {queue.kind === 'ready' && queue.dropped > 0 && (
                <div className="notice">Đã bỏ qua {queue.dropped} yêu cầu sai định dạng.</div>
              )}
              {queue.kind === 'ready' &&
                (queue.items.length === 0 ? (
                  <div className="empty-state">
                    <b>Không có yêu cầu nào đang chờ</b>
                  </div>
                ) : (
                  <div className="report-table">
                    <div className="table-head">
                      <span>Sinh viên</span>
                      <span>Tín hiệu</span>
                      <span>Thao tác</span>
                      <span />
                    </div>
                    {queue.items.map((candidate) => (
                      <div className="table-row" key={candidate.userId}>
                        <b>
                          {candidate.student.fullname} ({candidate.student.code})
                        </b>
                        <span>{candidate.reasons.map((r) => REASON_LABELS[r]).join(', ')}</span>
                        <span className="session-actions">
                          <button
                            className="primary"
                            disabled={resolving}
                            onClick={() => openDecision(candidate, 'approve')}
                          >
                            Duyệt
                          </button>
                          <button
                            className="danger"
                            disabled={resolving}
                            onClick={() => openDecision(candidate, 'reject')}
                          >
                            Từ chối
                          </button>
                        </span>
                        <span />
                      </div>
                    ))}
                  </div>
                ))}
            </section>
          )}

          {pending && (
            <section className="session-panel" role="dialog" aria-label="Xác nhận quyết định">
              <div>
                <h2>
                  {pending.decision === 'approve'
                    ? 'Xác nhận duyệt có mặt'
                    : 'Xác nhận từ chối yêu cầu'}
                </h2>
                <p>
                  {pending.candidate.student.fullname} ({pending.candidate.student.code})
                </p>
              </div>
              <label>
                Ghi chú quyết định (không bắt buộc, tối đa {MAX_REASON_LENGTH} ký tự)
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={resolving}
                  rows={3}
                />
              </label>
              {dialogError && <div className="error-state">{dialogError}</div>}
              <div className="form-actions">
                <button disabled={resolving} onClick={() => setPending(null)}>
                  Quay lại
                </button>
                <button
                  className={pending.decision === 'approve' ? 'primary' : 'danger'}
                  disabled={resolving}
                  onClick={() => void confirm()}
                >
                  {resolving ? 'Đang xử lý…' : DECISION_LABEL[pending.decision]}
                </button>
              </div>
            </section>
          )}

          <section>
            <div className="section-heading">
              <div>
                <p>LỊCH SỬ</p>
                <h2>Quyết định bạn đã xử lý</h2>
              </div>
              <button onClick={() => void loadHistory()} disabled={history.kind === 'loading'}>
                {history.kind === 'idle' ? 'Tải lịch sử' : 'Tải lại'}
              </button>
            </div>
            {history.kind === 'loading' && (
              <div className="empty-state">
                <b>Đang tải lịch sử…</b>
              </div>
            )}
            {history.kind === 'error' && <div className="error-state">{history.message}</div>}
            {history.kind === 'ready' &&
              (history.items.length === 0 ? (
                <div className="empty-state">
                  <b>Chưa có lịch sử kiểm duyệt</b>
                </div>
              ) : (
                <div className="report-table">
                  <div className="table-head">
                    <span>Sinh viên</span>
                    <span>Quyết định</span>
                    <span>Phiên · ghi chú</span>
                    <span>Xử lý lúc (UTC)</span>
                  </div>
                  {history.items.map((item) => (
                    <div className="table-row" key={item.id}>
                      <b>
                        {item.student.fullname} ({item.student.code})
                      </b>
                      <span>{item.decision === 'approve' ? 'Đã duyệt' : 'Đã từ chối'}</span>
                      <span>
                        #{item.session.id} {item.session.title}
                        {item.reason ? ` · ${item.reason}` : ''}
                      </span>
                      <time>{new Date(item.resolvedAt).toISOString()}</time>
                    </div>
                  ))}
                </div>
              ))}
          </section>
        </>
      )}
    </>
  );
}
