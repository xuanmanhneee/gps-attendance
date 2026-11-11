import { useEffect, useState, type FormEvent } from 'react';
import { FiArrowLeft, FiClock, FiMapPin } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import { AsyncState } from '../../components/async-state';
import type { Building, CourseDetail } from '../../types';

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CreateSessionPage() {
  const classId = Number(useParams().classId);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState(0);
  const [title, setTitle] = useState('');
  const [radius, setRadius] = useState(100);
  const [openAt, setOpenAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 60_000)),
  );
  const [closeAt, setCloseAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 46 * 60_000)),
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    Promise.all([lmsApi.course(classId), lmsApi.buildings()])
      .then(([course, nextBuildings]) => {
        setDetail(course);
        setTitle(`${course.course.code} — buổi học`);
        setBuildings(nextBuildings);
        setBuildingId(nextBuildings[0]?.id ?? 0);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : 'Không thể chuẩn bị phiên',
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(load, [classId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await lmsApi.createSession(classId, {
        title,
        buildingId,
        radius,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
      });
      navigate(`/attendance/${encodeURIComponent(result.session.externalId)}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không thể tạo phiên điểm danh',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function selectBuilding(id: number) {
    setBuildingId(id);
    if (buildings.find((item) => item.id === id)?.code === 'GPS-TEST') {
      setRadius((current) => Math.max(current, 300));
    }
  }

  if (loading)
    return (
      <AsyncState kind="loading" message="Đang chuẩn bị form tạo phiên…" />
    );
  if (!detail)
    return (
      <AsyncState
        kind="error"
        message={error || 'Không tìm thấy lớp học'}
        onRetry={load}
      />
    );
  const building = buildings.find((item) => item.id === buildingId);
  return (
    <>
      <Link className="back-link" to={`/courses/${classId}`}>
        <FiArrowLeft /> Chi tiết lớp
      </Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">{detail.course.code}</p>
          <h1>Tạo phiên điểm danh</h1>
          <span>
            Kiểm tra thời gian và vị trí trước khi gửi sang Attendance.
          </span>
        </div>
      </header>
      <form
        className="session-workspace"
        onSubmit={(event) => void submit(event)}
      >
        <section className="form-panel">
          <header>
            <FiClock />
            <div>
              <h2>Thông tin phiên</h2>
              <span>
                {detail.course.name} · {detail.students.length} sinh viên
              </span>
            </div>
          </header>
          <label className="field field--full">
            Tên phiên
            <input
              required
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="field">
            Mở lúc
            <input
              required
              type="datetime-local"
              value={openAt}
              onChange={(event) => setOpenAt(event.target.value)}
            />
          </label>
          <label className="field">
            Đóng lúc
            <input
              required
              type="datetime-local"
              min={openAt}
              value={closeAt}
              onChange={(event) => setCloseAt(event.target.value)}
            />
          </label>
          <label className="field">
            Tòa nhà
            <select
              required
              value={buildingId}
              onChange={(event) => selectBuilding(Number(event.target.value))}
            >
              {buildings.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Bán kính (m)
            <input
              required
              type="number"
              min={1}
              max={1000}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
          </label>
          {error && (
            <div className="alert alert--error field--full" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions field--full">
            <Link
              className="button button--secondary"
              to={`/courses/${classId}`}
            >
              Hủy
            </Link>
            <button
              className="button button--primary"
              disabled={submitting || !building}
            >
              {submitting ? 'Đang tạo phiên…' : 'Xác nhận tạo phiên'}
            </button>
          </div>
        </section>
        <aside className="location-panel">
          <div className="location-panel__map">
            <FiMapPin />
            <span>GPS anchor</span>
          </div>
          {building ? (
            <div>
              <p className="eyebrow">Vị trí đã chọn</p>
              <h2>{building.name}</h2>
              <dl>
                <div>
                  <dt>Mã tòa</dt>
                  <dd>{building.code}</dd>
                </div>
                <div>
                  <dt>Tọa độ</dt>
                  <dd>
                    {building.latitude}, {building.longitude}
                  </dd>
                </div>
                <div>
                  <dt>Bán kính</dt>
                  <dd>{radius} m</dd>
                </div>
              </dl>
              <small>
                Tọa độ tòa nhà được chụp vào phiên tại thời điểm tạo.
              </small>
            </div>
          ) : (
            <AsyncState kind="empty" message="Chưa có tòa nhà để chọn." />
          )}
        </aside>
      </form>
    </>
  );
}
