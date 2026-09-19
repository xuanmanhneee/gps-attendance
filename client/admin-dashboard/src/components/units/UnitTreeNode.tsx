import type { UnitTreeResponse } from '@gps-attendance/shared';
import { MdChevronRight, MdEdit, MdExpandMore } from 'react-icons/md';

type UnitTreeNodeProps = {
  node: UnitTreeResponse;
  depth: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (unit: UnitTreeResponse) => void;
  expandLabel: string;
  collapseLabel: string;
  editLabel: (name: string) => string;
  childrenLabel: string;
  levelLabel: (level: number) => string;
};

export const UnitTreeNode = ({
  node,
  depth,
  expandedIds,
  onToggle,
  onEdit,
  expandLabel,
  collapseLabel,
  editLabel,
  childrenLabel,
  levelLabel,
}: UnitTreeNodeProps) => {
  const isExpanded = expandedIds.has(node.id) || depth === 0;
  const hasChildren = node.children.length > 0;
  const ChevronIcon = isExpanded ? MdExpandMore : MdChevronRight;

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-subtle"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? collapseLabel : expandLabel}
            aria-expanded={isExpanded}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent-strong hover:text-accent-strong"
          >
            <ChevronIcon aria-hidden="true" className="text-[16px]" />
          </button>
        ) : (
          <span aria-hidden="true" className="h-6 w-6 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink">{node.name}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {levelLabel(node.level)}
            {hasChildren && ` · ${node.children.length} ${childrenLabel}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEdit(node)}
          aria-label={editLabel(node.name)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-muted transition-colors hover:border-accent-strong/40 hover:bg-accent-soft hover:text-accent-strong"
        >
          <MdEdit aria-hidden="true" className="text-[15px]" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <ul className="m-0 list-none p-0">
          {node.children.map((child) => (
            <UnitTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
              editLabel={editLabel}
              childrenLabel={childrenLabel}
              levelLabel={levelLabel}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
