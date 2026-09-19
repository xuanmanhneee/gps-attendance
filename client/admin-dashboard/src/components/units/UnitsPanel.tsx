import { useMemo, useState } from 'react';
import { MdAdd, MdEdit } from 'react-icons/md';
import { toast } from 'react-toastify';

import type { UnitResponse, UnitTreeResponse } from '@gps-attendance/shared';

import { useTranslation } from '../../hooks/useTranslation';
import type { UseUnitsResult } from '../../hooks/useUnits';
import { DataState, EmptyState, ErrorState, LoadingState } from '../ui/DataState';
import { PageHeading } from '../ui/PageHeading';
import { Panel, PanelHeader } from '../ui/Panel';
import { PrimaryButton } from '../ui/PrimaryButton';
import { UnitFormModal, type UnitFormValues } from './UnitFormModal';
import { UnitTreeNode } from './UnitTreeNode';
import { collectDescendantIds, filterTree, findNodeById } from './unit-tree.utils';

type UnitsPanelProps = {
  unitsState: UseUnitsResult;
};

const toFormErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Unknown error';

export const UnitsPanel = ({ unitsState }: UnitsPanelProps) => {
  const { t } = useTranslation();
  const {
    units,
    tree,
    isLoading,
    isTreeLoading,
    error,
    treeError,
    reload,
    reloadTree,
    createUnit,
    updateUnit,
  } = unitsState;

  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);

  const forbiddenParentIds = useMemo(() => {
    if (!editingUnit) return new Set<number>();
    const node = findNodeById(tree, editingUnit.id);
    const descendants = node ? collectDescendantIds(node) : new Set<number>();
    return new Set<number>([...descendants, editingUnit.id]);
  }, [editingUnit, tree]);

  const toggleNode = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingUnit(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditFromTree = (node: UnitTreeResponse) => {
    const full = units.find((unit) => unit.id === node.id);
    setEditingUnit(
      full ?? { id: node.id, name: node.name, parentId: null, level: node.level },
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditFromList = (unit: UnitResponse) => {
    setEditingUnit(unit);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUnit(null);
    setFormError(null);
  };

  const handleSubmit = async (values: UnitFormValues) => {
    const name = values.name.trim();
    if (!name) {
      setFormError(t('units.nameRequired'));
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, { name, parentId: values.parentId });
        toast.success(t('units.updateSuccess'));
      } else {
        await createUnit({ name, parentId: values.parentId });
        toast.success(t('units.createSuccess'));
      }
      setIsModalOpen(false);
      setEditingUnit(null);
    } catch (submitError) {
      setFormError(
        `${editingUnit ? t('units.updateError') : t('units.createError')}: ${toFormErrorMessage(submitError)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    void reload();
    void reloadTree();
  };

  return (
    <>
      <PageHeading
        title={t('units.title')}
        description={t('units.description')}
        action={
          <PrimaryButton label={t('units.create')} icon={MdAdd} onClick={openCreate} />
        }
      />
      {(error ?? treeError) && !isLoading && !isTreeLoading && (
        <div className="mb-4">
          <Panel>
            <ErrorState
              title={t('common.errorTitle')}
              description={error?.message ?? treeError?.message ?? t('units.loadError')}
              onRetry={handleRetry}
            />
          </Panel>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t('units.treeTitle')} subtitle={t('units.treeSubtitle')} />
          <div className="border-b border-line px-5 py-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('units.searchPlaceholder')}
              aria-label={t('units.searchPlaceholder')}
              className="w-full rounded-lg border border-line bg-surface-subtle px-3 py-2 text-[12px] text-ink outline-none transition focus:border-accent-strong"
            />
          </div>
          <div className="max-h-[480px] overflow-y-auto px-3 py-3">
            {isTreeLoading ? (
              <LoadingState />
            ) : treeError ? (
              <ErrorState
                description={treeError.message ?? t('units.treeLoadError')}
                onRetry={() => void reloadTree()}
              />
            ) : tree.length === 0 ? (
              <EmptyState description={t('units.treeEmpty')} />
            ) : filteredTree.length === 0 ? (
              <DataState
                variant="empty"
                title={t('common.emptyTitle')}
                description={t('units.searchEmpty')}
              />
            ) : (
              <ul className="m-0 list-none p-0">
                {filteredTree.map((node) => (
                  <UnitTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    expandedIds={expandedIds}
                    onToggle={toggleNode}
                    onEdit={openEditFromTree}
                    expandLabel={t('units.expand')}
                    collapseLabel={t('units.collapse')}
                    editLabel={(name) => t('units.editUnit', { name })}
                    childrenLabel={t('units.children')}
                    levelLabel={(level) => t('units.level', { level })}
                  />
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t('units.listTitle')} subtitle={t('units.listSubtitle')} />
          <div className="max-h-[536px] overflow-y-auto">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                description={error.message ?? t('units.loadError')}
                onRetry={() => void reload()}
              />
            ) : units.length === 0 ? (
              <EmptyState description={t('units.empty')} />
            ) : (
              <ul className="m-0 list-none divide-y divide-line p-0">
                {units.map((unit) => (
                  <li key={unit.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink">{unit.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {t('units.level', { level: unit.level })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditFromList(unit)}
                      aria-label={t('units.editUnit', { name: unit.name })}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-muted transition-colors hover:border-accent-strong/40 hover:bg-accent-soft hover:text-accent-strong"
                    >
                      <MdEdit aria-hidden="true" className="text-[15px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <UnitFormModal
        isOpen={isModalOpen}
        editingUnit={editingUnit}
        units={units}
        forbiddenParentIds={forbiddenParentIds}
        isSubmitting={isSubmitting}
        formError={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
};
