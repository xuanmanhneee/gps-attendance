import { useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdPeople } from 'react-icons/md';

import { useTranslation } from '../../hooks/useTranslation';
import type { UseTagAssignmentResult } from '../../hooks/useTagAssignment';
import type { UseTagsResult } from '../../hooks/useTags';
import { LOCALE_TAGS } from '../../i18n';
import { useLocale } from '../../hooks/useLocale';
import type { Tag } from '../../types/tag';
import { EmptyState, ErrorState, LoadingState } from '../ui/DataState';
import { PageHeading } from '../ui/PageHeading';
import { Panel, PanelHeader } from '../ui/Panel';
import { PrimaryButton } from '../ui/PrimaryButton';
import { TagDeleteDialog } from './TagDeleteDialog';
import { TagFormModal } from './TagFormModal';
import { TagUserAssignmentPanel } from './TagUserAssignmentPanel';
import { logTagError, resolveTagErrorKey } from './tag-errors';

type TagsPanelProps = {
  tagsState: UseTagsResult;
  assignmentState: UseTagAssignmentResult;
  onToastSuccess: (message: string) => void;
};

const formatCreatedAt = (iso: string, localeTag: string) => {
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) return iso;

  return parsed.toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TagsPanel = ({
  tagsState,
  assignmentState,
  onToastSuccess,
}: TagsPanelProps) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const {
    tags,
    isLoading,
    isRefreshing,
    error,
    refreshError,
    reload,
    refresh,
    createTag,
    deleteTag,
  } = tagsState;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => b.id - a.id),
    [tags],
  );
  const localeTag = LOCALE_TAGS[locale];

  const openCreate = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    if (isCreating) return;

    setIsCreateOpen(false);
    setCreateError(null);
  };

  const handleCreate = async (name: string) => {
    setIsCreating(true);
    setCreateError(null);

    try {
      await createTag(name);
      // POST thành công là thành công; lỗi refresh (nếu có) hiển thị riêng.
      onToastSuccess(t('tags.createSuccess'));
      setIsCreateOpen(false);
    } catch (submitError) {
      logTagError('create', submitError);
      setCreateError(t(resolveTagErrorKey(submitError, 'create')));
    } finally {
      setIsCreating(false);
    }
  };

  const openDelete = (tag: Tag) => {
    setDeleteError(null);
    setDeletingTag(tag);
  };

  const closeDelete = () => {
    if (isDeleting) return;

    setDeletingTag(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!deletingTag) return;

    const target = deletingTag;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTag(target.id);

      if (assignmentState.selectedTag?.id === target.id) assignmentState.close();

      setDeletingTag(null);
      onToastSuccess(t('tags.deleteSuccess'));
    } catch (removeError) {
      logTagError('delete', removeError);
      setDeleteError(t(resolveTagErrorKey(removeError, 'delete')));
    } finally {
      setIsDeleting(false);
    }
  };

  const refreshWarning = refreshError && (
    <Panel className="mb-4">
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      >
        <p className="text-[12px] font-bold text-danger">
          {t(resolveTagErrorKey(refreshError, 'refresh'))}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="rounded-lg border border-line bg-surface-subtle px-3 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
        >
          {isRefreshing ? t('common.loading') : t('tags.retry')}
        </button>
      </div>
    </Panel>
  );

  const listBody = isLoading ? (
    <LoadingState description={t('tags.loading')} />
  ) : error ? (
    <ErrorState
      title={t('common.errorTitle')}
      description={t(resolveTagErrorKey(error, 'list'))}
      onRetry={() => void reload()}
    />
  ) : sortedTags.length === 0 ? (
    <EmptyState description={t('tags.empty')} />
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('tags.name')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-left text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('tags.users')}
            </th>
            <th
              scope="col"
              className="bg-surface-subtle px-5 py-[13px] text-right text-[10px] font-extrabold tracking-[0.08em] text-muted-soft uppercase"
            >
              {t('sessions.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTags.map((tag) => {
            const isSelected = assignmentState.selectedTag?.id === tag.id;
            const assignedCount =
              isSelected && !assignmentState.isLoading
                ? `${assignmentState.assignedUserIds.length}`
                : '—';

            return (
              <tr key={tag.id} className="border-t border-line">
                <th
                  scope="row"
                  className="px-5 py-[15px] text-left align-middle text-[12px] font-bold text-ink"
                >
                  {tag.name}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted">
                    {formatCreatedAt(tag.createdAt, localeTag)}
                  </span>
                </th>
                <td className="px-5 py-[15px] align-middle text-[12px] text-muted">
                  {assignedCount}
                </td>
                <td className="px-5 py-[15px] text-right align-middle">
                  <span className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => assignmentState.openFor(tag)}
                      aria-label={`${t('tags.manageUsers')}: ${tag.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-[12px] font-bold text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft"
                    >
                      <MdPeople aria-hidden="true" className="text-[15px]" />
                      {t('tags.manageUsers')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(tag)}
                      aria-label={`${t('tags.delete')}: ${tag.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-[12px] font-bold text-danger transition-colors hover:border-danger/40 hover:bg-danger-soft"
                    >
                      <MdDelete aria-hidden="true" className="text-[15px]" />
                      {t('tags.delete')}
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHeading
        title={t('tags.title')}
        description={t('pages.tags.description')}
        action={
          <PrimaryButton
            label={t('tags.create')}
            icon={MdAdd}
            onClick={openCreate}
          />
        }
      />

      {refreshWarning}

      <Panel>
        <PanelHeader
          title={t('tags.title')}
          subtitle={t('pages.tags.description')}
        />
        {listBody}
      </Panel>

      {isCreateOpen && (
        <TagFormModal
          isSubmitting={isCreating}
          formError={createError}
          onClose={closeCreate}
          onSubmit={(name) => void handleCreate(name)}
        />
      )}

      {deletingTag && (
        <TagDeleteDialog
          tagName={deletingTag.name}
          isDeleting={isDeleting}
          error={deleteError}
          onClose={closeDelete}
          onConfirm={() => void handleDelete()}
        />
      )}

      {assignmentState.selectedTag && (
        <TagUserAssignmentPanel
          key={assignmentState.selectedTag.id}
          tag={assignmentState.selectedTag}
          assignedUserIds={assignmentState.assignedUserIds}
          directory={assignmentState.directory}
          directoryError={assignmentState.directoryError}
          isLoading={assignmentState.isLoading}
          error={assignmentState.error}
          pendingUserIds={assignmentState.pendingUserIds}
          onClose={assignmentState.close}
          onRetry={() => void assignmentState.reload()}
          onAssign={assignmentState.assign}
          onUnassign={assignmentState.unassign}
        />
      )}
    </>
  );
};

