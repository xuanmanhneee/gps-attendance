import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import {
  MdBlock,
  MdCheck,
  MdChevronRight,
  MdClose,
  MdSearch,
} from 'react-icons/md';
import type { TagResponse, UnitTreeResponse } from '@gps-attendance/shared';

import { tagsApi } from '../../api/tags.api';
import { unitsApi } from '../../api/units.api';
import type { SessionFormValues } from '../../utils/attendance-sessions/session-form';

/* ---------- Types (giữ nguyên export cũ) ---------- */

export type CriteriaPayload = {
  unitInclude: number[];
  unitExclude: number[];
  tagInclude: number[];
  tagExclude: number[];
  codeInclude: string[];
  codeExclude: string[];
};

export type CriteriaPreview = {
  count: number;
  sample: { code: string; fullname: string }[];
};

type Props = {
  control: Control<SessionFormValues>;
  setValue: UseFormSetValue<SessionFormValues>;
  /** Tuỳ chọn: gọi API đếm số người phù hợp. Không truyền thì ẩn khối xem trước. */
  onPreview?: (criteria: CriteriaPayload) => Promise<CriteriaPreview>;
};

type Mode = 'none' | 'include' | 'exclude';
type IdField = 'unitInclude' | 'unitExclude' | 'tagInclude' | 'tagExclude';
type TabKey = 'units' | 'tags' | 'codes';

/* ---------- Text (gom một chỗ để sau này chuyển sang i18n) ---------- */

const TEXT = {
  tabs: { units: 'Đơn vị', tags: 'Tag', codes: 'Mã sinh viên' } as Record<
    TabKey,
    string
  >,
  include: 'Bao gồm',
  exclude: 'Loại trừ',
  inheritedInclude: 'Kế thừa: bao gồm',
  inheritedExclude: 'Kế thừa: loại trừ',
  selectedBelow: 'đã chọn',
  quickToggleHint: 'Bấm tên để bao gồm nhanh',
  summary: 'Tóm tắt',
  clearAll: 'Xoá tất cả',
  none: 'Chưa có',
  emptySummary:
    'Chưa có điều kiện. Chọn đơn vị, tag hoặc nhập mã sinh viên ở bên trái.',
  unitsHint:
    'Bấm tên để bao gồm nhanh, bao gồm một đơn vị là bao gồm cả đơn vị con. Dùng "Loại trừ" để bỏ một đơn vị hoặc nhánh con.',
  tagsHint: 'Bấm tên để bao gồm nhanh, hoặc chọn "Loại trừ" để bỏ tag đó.',
  codesHint:
    'Nhập nhiều mã, phân tách bằng dấu phẩy, khoảng trắng hoặc xuống dòng. Mã trùng sẽ được gộp lại.',
  searchUnits: 'Tìm đơn vị...',
  searchTags: 'Tìm tag...',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
  loading: 'Đang tải dữ liệu...',
  loadError: 'Không thể tải danh sách đơn vị hoặc tag.',
  retry: 'Thử lại',
  noUnits: 'Không tìm thấy đơn vị.',
  noTags: 'Chưa có tag nào.',
  noTagsMatch: 'Không tìm thấy tag.',
  codesIncludeLabel: 'Bao gồm mã',
  codesExcludeLabel: 'Loại trừ mã',
  codesIncludePlaceholder: 'VD: SV001, SV002\nSV003',
  codesExcludePlaceholder: 'VD: SV010\nSV011',
  codesUnit: 'mã',
  previewTitle: 'Số người tham gia',
  previewIdle: 'Thêm điều kiện để xem số người tham gia.',
  previewCalculating: 'Đang tính...',
  previewUpdating: 'đang cập nhật...',
  previewError: 'Không thể tính số người phù hợp.',
  previewEmpty: 'Không có ai phù hợp. Kiểm tra lại điều kiện.',
  previewSuffix: 'người phù hợp',
  showSample: 'Xem danh sách mẫu',
  hideSample: 'Ẩn danh sách',
} as const;

const UNIT_PREFIX = 'Đơn vị';
const TAG_PREFIX = 'Tag';

/* ---------- Style tokens ---------- */

const INCLUDE_TINT =
  'bg-[color-mix(in_srgb,var(--color-accent-strong)_10%,transparent)]';
const EXCLUDE_TINT =
  'bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)]';

const TOGGLE_BASE =
  'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';
const INCLUDE_ACTIVE =
  'border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white';
const INCLUDE_IDLE =
  'border-line bg-surface text-muted hover:border-[var(--color-accent-strong)] hover:text-accent-strong';
const EXCLUDE_ACTIVE =
  'border-[var(--color-danger)] bg-[var(--color-danger)] text-white';
const EXCLUDE_IDLE =
  'border-line bg-surface text-muted hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]';

const SEARCH_INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft';
const TEXTAREA_CLASS =
  'w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft';
const LINK_BUTTON_CLASS =
  'text-xs font-medium text-muted transition-colors hover:text-ink';

const EMPTY_IDS: number[] = [];
const TAG_SEARCH_THRESHOLD = 6;

/* ---------- Helpers ---------- */

const splitCodes = (text: string): string[] =>
  text
    .split(/[,;\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

const parseCodes = (text: string): string[] => [...new Set(splitCodes(text))];

const flattenUnits = (
  units: UnitTreeResponse[],
  map = new Map<number, string>(),
): Map<number, string> => {
  units.forEach((unit) => {
    map.set(unit.id, unit.name);
    flattenUnits(unit.children, map);
  });
  return map;
};

/** child id -> parent id (node gốc không có entry). */
const buildParentMap = (
  units: UnitTreeResponse[],
  parentId?: number,
  map = new Map<number, number>(),
): Map<number, number> => {
  units.forEach((unit) => {
    if (parentId !== undefined) map.set(unit.id, parentId);
    buildParentMap(unit.children, unit.id, map);
  });
  return map;
};

/** Id của mọi đơn vị có con (dùng cho "Mở rộng tất cả"). */
const collectBranchIds = (
  units: UnitTreeResponse[],
  ids = new Set<number>(),
): Set<number> => {
  units.forEach((unit) => {
    if (unit.children.length > 0) {
      ids.add(unit.id);
      collectBranchIds(unit.children, ids);
    }
  });
  return ids;
};

/** Số đơn vị con cháu đang được chọn trực tiếp (bao gồm hoặc loại trừ). */
const countSelectedBelow = (
  unit: UnitTreeResponse,
  include: Set<number>,
  exclude: Set<number>,
): number =>
  unit.children.reduce(
    (sum, child) =>
      sum +
      (include.has(child.id) || exclude.has(child.id) ? 1 : 0) +
      countSelectedBelow(child, include, exclude),
    0,
  );

const filterTree = (
  units: UnitTreeResponse[],
  query: string,
): UnitTreeResponse[] => {
  const q = query.trim().toLocaleLowerCase('vi');
  if (!q) return units;

  return units.reduce<UnitTreeResponse[]>((result, unit) => {
    const children = filterTree(unit.children, q);
    if (unit.name.toLocaleLowerCase('vi').includes(q) || children.length > 0) {
      result.push({ ...unit, children });
    }
    return result;
  }, []);
};

/* ---------- Mode toggle (Bao gồm / Loại trừ) ---------- */

function ModeToggle({
  value,
  onChange,
  disabled,
  name,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
  name: string;
}) {
  // Bấm lại nút đang bật để bỏ chọn
  const toggle = (target: 'include' | 'exclude') =>
    onChange(value === target ? 'none' : target);

  return (
    <div role="group" aria-label={name} className="inline-flex shrink-0 gap-1">
      <button
        type="button"
        aria-pressed={value === 'include'}
        aria-label={`${TEXT.include}: ${name}`}
        title={TEXT.include}
        disabled={disabled}
        onClick={() => toggle('include')}
        className={`${TOGGLE_BASE} ${
          value === 'include' ? INCLUDE_ACTIVE : INCLUDE_IDLE
        }`}
      >
        <MdCheck aria-hidden="true" className="text-[14px]" />
        <span className="hidden sm:inline">{TEXT.include}</span>
      </button>
      <button
        type="button"
        aria-pressed={value === 'exclude'}
        aria-label={`${TEXT.exclude}: ${name}`}
        title={TEXT.exclude}
        disabled={disabled}
        onClick={() => toggle('exclude')}
        className={`${TOGGLE_BASE} ${
          value === 'exclude' ? EXCLUDE_ACTIVE : EXCLUDE_IDLE
        }`}
      >
        <MdBlock aria-hidden="true" className="text-[14px]" />
        <span className="hidden sm:inline">{TEXT.exclude}</span>
      </button>
    </div>
  );
}

/* ---------- Picker row (dùng chung cho đơn vị và tag) ---------- */

function PickerRow({
  name,
  mode,
  effective,
  note,
  disabled,
  leading,
  meta,
  onChange,
}: {
  name: string;
  /** Trạng thái chọn trực tiếp trên dòng này */
  mode: Mode;
  /** Trạng thái hiệu lực (đã tính kế thừa từ đơn vị cha) */
  effective: Mode;
  note?: string;
  disabled?: boolean;
  leading?: ReactNode;
  meta?: ReactNode;
  onChange: (mode: Mode) => void;
}) {
  const tint =
    effective === 'exclude'
      ? EXCLUDE_TINT
      : effective === 'include'
        ? INCLUDE_TINT
        : 'hover:bg-surface-subtle';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${tint}`}
    >
      {leading}
      <button
        type="button"
        disabled={disabled}
        title={TEXT.quickToggleHint}
        onClick={() => onChange(mode === 'include' ? 'none' : 'include')}
        className={`min-w-0 flex-1 truncate text-left text-sm text-ink disabled:cursor-default ${
          effective === 'exclude' ? 'line-through opacity-60' : ''
        }`}
      >
        {name}
      </button>
      {note && (
        <span className="hidden shrink-0 text-xs text-muted sm:inline">
          {note}
        </span>
      )}
      {meta}
      <ModeToggle
        name={name}
        value={mode}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

/* ---------- Chip ---------- */

function Chip({
  label,
  tone,
  onRemove,
}: {
  label: string;
  tone: 'include' | 'exclude';
  onRemove: () => void;
}) {
  const toneClass =
    tone === 'include'
      ? `border-[var(--color-accent-strong)] ${INCLUDE_TINT} text-ink`
      : `border-[var(--color-danger)] ${EXCLUDE_TINT} text-[var(--color-danger)]`;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs ${toneClass}`}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Xoá ${label}`}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
      >
        <MdClose aria-hidden="true" className="text-[12px]" />
      </button>
    </span>
  );
}

/* ---------- Unit tree ---------- */

type Selection = { include: Set<number>; exclude: Set<number> };

type UnitNodeProps = {
  unit: UnitTreeResponse;
  selection: Selection;
  inheritedInclude: boolean;
  inheritedExclude: boolean;
  expandedIds: Set<number>;
  searchActive: boolean;
  onToggleExpand: (id: number) => void;
  onChangeMode: (id: number, mode: Mode) => void;
};

function UnitTreeNode({
  unit,
  selection,
  inheritedInclude,
  inheritedExclude,
  expandedIds,
  searchActive,
  onToggleExpand,
  onChangeMode,
}: UnitNodeProps) {
  const directMode: Mode = selection.exclude.has(unit.id)
    ? 'exclude'
    : selection.include.has(unit.id)
      ? 'include'
      : 'none';

  const isExcluded = inheritedExclude || directMode === 'exclude';
  const isIncluded =
    !isExcluded && (inheritedInclude || directMode === 'include');
  const effective: Mode = isExcluded
    ? 'exclude'
    : isIncluded
      ? 'include'
      : 'none';

  const inheritedOnly = directMode === 'none' && effective !== 'none';
  const hasChildren = unit.children.length > 0;
  const expanded = searchActive || expandedIds.has(unit.id);

  const hiddenSelected =
    hasChildren && !expanded
      ? countSelectedBelow(unit, selection.include, selection.exclude)
      : 0;

  return (
    <div>
      <PickerRow
        name={unit.name}
        mode={directMode}
        effective={effective}
        disabled={inheritedExclude}
        note={
          inheritedOnly
            ? isExcluded
              ? TEXT.inheritedExclude
              : TEXT.inheritedInclude
            : undefined
        }
        onChange={(mode) => onChangeMode(unit.id, mode)}
        leading={
          <button
            type="button"
            disabled={!hasChildren}
            onClick={() => onToggleExpand(unit.id)}
            aria-expanded={hasChildren ? expanded : undefined}
            aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'}: ${unit.name}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:text-ink disabled:invisible"
          >
            <MdChevronRight
              aria-hidden="true"
              className={`text-[18px] transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        }
        meta={
          hiddenSelected > 0 ? (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
              {hiddenSelected} {TEXT.selectedBelow}
            </span>
          ) : undefined
        }
      />

      {hasChildren && expanded && (
        <div className="ml-5 border-l border-line pl-2">
          {unit.children.map((child) => (
            <UnitTreeNode
              key={child.id}
              unit={child}
              selection={selection}
              inheritedInclude={isIncluded}
              inheritedExclude={isExcluded}
              expandedIds={expandedIds}
              searchActive={searchActive}
              onToggleExpand={onToggleExpand}
              onChangeMode={onChangeMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Search box ---------- */

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <MdSearch
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-muted"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={SEARCH_INPUT_CLASS}
      />
    </div>
  );
}

/* ---------- Main component ---------- */

export function ParticipantCriteriaEditor({
  control,
  setValue,
  onPreview,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('units');

  const [units, setUnits] = useState<UnitTreeResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [unitSearch, setUnitSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [preview, setPreview] = useState<CriteriaPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const unitInclude = useWatch({ control, name: 'unitInclude' }) ?? EMPTY_IDS;
  const unitExclude = useWatch({ control, name: 'unitExclude' }) ?? EMPTY_IDS;
  const tagInclude = useWatch({ control, name: 'tagInclude' }) ?? EMPTY_IDS;
  const tagExclude = useWatch({ control, name: 'tagExclude' }) ?? EMPTY_IDS;
  const codeIncludeText = useWatch({ control, name: 'codeIncludeText' }) ?? '';
  const codeExcludeText = useWatch({ control, name: 'codeExcludeText' }) ?? '';

  const codeInclude = useMemo(
    () => parseCodes(codeIncludeText),
    [codeIncludeText],
  );
  const codeExclude = useMemo(
    () => parseCodes(codeExcludeText),
    [codeExcludeText],
  );
  const duplicateIncludeCount = useMemo(
    () => splitCodes(codeIncludeText).length - codeInclude.length,
    [codeIncludeText, codeInclude],
  );
  const duplicateExcludeCount = useMemo(
    () => splitCodes(codeExcludeText).length - codeExclude.length,
    [codeExcludeText, codeExclude],
  );
  const conflictCodes = useMemo(
    () => codeInclude.filter((code) => codeExclude.includes(code)),
    [codeInclude, codeExclude],
  );

  const selection = useMemo<Selection>(
    () => ({ include: new Set(unitInclude), exclude: new Set(unitExclude) }),
    [unitInclude, unitExclude],
  );

  /* Load options */
  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setLoading(true);
      setLoadError(false);

      try {
        const [unitData, tagData] = await Promise.all([
          unitsApi.getTree(),
          tagsApi.getAll(),
        ]);
        if (!active) return;
        setUnits(unitData);
        setTags(tagData);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOptions();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const unitNames = useMemo(() => flattenUnits(units), [units]);
  const parentMap = useMemo(() => buildParentMap(units), [units]);
  const branchIds = useMemo(() => collectBranchIds(units), [units]);
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );
  const filteredUnits = useMemo(
    () => filterTree(units, unitSearch),
    [units, unitSearch],
  );
  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLocaleLowerCase('vi');
    return q
      ? tags.filter((tag) => tag.name.toLocaleLowerCase('vi').includes(q))
      : tags;
  }, [tags, tagSearch]);

  /*
   * Tự mở các đơn vị cha của những đơn vị MỚI xuất hiện trong lựa chọn
   * (vd: trang Sửa nạp sẵn criteria) để người dùng thấy ngay mục đã chọn.
   * Chỉ mở thêm, không bao giờ tự thu gọn.
   */
  const prevSelectedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (units.length === 0) return;

    const current = new Set([...unitInclude, ...unitExclude]);
    const added = [...current].filter((id) => !prevSelectedRef.current.has(id));
    prevSelectedRef.current = current;
    if (added.length === 0) return;

    setExpandedIds((previous) => {
      const next = new Set(previous);
      added.forEach((id) => {
        let parent = parentMap.get(id);
        while (parent !== undefined) {
          next.add(parent);
          parent = parentMap.get(parent);
        }
      });
      return next;
    });
  }, [units, parentMap, unitInclude, unitExclude]);

  /* Live preview (debounce 400ms) */
  const criteriaKey = JSON.stringify({
    unitInclude,
    unitExclude,
    tagInclude,
    tagExclude,
    codeInclude,
    codeExclude,
  });

  const hasAnyCriteria =
    unitInclude.length > 0 ||
    tagInclude.length > 0 ||
    codeInclude.length > 0 ||
    unitExclude.length > 0 ||
    tagExclude.length > 0 ||
    codeExclude.length > 0;

  useEffect(() => {
    if (!onPreview) return;

    if (!hasAnyCriteria) {
      setPreview(null);
      setPreviewError(false);
      return;
    }

    let active = true;
    setPreviewLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const result = await onPreview(
          JSON.parse(criteriaKey) as CriteriaPayload,
        );
        if (!active) return;
        setPreview(result);
        setPreviewError(false);
      } catch {
        if (active) setPreviewError(true);
      } finally {
        if (active) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaKey, onPreview, hasAnyCriteria]);

  /* Mutations */
  const setIds = (field: IdField, ids: number[]) =>
    setValue(field, ids, { shouldDirty: true, shouldValidate: true });

  const applyMode = (
    includeField: IdField,
    excludeField: IdField,
    includeIds: number[],
    excludeIds: number[],
    id: number,
    mode: Mode,
  ) => {
    const nextInclude = includeIds.filter((value) => value !== id);
    const nextExclude = excludeIds.filter((value) => value !== id);

    if (mode === 'include') nextInclude.push(id);
    if (mode === 'exclude') nextExclude.push(id);

    setIds(includeField, nextInclude);
    setIds(excludeField, nextExclude);
  };

  const changeUnitMode = (id: number, mode: Mode) =>
    applyMode('unitInclude', 'unitExclude', unitInclude, unitExclude, id, mode);

  const changeTagMode = (id: number, mode: Mode) =>
    applyMode('tagInclude', 'tagExclude', tagInclude, tagExclude, id, mode);

  const removeCode = (
    field: 'codeIncludeText' | 'codeExcludeText',
    codes: string[],
    code: string,
  ) =>
    setValue(field, codes.filter((value) => value !== code).join(', '), {
      shouldDirty: true,
      shouldValidate: true,
    });

  const toggleExpand = (id: number) =>
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearAll = () => {
    setIds('unitInclude', []);
    setIds('unitExclude', []);
    setIds('tagInclude', []);
    setIds('tagExclude', []);
    setValue('codeIncludeText', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('codeExcludeText', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const tagMode = (id: number): Mode =>
    tagExclude.includes(id)
      ? 'exclude'
      : tagInclude.includes(id)
        ? 'include'
        : 'none';

  /* Summary chips */
  const includeChips = [
    ...unitInclude.map((id) => ({
      key: `u-${id}`,
      label: `${UNIT_PREFIX}: ${unitNames.get(id) ?? `#${id}`}`,
      remove: () => changeUnitMode(id, 'none'),
    })),
    ...tagInclude.map((id) => ({
      key: `t-${id}`,
      label: `${TAG_PREFIX}: ${tagNames.get(id) ?? `#${id}`}`,
      remove: () => changeTagMode(id, 'none'),
    })),
    ...codeInclude.map((code) => ({
      key: `c-${code}`,
      label: code,
      remove: () => removeCode('codeIncludeText', codeInclude, code),
    })),
  ];

  const excludeChips = [
    ...unitExclude.map((id) => ({
      key: `u-${id}`,
      label: `${UNIT_PREFIX}: ${unitNames.get(id) ?? `#${id}`}`,
      remove: () => changeUnitMode(id, 'none'),
    })),
    ...tagExclude.map((id) => ({
      key: `t-${id}`,
      label: `${TAG_PREFIX}: ${tagNames.get(id) ?? `#${id}`}`,
      remove: () => changeTagMode(id, 'none'),
    })),
    ...codeExclude.map((code) => ({
      key: `c-${code}`,
      label: code,
      remove: () => removeCode('codeExcludeText', codeExclude, code),
    })),
  ];

  const tabCounts: Record<TabKey, number> = {
    units: unitInclude.length + unitExclude.length,
    tags: tagInclude.length + tagExclude.length,
    codes: codeInclude.length + codeExclude.length,
  };

  const previewIsEmpty = preview !== null && preview.count === 0;
  const unitSearchActive = unitSearch.trim().length > 0;

  /* ---------- Render helpers ---------- */

  const renderLoadState = (): ReactNode => {
    if (loading) {
      return <p className="text-sm text-muted">{TEXT.loading}</p>;
    }
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        <span className="text-danger">{TEXT.loadError}</span>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
        >
          {TEXT.retry}
        </button>
      </div>
    );
  };

  const renderUnitsPanel = (): ReactNode => (
    <>
      <p className="text-xs text-muted">{TEXT.unitsHint}</p>

      <SearchBox
        value={unitSearch}
        onChange={setUnitSearch}
        placeholder={TEXT.searchUnits}
      />

      {loading || loadError ? (
        renderLoadState()
      ) : (
        <>
          {!unitSearchActive && branchIds.size > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExpandedIds(new Set(branchIds))}
                className={LINK_BUTTON_CLASS}
              >
                {TEXT.expandAll}
              </button>
              <button
                type="button"
                onClick={() => setExpandedIds(new Set())}
                className={LINK_BUTTON_CLASS}
              >
                {TEXT.collapseAll}
              </button>
            </div>
          )}

          {filteredUnits.length === 0 ? (
            <p className="text-sm text-muted">{TEXT.noUnits}</p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto pr-1">
              {filteredUnits.map((unit) => (
                <UnitTreeNode
                  key={unit.id}
                  unit={unit}
                  selection={selection}
                  inheritedInclude={false}
                  inheritedExclude={false}
                  expandedIds={expandedIds}
                  searchActive={unitSearchActive}
                  onToggleExpand={toggleExpand}
                  onChangeMode={changeUnitMode}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  const renderTagsPanel = (): ReactNode => (
    <>
      <p className="text-xs text-muted">{TEXT.tagsHint}</p>

      {tags.length > TAG_SEARCH_THRESHOLD && (
        <SearchBox
          value={tagSearch}
          onChange={setTagSearch}
          placeholder={TEXT.searchTags}
        />
      )}

      {loading || loadError ? (
        renderLoadState()
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted">{TEXT.noTags}</p>
      ) : filteredTags.length === 0 ? (
        <p className="text-sm text-muted">{TEXT.noTagsMatch}</p>
      ) : (
        <div className="max-h-[28rem] space-y-0.5 overflow-y-auto pr-1">
          {filteredTags.map((tag) => {
            const mode = tagMode(tag.id);
            return (
              <PickerRow
                key={tag.id}
                name={tag.name}
                mode={mode}
                effective={mode}
                onChange={(next) => changeTagMode(tag.id, next)}
              />
            );
          })}
        </div>
      )}
    </>
  );

  const renderCodesPanel = (): ReactNode => (
    <>
      <p className="text-xs text-muted">{TEXT.codesHint}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-ink">
            {TEXT.codesIncludeLabel}
            {codeInclude.length > 0 && (
              <span className="text-xs font-normal text-muted">
                {codeInclude.length} {TEXT.codesUnit}
              </span>
            )}
            {duplicateIncludeCount > 0 && (
              <span className="text-xs font-normal text-muted">
                · gộp {duplicateIncludeCount} trùng
              </span>
            )}
          </span>
          <textarea
            rows={6}
            value={codeIncludeText}
            onChange={(event) =>
              setValue('codeIncludeText', event.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder={TEXT.codesIncludePlaceholder}
            className={TEXTAREA_CLASS}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-ink">
            {TEXT.codesExcludeLabel}
            {codeExclude.length > 0 && (
              <span className="text-xs font-normal text-muted">
                {codeExclude.length} {TEXT.codesUnit}
              </span>
            )}
            {duplicateExcludeCount > 0 && (
              <span className="text-xs font-normal text-muted">
                · gộp {duplicateExcludeCount} trùng
              </span>
            )}
          </span>
          <textarea
            rows={6}
            value={codeExcludeText}
            onChange={(event) =>
              setValue('codeExcludeText', event.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder={TEXT.codesExcludePlaceholder}
            className={TEXTAREA_CLASS}
          />
        </label>
      </div>

      {conflictCodes.length > 0 && (
        <p role="alert" className="text-xs text-danger">
          Mã {conflictCodes.join(', ')} đang nằm ở cả Bao gồm và Loại trừ. Những
          mã này sẽ bị loại.
        </p>
      )}
    </>
  );

  const renderPreview = (): ReactNode => {
    if (!onPreview) return null;

    return (
      <div
        aria-live="polite"
        className="space-y-2 rounded-lg border border-line bg-surface-subtle p-3"
      >
        <p className="text-xs font-medium text-muted">{TEXT.previewTitle}</p>

        {!hasAnyCriteria ? (
          <p className="text-sm text-muted">{TEXT.previewIdle}</p>
        ) : previewError ? (
          <p className="text-sm text-danger">{TEXT.previewError}</p>
        ) : preview === null ? (
          <p className="text-sm text-muted">{TEXT.previewCalculating}</p>
        ) : previewIsEmpty ? (
          <p className="text-sm text-danger">{TEXT.previewEmpty}</p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-2 text-ink">
              <span className="text-3xl font-bold leading-none">
                {preview.count}
              </span>
              <span className="text-sm">{TEXT.previewSuffix}</span>
              {previewLoading && (
                <span className="text-xs text-muted">
                  {TEXT.previewUpdating}
                </span>
              )}
            </p>

            {preview.sample.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSample((value) => !value)}
                  aria-expanded={showSample}
                  className={LINK_BUTTON_CLASS}
                >
                  {showSample ? TEXT.hideSample : TEXT.showSample}
                </button>

                {showSample && (
                  <ul className="max-h-48 divide-y divide-line overflow-y-auto text-sm">
                    {preview.sample.map((person) => (
                      <li
                        key={person.code}
                        className="flex justify-between gap-3 py-1.5"
                      >
                        <span className="min-w-0 truncate text-ink">
                          {person.fullname}
                        </span>
                        <span className="shrink-0 text-muted">
                          {person.code}
                        </span>
                      </li>
                    ))}
                    {preview.count > preview.sample.length && (
                      <li className="py-1.5 text-xs text-muted">
                        và {preview.count - preview.sample.length} người khác
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderChipGroup = (
    label: string,
    tone: 'include' | 'exclude',
    chips: { key: string; label: string; remove: () => void }[],
  ): ReactNode => (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-ink">
        {label}
        {chips.length > 0 && (
          <span className="ml-1.5 font-normal text-muted">{chips.length}</span>
        )}
      </p>
      {chips.length === 0 ? (
        <p className="text-xs text-muted">{TEXT.none}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Chip
              key={chip.key}
              label={chip.label}
              tone={tone}
              onRemove={chip.remove}
            />
          ))}
        </div>
      )}
    </div>
  );

  /* ---------- Render ---------- */

  const tabKeys: TabKey[] = ['units', 'tags', 'codes'];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {/* Bên trái: chọn điều kiện */}
      <div className="min-w-0 self-start rounded-xl border border-line bg-surface">
        <div
          role="tablist"
          aria-label="Nguồn điều kiện"
          className="flex border-b border-line"
        >
          {tabKeys.map((key) => {
            const selected = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`criteria-tab-${key}`}
                aria-selected={selected}
                aria-controls={`criteria-panel-${key}`}
                onClick={() => setActiveTab(key)}
                className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-[var(--color-accent-strong)] text-accent-strong'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {TEXT.tabs[key]}
                {tabCounts[key] > 0 && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold leading-none text-accent-strong">
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`criteria-panel-${activeTab}`}
          aria-labelledby={`criteria-tab-${activeTab}`}
          className="space-y-3 p-4"
        >
          {activeTab === 'units' && renderUnitsPanel()}
          {activeTab === 'tags' && renderTagsPanel()}
          {activeTab === 'codes' && renderCodesPanel()}
        </div>
      </div>

      {/* Bên phải: tóm tắt + xem trước, luôn nhìn thấy khi cuộn */}
      <aside
        aria-label={TEXT.summary}
        className="space-y-4 self-start rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-0"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{TEXT.summary}</h3>
          {hasAnyCriteria && (
            <button
              type="button"
              onClick={clearAll}
              className={LINK_BUTTON_CLASS}
            >
              {TEXT.clearAll}
            </button>
          )}
        </div>

        {renderPreview()}

        {!hasAnyCriteria ? (
          <p className="text-sm text-muted">{TEXT.emptySummary}</p>
        ) : (
          <div className="space-y-3">
            {renderChipGroup(TEXT.include, 'include', includeChips)}
            {renderChipGroup(TEXT.exclude, 'exclude', excludeChips)}
          </div>
        )}

        {conflictCodes.length > 0 && (
          <p role="alert" className="text-xs text-danger">
            Mã {conflictCodes.join(', ')} đang nằm ở cả Bao gồm và Loại trừ.
            Những mã này sẽ bị loại.
          </p>
        )}
      </aside>
    </div>
  );
}
