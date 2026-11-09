import { FormEvent, useEffect, useState } from 'react';
import logoUrl from '../../mobile-client/assets/images/logo-dlu.png';

type Course = { id: number; code: string; name: string; lecturerCode: string };
type Building = {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
};
type LmsUser = {
  code: string;
  fullname: string;
  role: 'organizer' | 'participant';
  unitCode: string;
};
type CourseDetail = { course: Course; students: LmsUser[] };
type AttendanceSession = {
  externalId: string;
  status: string;
  participantCount: number;
  finalized: boolean;
};
type CallReport = {
  endpoint: string;
  source: string;
  ok: boolean;
  message?: string;
  at: string;
};
type Page =
  'dashboard' | 'courses' | 'course-detail' | 'attendance' | 'integration';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('lms-token');
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'Yêu cầu thất bại');
  return body;
}

function Login({ onLogin }: { onLogin: (user: LmsUser) => void }) {
  const [username, setUsername] = useState('gv001');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api<{ token: string; user: LmsUser }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) },
      );
      sessionStorage.setItem('lms-token', result.token);
      onLogin(result.user);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Không thể đăng nhập',
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-brand">
        <img src={logoUrl} alt="Logo Đại học Đà Lạt" />
        <div>
          <b>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</b>
          <span>DALAT UNIVERSITY</span>
        </div>
      </div>
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <p className="login-kicker">HỆ THỐNG HỌC TẬP TRỰC TUYẾN</p>
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để truy cập lớp học và quản lý điểm danh.</p>
        <label>
          Tên đăng nhập
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="error-state">{error}</div>}
        <button className="primary" disabled={loading}>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <small>
          Tài khoản demo: <b>gv001</b> / <b>demo123</b>
        </small>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<LmsUser | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [pendingCourse, setPendingCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState(1);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AttendanceSession | null>(null);
  const [report, setReport] = useState<CallReport[]>([]);
  const [records, setRecords] = useState<string | null>(null);
  useEffect(() => {
    if (!sessionStorage.getItem('lms-token')) return;
    api<LmsUser>('/api/auth/me')
      .then(setUser)
      .catch(() => sessionStorage.removeItem('lms-token'));
  }, []);
  useEffect(() => {
    if (!user) return;
    Promise.all([
      api<Course[]>('/api/classes'),
      api<Building[]>('/api/buildings'),
      api<CallReport[]>('/api/integration/report'),
    ])
      .then(([loadedCourses, loadedBuildings, loadedReport]) => {
        setCourses(loadedCourses);
        setBuildings(loadedBuildings);
        setReport(loadedReport);
        setBuildingId(loadedBuildings[0]?.id ?? 1);
      })
      .catch((error: Error) => setMessage(error.message));
  }, [user]);
  if (!user) return <Login onLogin={setUser} />;

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      sessionStorage.removeItem('lms-token');
      setUser(null);
    }
  }
  async function sync() {
    const data = await api<{ report: CallReport[] }>('/api/integration/sync', {
      method: 'POST',
    });
    setReport(data.report);
    setMessage('Đã đồng bộ Unit, User, học phần và Account.');
  }
  async function openCourse(course: Course) {
    setPage('course-detail');
    setCourseLoading(true);
    setCourseDetail(null);
    try {
      setCourseDetail(await api<CourseDetail>(`/api/classes/${course.id}`));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể tải lớp học',
      );
      setPage('courses');
    } finally {
      setCourseLoading(false);
    }
  }
  async function createSession(course: Course) {
    setSessionLoading(true);
    try {
      const now = Date.now();
      const body = {
        title: `${course.code} — buổi học demo`,
        buildingId,
        radius: 100,
        openAt: new Date(now + 60_000).toISOString(),
        closeAt: new Date(now + 46 * 60_000).toISOString(),
      };
      const data = await api<{ session: { externalId: string } }>(
        `/api/classes/${course.id}/sessions`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setResult(
        await api<AttendanceSession>(
          `/api/integration/sessions/${encodeURIComponent(data.session.externalId)}`,
        ),
      );
      setPendingCourse(null);
      setPage('attendance');
      setMessage('Phiên điểm danh đã được tạo.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể tạo phiên điểm danh',
      );
    } finally {
      setSessionLoading(false);
    }
  }
  async function inspectSession() {
    if (result)
      setRecords(
        JSON.stringify(
          await api(
            `/api/integration/sessions/${encodeURIComponent(result.externalId)}/records`,
          ),
          null,
          2,
        ),
      );
  }
  async function cancelSession() {
    if (result)
      setResult(
        await api<AttendanceSession>(
          `/api/integration/sessions/${encodeURIComponent(result.externalId)}/cancel`,
          { method: 'POST' },
        ),
      );
  }
  function prepareSession(course: Course) {
    setPendingCourse(course);
    setResult(null);
    setRecords(null);
    setPage('attendance');
  }

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: '⌂' },
    { id: 'courses', label: 'Khóa học của tôi', icon: '▤' },
    { id: 'attendance', label: 'Điểm danh', icon: '✓' },
    { id: 'integration', label: 'Tích hợp', icon: '↻' },
  ];
  const selectedBuilding = buildings.find(
    (building) => building.id === buildingId,
  );
  return (
    <div className="lms-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logoUrl} alt="DLU" />
          <span>LMS-DLU</span>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              className={
                page === item.id ||
                (page === 'course-detail' && item.id === 'courses')
                  ? 'active'
                  : ''
              }
              onClick={() => setPage(item.id)}
              key={item.id}
            >
              <i>{item.icon}</i>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>Giảng viên</span>
          <b>{user.fullname}</b>
        </div>
      </aside>
      <div className="app-column">
        <header className="topbar">
          <div className="university">
            <img src={logoUrl} alt="Logo DLU" />
            <div>
              <b>TRƯỜNG ĐẠI HỌC ĐÀ LẠT</b>
              <span>HỆ THỐNG HỌC TẬP TRỰC TUYẾN</span>
            </div>
          </div>
          <div className="top-actions">
            <button aria-label="Thông báo">◔</button>
            <div className="avatar">{user.fullname.split(' ').at(-1)?.[0]}</div>
            <div>
              <b>{user.fullname}</b>
              <span>{user.code}</span>
            </div>
            <button onClick={() => void logout()}>Đăng xuất</button>
          </div>
        </header>
        <main className="workspace">
          {message && (
            <div className="notice">
              {message}
              <button onClick={() => setMessage('')}>×</button>
            </div>
          )}
          {page === 'dashboard' && (
            <>
              <section className="dashboard-hero">
                <div>
                  <p>Học kỳ 1 · 2026–2027</p>
                  <h1>Xin chào, {user.fullname.split(' ').at(-1)}</h1>
                  <span>
                    Bạn đang phụ trách {courses.length} lớp học trong học kỳ
                    này.
                  </span>
                </div>
                <div className="hero-stat">
                  <b>{courses.length}</b>
                  <span>Lớp học đang phụ trách</span>
                </div>
              </section>
              <div className="dashboard-layout">
                <section>
                  <div className="section-heading">
                    <div>
                      <p>TỔNG QUAN KHÓA HỌC</p>
                      <h2>Lớp học của tôi</h2>
                    </div>
                    <button onClick={() => setPage('courses')}>
                      Xem tất cả →
                    </button>
                  </div>
                  <CourseGrid courses={courses} onOpen={openCourse} />
                </section>
              </div>
            </>
          )}
          {page === 'courses' && (
            <>
              <div className="page-header">
                <div>
                  <p>KHÓA HỌC</p>
                  <h1>Các lớp học của tôi</h1>
                </div>
                <input placeholder="Tìm kiếm lớp học…" />
              </div>
              <CourseGrid courses={courses} onOpen={openCourse} />
            </>
          )}
          {page === 'course-detail' && (
            <>
              {courseLoading && (
                <div className="empty-state">
                  <b>Đang tải lớp học…</b>
                </div>
              )}
              {courseDetail && (
                <>
                  <button
                    className="back-button"
                    onClick={() => setPage('courses')}
                  >
                    ← Quay lại danh sách lớp
                  </button>
                  <section className="class-hero">
                    <div>
                      <p>{courseDetail.course.code} · HỌC KỲ 1</p>
                      <h1>{courseDetail.course.name}</h1>
                      <span>
                        {courseDetail.students.length} sinh viên · Giảng viên{' '}
                        {user.fullname}
                      </span>
                    </div>
                    <div className="class-actions">
                      <button
                        className="primary"
                        onClick={() => prepareSession(courseDetail.course)}
                      >
                        Tạo phiên điểm danh
                      </button>
                      <small>Địa điểm sẽ được chọn ở bước tiếp theo.</small>
                    </div>
                  </section>
                  <section className="roster-panel">
                    <div className="section-heading">
                      <div>
                        <p>DANH SÁCH LỚP</p>
                        <h2>Sinh viên</h2>
                      </div>
                      <span>{courseDetail.students.length} thành viên</span>
                    </div>
                    <div className="roster-table">
                      <div className="roster-head">
                        <span>Mã sinh viên</span>
                        <span>Họ và tên</span>
                        <span>Đơn vị</span>
                        <span>Trạng thái</span>
                      </div>
                      {courseDetail.students.map((student) => (
                        <div className="roster-row" key={student.code}>
                          <b>{student.code}</b>
                          <span>{student.fullname}</span>
                          <span>{student.unitCode}</span>
                          <span className="enrolled">Đã ghi danh</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
          {page === 'attendance' && (
            <>
              <div className="page-header">
                <div>
                  <p>ĐIỂM DANH</p>
                  <h1>
                    {pendingCourse ? 'Tạo phiên điểm danh' : 'Phiên điểm danh'}
                  </h1>
                </div>
              </div>
              {pendingCourse ? (
                <section className="session-create-panel">
                  <div className="session-course-summary">
                    <span>LỚP ĐƯỢC CHỌN</span>
                    <b>{pendingCourse.code}</b>
                    <h2>{pendingCourse.name}</h2>
                    <p>
                      Phiên mở sau 1 phút và kéo dài 45 phút trong bản demo.
                    </p>
                  </div>
                  <div className="session-create-form">
                    <label>
                      Tòa nhà điểm danh
                      <select
                        value={buildingId}
                        onChange={(event) =>
                          setBuildingId(Number(event.target.value))
                        }
                      >
                        {buildings.map((building) => (
                          <option key={building.id} value={building.id}>
                            {building.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedBuilding && (
                      <div className="location-preview">
                        <b>{selectedBuilding.name}</b>
                        <span>
                          {selectedBuilding.latitude},{' '}
                          {selectedBuilding.longitude}
                        </span>
                        <small>Bán kính mặc định: 100 m</small>
                      </div>
                    )}
                    <div className="form-actions">
                      <button
                        onClick={() => {
                          setPendingCourse(null);
                          setPage('course-detail');
                        }}
                      >
                        Quay lại lớp
                      </button>
                      <button
                        className="primary"
                        disabled={sessionLoading || !selectedBuilding}
                        onClick={() => void createSession(pendingCourse)}
                      >
                        {sessionLoading ? 'Đang tạo…' : 'Xác nhận tạo phiên'}
                      </button>
                    </div>
                  </div>
                </section>
              ) : !result ? (
                <div className="empty-state">
                  <b>Chưa có phiên gần đây</b>
                  <span>Mở một lớp học và chọn “Tạo phiên điểm danh”.</span>
                </div>
              ) : (
                <div className="session-panel">
                  <div>
                    <span className={`status ${result.status}`}>
                      {result.status}
                    </span>
                    <h2>{result.externalId}</h2>
                    <p>
                      {result.participantCount} sinh viên ·{' '}
                      {result.finalized ? 'Đã chốt' : 'Đang mở'}
                    </p>
                  </div>
                  <div className="session-actions">
                    <button onClick={() => void inspectSession()}>
                      Xem records
                    </button>
                    <button
                      className="danger"
                      onClick={() => void cancelSession()}
                    >
                      Hủy phiên
                    </button>
                  </div>
                  {records && <pre>{records}</pre>}
                </div>
              )}
            </>
          )}
          {page === 'integration' && (
            <>
              <div className="page-header">
                <div>
                  <p>TÍCH HỢP ATTENDANCE</p>
                  <h1>Trạng thái đồng bộ</h1>
                </div>
                <button className="primary" onClick={() => void sync()}>
                  Đồng bộ ngay
                </button>
              </div>
              <div className="integration-summary">
                <div>
                  <b>
                    {
                      report.filter(
                        (call) => call.source === 'attendance' && call.ok,
                      ).length
                    }
                  </b>
                  <span>Attendance thật</span>
                </div>
                <div>
                  <b>
                    {report.filter((call) => call.source === 'mock').length}
                  </b>
                  <span>Mock fallback</span>
                </div>
                <div>
                  <b>{report.filter((call) => !call.ok).length}</b>
                  <span>Lỗi được ghi nhận</span>
                </div>
              </div>
              <div className="report-table">
                <div className="table-head">
                  <span>Endpoint</span>
                  <span>Nguồn</span>
                  <span>Trạng thái</span>
                  <span>Thời gian</span>
                </div>
                {report.length === 0 ? (
                  <div className="empty-row">Chưa có lần đồng bộ nào.</div>
                ) : (
                  report
                    .slice()
                    .reverse()
                    .map((call, index) => (
                      <div
                        className="table-row"
                        key={`${call.endpoint}-${index}`}
                      >
                        <b>{call.endpoint}</b>
                        <span className={`source ${call.source}`}>
                          {call.source}
                        </span>
                        <span>{call.ok ? 'Thành công' : call.message}</span>
                        <time>
                          {new Date(call.at).toLocaleTimeString('vi-VN')}
                        </time>
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CourseGrid({
  courses,
  onOpen,
}: {
  courses: Course[];
  onOpen: (course: Course) => Promise<void>;
}) {
  return (
    <div className="course-grid">
      {courses.map((course, index) => (
        <button
          type="button"
          className={`course-card cover-${index % 3}`}
          onClick={() => void onOpen(course)}
          key={course.id}
        >
          <div className="course-cover">
            <span>HỌC KỲ 1</span>
            <b>{course.code}</b>
          </div>
          <div className="course-body">
            <small>Khoa Công nghệ Thông tin</small>
            <h3>{course.name}</h3>
            <p>Giảng viên · {course.lecturerCode}</p>
            <strong>Xem lớp học →</strong>
          </div>
        </button>
      ))}
    </div>
  );
}
