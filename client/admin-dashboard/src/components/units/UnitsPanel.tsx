import { useMemo, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { toast } from 'react-toastify';

import { useTranslation } from '../../hooks/useTranslation';
import type { UseUnitsResult } from '../../hooks/useUnits';
import { DataState, EmptyState, ErrorState, LoadingState } from '../ui/DataState';
import { PageHeading } from '../ui/PageHeading';
import { Panel, PanelHeader } from '../ui/Panel';
import { PrimaryButton } from '../ui/PrimaryButton';
import { resolveUnitErrorKey } from './unit-errors';
import { UnitFormModal, type UnitFormValues } from './UnitFormModal';
import { UnitTreeNode } from './UnitTreeNode';
import { collectDescendantIds, filterTree, findNodeById } from './unit-tree.utils';
import type {
  UnitListItemViewModel,
  UnitTreeItemViewModel,
} from './unit.view-model';
import {
  mapUnitForestToViewModels,
  mapUnitsToListItems,
  MAX_UNIT_NAME_LENGTH,
} from './unit.view-model';

type UnitsPanelProps = {
  unitsState: UseUnitsResult;
};

const toLoadErrorMessage = (error: Error, fallback: string): string =>
  error.message && error.message !== 'Unable to load units'
    ? error.message
    : fallback;

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
  const [editingUnit, setEditingUnit] = useState<UnitListItemViewModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // JSX chỉ bind view model; mapper giữ component ổn định khi backend đổi shape.
  const unitItems = useMemo(() => mapUnitsToListItems(units), [units]);
  const treeItems = useMemo(() => mapUnitForestToViewModels(tree), [tree]);
  const filteredTree = useMemo(
    () => filterTree(treeItems, search),
    [treeItems, search],
  );

  const forbiddenParentIds = useMemo(() => {
    if (!editingUnit) return new Set<number>();
    const node = findNodeById(treeItems, editingUnit.id);
    const descendants = node ? collectDescendantIds(node) : new Set<number>();
    return new Set<number>([...descendants, editingUnit.id]);
  }, [editingUnit, treeItems]);

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

  const openEditFromTree = (node: UnitTreeItemViewModel) => {
    const full = unitItems.find((unit) => unit.id === node.id);
    setEditingUnit(
      full ?? { id: node.id, label: node.label, parentId: null, level: node.level },
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUnit(null);
    setFormError(null);
  };

  const resolveSubmitError = (submitError: unknown, isEdit: boolean): string => {
    // Map error code backend sang i18n; fallback message chuẩn, không nuốt lỗi.
    const errorKey = resolveUnitErrorKey(submitError);
    const detail = errorKey
      ? t(errorKey)
      : submitError instanceof Error && submitError.message
        ? submitError.message
        : t(isEdit ? 'units.updateError' : 'units.createError');

    return `${t(isEdit ? 'units.updateError' : 'units.createError')}: ${detail}`;
  };

  const handleSubmit = async (values: UnitFormValues) => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setFormError(t('units.nameRequired'));
      return;
    }
    if (trimmedName.length > MAX_UNIT_NAME_LENGTH) {
      setFormError(t('units.nameTooLong', { max: MAX_UNIT_NAME_LENGTH }));
      return;
    }
    // Tránh PUT/PATCH rỗng: khi không đổi field nào thì chỉ đóng form.
    if (
      editingUnit &&
      editingUnit.label === trimmedName &&
      editingUnit.parentId === values.parentId
    ) {
      setIsModalOpen(false);
      setEditingUnit(null);
      setFormError(null);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingUnit) {
        // Gửi đúng field thay đổi: tránh PATCH rỗng khi backend validate nghiêm.
        const payload =
          editingUnit.label === trimmedName
            ? { parentId: values.parentId }
            : editingUnit.parentId === values.parentId
              ? { name: trimmedName }
              : { name: trimmedName, parentId: values.parentId };
        await updateUnit(editingUnit.id, payload);
        toast.success(t('units.updateSuccess'));
      } else {
        await createUnit({ name: trimmedName, parentId: values.parentId });
        toast.success(t('units.createSuccess'));
      }
      setIsModalOpen(false);
      setEditingUnit(null);
    } catch (submitError) {
      setFormError(resolveSubmitError(submitError, Boolean(editingUnit)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const listErrorMessage = error ? toLoadErrorMessage(error, t('units.loadError')) : null;
  const showListWarning = Boolean(listErrorMessage) && !isLoading;

  return (
    <>
      <PageHeading
        title={t('units.title')}
        description={t('units.description')}
        action={
          <PrimaryButton label={t('units.create')} icon={MdAdd} onClick={openCreate} />
        }
      />
      {showListWarning && (
        <div className="mb-4">
          <Panel>
            <ErrorState
              title={t('common.errorTitle')}
              description={listErrorMessage!}
              onRetry={() => void reload()}
            />
          </Panel>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl">
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
          <div className="max-h-[560px] overflow-y-auto px-3 py-3">
            {isTreeLoading ? (
              <LoadingState />
            ) : treeError ? (
              <ErrorState
                description={toLoadErrorMessage(treeError, t('units.treeLoadError'))}
                onRetry={() => void reloadTree()}
              />
            ) : treeItems.length === 0 ? (
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
      </div>

      <UnitFormModal
        isOpen={isModalOpen}
        editingUnit={editingUnit}
        units={unitItems}
        forbiddenParentIds={forbiddenParentIds}
        isSubmitting={isSubmitting}
        formError={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
};
