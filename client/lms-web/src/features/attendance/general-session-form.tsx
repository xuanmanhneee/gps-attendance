import { useMemo, useState, type FormEvent } from 'react';
import {
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiMapPin,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { lmsApi } from '../../api/lms-api';
import type { AttendanceOptions, Building } from '../../types';
import { buildUnitTree, type LmsUnitTreeNode } from './unit-tree';

function toLocalInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

type Props = {
  buildings: Building[];
  options: AttendanceOptions;
};

type UnitTreeChoiceProps = {
  node: LmsUnitTreeNode;
  depth: number;
  expandedCodes: Set<string>;
  selectedCodes: string[];
  onToggleExpanded: (code: string) => void;
  onToggleSelected: (code: string) => void;
};

function UnitTreeChoice({
  node,
  depth,
  expandedCodes,
  selectedCodes,
  onToggleExpanded,
  onToggleSelected,
}: UnitTreeChoiceProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedCodes.has(node.code);
  const Chevron = isExpanded ? FiChevronDown : FiChevronRight;

  return (
    <li>
      <div className="unit-tree-row" style={{ paddingLeft: depth * 22 + 10 }}>
        {hasChildren ? (
          <button
            type="button"
            className="unit-tree-toggle"
            aria-label={`${isExpanded ? 'Thu gọn' : 'Mở rộng'} ${node.name}`}
            aria-expanded={isExpanded}
            onClick={() => onToggleExpanded(node.code)}
          >
            <Chevron />
          </button>
        ) : (
          <span className="unit-tree-toggle" aria-hidden="true" />
        )}
        <label>
          <input
            type="checkbox"
            checked={selectedCodes.includes(node.code)}
            onChange={() => onToggleSelected(node.code)}
          />
          <span>
            <b>{node.name}</b>
            <small>
              {node.code}
              {hasChildren ? ` · ${node.children.length} Unit con` : ''}
            </small>
          </span>
        </label>
      </div>
      {hasChildren && isExpanded && (
        <ul>
          {node.children.map((child) => (
            <UnitTreeChoice
              key={child.code}
              node={child}
              depth={depth + 1}
              expandedCodes={expandedCodes}
              selectedCodes={selectedCodes}
              onToggleExpanded={onToggleExpanded}
              onToggleSelected={onToggleSelected}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function GeneralSessionForm({ buildings, options }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Phiên điểm danh chung');
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? 0);
  const [radius, setRadius] = useState(100);
  const [openAt, setOpenAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 60_000)),
  );
  const [closeAt, setCloseAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 46 * 60_000)),
  );
  const [unitCodes, setUnitCodes] = useState<string[]>([]);
  const [studentCodes, setStudentCodes] = useState<string[]>([]);
  const [expandedUnitCodes, setExpandedUnitCodes] = useState<Set<string>>(
    () =>
      new Set(
        options.units
          .filter((unit) => unit.parentCode === null)
          .map((unit) => unit.code),
      ),
  );
  const [participantTab, setParticipantTab] = useState<'units' | 'students'>(
    'units',
  );
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const unitTree = useMemo(() => buildUnitTree(options.units), [options.units]);

  const selectedStudents = useMemo(() => {
    const units = new Map(options.units.map((unit) => [unit.code, unit]));
    const selectedUnits = new Set(unitCodes);
    const belongsToSelectedUnit = (unitCode: string) => {
      let current: string | null = unitCode;
      while (current) {
        if (selectedUnits.has(current)) return true;
        current = units.get(current)?.parentCode ?? null;
      }
      return false;
    };
    return options.students.filter(
      (student) =>
        studentCodes.includes(student.code) ||
        belongsToSelectedUnit(student.unitCode),
    );
  }, [options, studentCodes, unitCodes]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return query
      ? options.students.filter((student) =>
          `${student.code} ${student.fullname}`
            .toLocaleLowerCase('vi')
            .includes(query),
        )
      : options.students;
  }, [options.students, search]);

  function toggle(
    value: string,
    values: string[],
    setValues: (next: string[]) => void,
  ) {
    setValues(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  function selectBuilding(id: number) {
    setBuildingId(id);
    if (buildings.find((item) => item.id === id)?.code === 'GPS-TEST') {
      setRadius((current) => Math.max(current, 300));
    }
  }

  function toggleExpandedUnit(code: string) {
    setExpandedUnitCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (selectedStudents.length === 0) {
      setError('Hãy chọn ít nhất một Unit hoặc sinh viên.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await lmsApi.createGeneralSession({
        title,
        buildingId,
        radius,
        openAt: new Date(openAt).toISOString(),
        closeAt: new Date(closeAt).toISOString(),
        unitCodes,
        studentCodes,
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

  const building = buildings.find((item) => item.id === buildingId);
  return (
    <form
      className="general-session-workspace"
      onSubmit={(event) => void submit(event)}
    >
      <section className="form-panel">
        <header>
          <FiClock />
          <div>
            <h2>Thông tin phiên</h2>
            <span>Tạo phiên độc lập, không cần chọn lớp học phần.</span>
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
        <div className="location-summary field--full">
          <FiMapPin />
          <span>
            {building
              ? `${building.name} · ${radius} m`
              : 'Chưa có tòa nhà để chọn'}
          </span>
        </div>
      </section>

      <section className="participant-panel">
        <header>
          <FiUsers />
          <div>
            <h2>Người tham gia</h2>
            <span>Chọn một nguồn, có thể chuyển tab mà không mất lựa chọn.</span>
          </div>
          <b>{selectedStudents.length}</b>
        </header>
        <div className="participant-tabs" role="tablist" aria-label="Cách chọn người tham gia">
          <button
            type="button"
            role="tab"
            id="participant-tab-units"
            aria-selected={participantTab === 'units'}
            aria-controls="participant-panel-units"
            className={participantTab === 'units' ? 'active' : ''}
            onClick={() => setParticipantTab('units')}
          >
            Theo Unit <span>{unitCodes.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="participant-tab-students"
            aria-selected={participantTab === 'students'}
            aria-controls="participant-panel-students"
            className={participantTab === 'students' ? 'active' : ''}
            onClick={() => setParticipantTab('students')}
          >
            Theo mã sinh viên <span>{studentCodes.length}</span>
          </button>
        </div>
        {participantTab === 'units' ? (
          <fieldset
            role="tabpanel"
            id="participant-panel-units"
            aria-labelledby="participant-tab-units"
          >
            <legend>
              Danh sách Unit
              <small>Chọn Unit cha sẽ gồm toàn bộ Unit con bên dưới.</small>
            </legend>
            <ul className="choice-grid unit-tree">
              {unitTree.map((unit) => (
                <UnitTreeChoice
                  key={unit.code}
                  node={unit}
                  depth={0}
                  expandedCodes={expandedUnitCodes}
                  selectedCodes={unitCodes}
                  onToggleExpanded={toggleExpandedUnit}
                  onToggleSelected={(code) =>
                    toggle(code, unitCodes, setUnitCodes)
                  }
                />
              ))}
            </ul>
          </fieldset>
        ) : (
          <fieldset
            role="tabpanel"
            id="participant-panel-students"
            aria-labelledby="participant-tab-students"
          >
            <legend>Danh sách sinh viên</legend>
            <label className="student-search">
              <FiSearch />
              <input
                aria-label="Tìm mã số sinh viên"
                placeholder="Tìm mã số hoặc tên sinh viên"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="choice-grid">
              {visibleStudents.map((student) => (
                <label className="choice-row" key={student.code}>
                  <input
                    type="checkbox"
                    checked={studentCodes.includes(student.code)}
                    onChange={() =>
                      toggle(student.code, studentCodes, setStudentCodes)
                    }
                  />
                  <span>
                    <b>{student.code}</b>
                    <small>
                      {student.fullname} · {student.unitCode}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              setUnitCodes([]);
              setStudentCodes([]);
            }}
          >
            Xóa lựa chọn
          </button>
          <button
            className="button button--primary"
            disabled={submitting || !building || selectedStudents.length === 0}
          >
            {submitting
              ? 'Đang tạo phiên…'
              : `Tạo phiên cho ${selectedStudents.length} sinh viên`}
          </button>
        </div>
      </section>
    </form>
  );
}
