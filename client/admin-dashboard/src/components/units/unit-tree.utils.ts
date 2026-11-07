import type { UnitTreeItemViewModel } from './unit.view-model';

export const collectDescendantIds = (
  node: UnitTreeItemViewModel,
  acc: Set<number> = new Set(),
): Set<number> => {
  for (const child of node.children) {
    acc.add(child.id);
    collectDescendantIds(child, acc);
  }
  return acc;
};

export const findNodeById = (
  nodes: UnitTreeItemViewModel[],
  id: number,
): UnitTreeItemViewModel | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
};

export const filterTree = (
  nodes: UnitTreeItemViewModel[],
  keyword: string,
): UnitTreeItemViewModel[] => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return nodes;

  const result: UnitTreeItemViewModel[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, keyword);
    if (
      node.label.toLowerCase().includes(normalized) ||
      filteredChildren.length > 0
    ) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
};
