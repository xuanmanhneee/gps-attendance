import type { UnitTreeResponse } from '@gps-attendance/shared';

export const collectDescendantIds = (
  node: UnitTreeResponse,
  acc: Set<number> = new Set(),
): Set<number> => {
  for (const child of node.children) {
    acc.add(child.id);
    collectDescendantIds(child, acc);
  }
  return acc;
};

export const findNodeById = (
  nodes: UnitTreeResponse[],
  id: number,
): UnitTreeResponse | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
};

export const filterTree = (
  nodes: UnitTreeResponse[],
  keyword: string,
): UnitTreeResponse[] => {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return nodes;

  const result: UnitTreeResponse[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, keyword);
    if (
      node.name.toLowerCase().includes(normalized) ||
      filteredChildren.length > 0
    ) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
};
