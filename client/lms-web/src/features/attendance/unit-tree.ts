import type { LmsUnit } from '../../types';

export type LmsUnitTreeNode = LmsUnit & { children: LmsUnitTreeNode[] };

export function buildUnitTree(units: LmsUnit[]): LmsUnitTreeNode[] {
  const nodes = new Map<string, LmsUnitTreeNode>(
    units.map((unit) => [unit.code, { ...unit, children: [] }]),
  );
  const roots: LmsUnitTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentCode ? nodes.get(node.parentCode) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
