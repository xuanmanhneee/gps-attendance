import { useMemo, useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { useTranslation } from '../../hooks/useTranslation';
import type { DirectoryUser, Tag } from '../../types/tag';
import { parseUserIdInput } from '../../types/tag';
import { EmptyState, ErrorState, LoadingState } from '../ui/DataState';
import { Dialog } from '../ui/Dialog';
import { buildAssignedRows, buildAvailableUsers } from './tag-assignment.utils';
import { resolveTagErrorKey } from './tag-errors';

type TagUserAssignmentPanelProps = {
  tag: Tag;
  assignedUserIds: number[];
  directory: DirectoryUser[];
  directoryError: Error | null;
  isLoading: boolean;
  error: Error | null;
  pendingUserIds: ReadonlySet<number>;
  onClose: () => void;
  onRetry: () => void;
  onAssign: (userId: number) => Promise<void>;
  onUnassign: (userId: number) => Promise<void>;
};

/**
 * Panel quản lý user của một tag.
 *
 * Component chỉ được mount khi có tag đang chọn và được key theo `tag.id`, nên
 * state hiển thị luôn thuộc đúng tag đang mở (không giữ dữ liệu tag trước).
 */
export const TagUserAssignmentPanel = ({
  tag,
  assignedUserIds,
  directory,
  directoryError,
  isLoading,
  error,
  pendingUserIds,
  onClose,
  onRetry,
  onAssign,
  onUnassign,
}: TagUserAssignmentPanelProps) => {
  const { t } = useTranslation();
  const [userIdInput, setUserIdInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const directoryById = useMemo(() => {
    const map = new Map<number, DirectoryUser>();

    for (const user of directory) map.set(user.id, user);

    return map;
  }, [directory]);

  const assignedRows = useMemo(
    () =>
      buildAssignedRows(assignedUserIds, directoryById, (userId) =>
        t('tags.userIdFallback', { id: userId }),
      ),
    [assignedUserIds, directoryById, t],
  );

  const availableUsers = useMemo(
    () => buildAvailableUsers(directory, assignedUserIds),
    [directory, assignedUserIds],
  );

  /**
   * Single-flight được chọn có chủ đích (xem `canStartAssignmentMutation`):
   * khi còn một mutation assignment đang chạy, toàn bộ control assign/unassign
   * bị disable và Escape/backdrop không đóng panel, nên không thể double-submit
   * hoặc chạy hai request refresh chồng nhau.
   */
  const hasPendingMutation = pendingUserIds.size > 0;

  const runAssign = async (userId: number) => {
    setActionError(null);

    try {
      await onAssign(userId);
      setUserIdInput('');
      setInputError(null);
    } catch (assignError) {
      setActionError(t(resolveTagErrorKey(assignError, 'assignment')));
    }
  };

  const handleManualAssign = () => {
    const parsed = parseUserIdInput(userIdInput);

    if (parsed === null) {
      setInputError(t('tags.userIdInvalid'));
      return;
    }

    setInputError(null);
    void runAssign(parsed);
  };

  const handleUnassign = (userId: number) => {
    setActionError(null);

    void onUnassign(userId).catch((unassignError: unknown) => {
      setActionError(t(resolveTagErrorKey(unassignError, 'assignment')));
    });
  };

  const assignedSection =
    assignedRows.length === 0 ? (
      <EmptyState description={t('tags.usersEmpty')} />
    ) : (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {assignedRows.map((row) => {
          const isPending = pendingUserIds.has(row.userId);

          return (
            <li
              key={row.userId}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface-subtle px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">
                  {row.title}
                </p>
                <p className="text-[11px] text-muted">
                  {row.subtitle ?? t('tags.userIdFallback', { id: row.userId })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnassign(row.userId)}
                disabled={hasPendingMutation}
                aria-busy={isPending}
                aria-label={`${t('tags.unassignUser')}: ${row.title}`}
                className="rounded-lg border border-transparent px-3 py-1.5 text-[12px] font-bold text-danger transition-colors hover:border-danger/40 hover:bg-danger-soft disabled:opacity-50"
              >
                {isPending ? t('tags.deleting') : t('tags.unassignUser')}
              </button>
            </li>
          );
        })}
      </ul>
    );

  const availableSection = availableUsers.length > 0 && (
    <ul className="m-0 flex max-h-44 list-none flex-col gap-2 overflow-y-auto p-0">
      {availableUsers.map((user) => {
        const isPending = pendingUserIds.has(user.id);
        const userName = user.fullname || user.code;

        return (
          <li
            key={user.id}
            className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-ink">
                {userName}
              </p>
              <p className="text-[11px] text-muted">{user.code}</p>
            </div>
            <button
              type="button"
              onClick={() => void runAssign(user.id)}
              disabled={hasPendingMutation}
              aria-busy={isPending}
              aria-label={`${t('tags.assignUser')}: ${userName}`}
              className="rounded-lg border border-transparent px-3 py-1.5 text-[12px] font-bold text-accent-strong transition-colors hover:border-accent-strong/40 hover:bg-accent-soft disabled:opacity-50"
            >
              {isPending ? t('tags.creating') : t('tags.assignUser')}
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <Dialog
      ariaLabel={`${t('tags.manageUsers')}: ${tag.name}`}
      canClose={!hasPendingMutation}
      onClose={onClose}
      initialFocusRef={inputRef}
      panelClassName="flex max-h-[85vh] max-w-lg flex-col"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink">
            {t('tags.manageUsers')}: {tag.name}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted">{t('tags.users')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={hasPendingMutation}
          aria-label={t('tags.closePanel')}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
        >
          <IoClose aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <LoadingState description={t('tags.loading')} />
        ) : error ? (
          <ErrorState
            title={t('common.errorTitle')}
            description={t(resolveTagErrorKey(error, 'assignment'))}
            onRetry={onRetry}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <section aria-label={t('tags.users')}>{assignedSection}</section>

            <section
              aria-label={t('tags.assignUser')}
              className="flex flex-col gap-2"
            >
              <label
                htmlFor="tag-assign-input"
                className="text-[12px] font-bold text-ink"
              >
                {t('tags.userIdLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id="tag-assign-input"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={userIdInput}
                  onChange={(event) => setUserIdInput(event.target.value)}
                  placeholder={t('tags.userIdPlaceholder')}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? 'tag-assign-error' : undefined}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent-strong"
                />
                <button
                  type="button"
                  onClick={handleManualAssign}
                  disabled={
                    hasPendingMutation || userIdInput.trim().length === 0
                  }
                  className="rounded-lg border border-accent-strong bg-accent-strong px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
                >
                  {t('tags.assignUser')}
                </button>
              </div>
              {inputError && (
                <p
                  id="tag-assign-error"
                  role="alert"
                  className="text-[12px] font-bold text-danger"
                >
                  {inputError}
                </p>
              )}
              {directoryError && (
                <p className="text-[11px] text-muted">
                  {t(resolveTagErrorKey(directoryError, 'directory'))}
                </p>
              )}
              {availableSection}
            </section>

            {actionError && (
              <p role="alert" className="text-[12px] font-bold text-danger">
                {actionError}
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
