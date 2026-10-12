import type {
  UnitResponse,
  UnitTreeResponse,
} from '@gps-attendance/shared';

/**
 * View model UI ổn định cho Units.
 *
 * Backend nhắc response có thể còn thay đổi, nên JSX chỉ phụ thuộc vào các
 * model này. Khi backend đổi tên field/shape, chỉ sửa mapper dưới đây.
 */
export type UnitListItemViewModel = {
  id: number;
  label: string;
  parentId: number | null;
  level: number;
};

export type UnitTreeItemViewModel = {
  id: number;
  label: string;
  level: number;
  children: UnitTreeItemViewModel[];
};

export const MAX_UNIT_NAME_LENGTH = 150;

/** Pure mapper: không mutate response, giữ `id` để gọi update/chọn parent. */
export const mapUnitToListItem = (
  unit: UnitResponse,
): UnitListItemViewModel => ({
  id: unit.id,
  label: unit.name,
  parentId: unit.parentId,
  level: unit.level,
});

export const mapUnitsToListItems = (
  units: UnitResponse[],
): UnitListItemViewModel[] => units.map(mapUnitToListItem);

/** Pure mapper cho cây; không suy diễn `parentId` từ `level`. */
export const mapUnitTreeToViewModel = (
  node: UnitTreeResponse,
): UnitTreeItemViewModel => ({
  id: node.id,
  label: node.name,
  level: node.level,
  children: node.children.map(mapUnitTreeToViewModel),
});

export const mapUnitForestToViewModels = (
  tree: UnitTreeResponse[],
): UnitTreeItemViewModel[] => tree.map(mapUnitTreeToViewModel);
