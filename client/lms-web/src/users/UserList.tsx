import { useEffect, useMemo, useState } from 'react';
import { attendanceRequest } from '../attendance/attendance-client.ts';
import { describeFailure } from '../attendance/attendance-envelope.ts';
import {
  filterUsers,
  paginate,
  parseUserList,
  ROLE_LABELS,
  ROLES,
  summarizeUsersByRole,
  type UserListItem,
  type UserRoleFilter,
} from './user-list.ts';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; users: UserListItem[]; dropped: number };

export default function UserList() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRoleFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    // GET /v0/users không cần JWT.
    void attendanceRequest('/v0/users').then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState({ kind: 'error', message: describeFailure(result.failure, 'users') });
        return;
      }
      const parsed = parseUserList(result.data);
      setState(
        parsed
          ? { kind: 'ready', users: parsed.users, dropped: parsed.dropped }
          : {
              kind: 'error',
              message: describeFailure({ kind: 'invalid-response' }, 'users'),
            },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const users = state.kind === 'ready' ? state.users : [];
  const summary = useMemo(() => summarizeUsersByRole(users), [users]);
  const filtered = useMemo(
    () => filterUsers(users, query, role),
    [users, query, role],
  );
  const current = paginate(filtered, page);

  return (
    <>
      <div className="page-header">
        <div>
          <p>NGƯỜI DÙNG ATTENDANCE</p>
          <h1>Danh sách người dùng</h1>
        </div>
        <input
          placeholder="Tìm theo mã hoặc họ tên…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Lọc theo vai trò"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as UserRoleFilter);
            setPage(1);
          }}
        >
          <option value="all">Tất cả vai trò</option>
          {ROLES.map((key) => (
            <option key={key} value={key}>
              {ROLE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {state.kind === 'loading' && (
        <div className="empty-state">
          <b>Đang tải danh sách người dùng…</b>
        </div>
      )}
      {state.kind === 'error' && (
        <div className="error-state">
          {state.message} <button onClick={() => setAttempt((n) => n + 1)}>Thử lại</button>
        </div>
      )}
      {state.kind === 'ready' && (
        <>
          {state.dropped > 0 && (
            <div className="notice">
              Đã bỏ qua {state.dropped} người dùng có dữ liệu sai định dạng.
            </div>
          )}
          <div className="integration-summary">
            <div>
              <b>{summary.total}</b>
              <span>Tổng người dùng</span>
            </div>
            {ROLES.map((key) => (
              <div key={key}>
                <b>{summary[key]}</b>
                <span>{ROLE_LABELS[key]}</span>
              </div>
            ))}
          </div>
          {users.length === 0 ? (
            <div className="empty-state">
              <b>Chưa có người dùng nào</b>
              <span>Máy chủ Attendance trả về danh sách rỗng.</span>
            </div>
          ) : (
            <div className="report-table">
              <div className="table-head">
                <span>Mã</span>
                <span>Họ và tên</span>
                <span>Vai trò</span>
                <span>Đơn vị</span>
              </div>
              {filtered.length === 0 ? (
                <div className="empty-row">Không có người dùng khớp bộ lọc.</div>
              ) : (
                current.items.map((user) => (
                  <div className="table-row" key={user.id}>
                    <b>{user.code}</b>
                    <span>{user.fullname}</span>
                    <span>{ROLE_LABELS[user.role]}</span>
                    <span>#{user.unitId}</span>
                  </div>
                ))
              )}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="pager">
              <button disabled={current.page <= 1} onClick={() => setPage(current.page - 1)}>
                ← Trước
              </button>
              <span>
                {current.from}–{current.to} / {current.total} · Trang {current.page}/
                {current.pageCount}
              </span>
              <button
                disabled={current.page >= current.pageCount}
                onClick={() => setPage(current.page + 1)}
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
