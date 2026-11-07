import { useRef } from 'react';
import { IoClose } from 'react-icons/io5';

import { useTranslation } from '../../hooks/useTranslation';
import { Dialog } from '../ui/Dialog';

type TagDeleteDialogProps = {
  tagName: string;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Xác nhận xoá tag. Focus mặc định vào nút Huỷ để tránh xoá nhầm bằng Enter,
 * Escape/backdrop bị chặn trong lúc đang gọi DELETE.
 */
export const TagDeleteDialog = ({
  tagName,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: TagDeleteDialogProps) => {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      ariaLabel={t('tags.deleteTitle')}
      canClose={!isDeleting}
      onClose={onClose}
      initialFocusRef={cancelRef}
      panelClassName="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-ink">
          {t('tags.deleteTitle')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label={t('tags.cancel')}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
        >
          <IoClose aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4">
        <p
          id="tag-delete-confirm"
          className="text-[13px] leading-relaxed text-ink"
        >
          {t('tags.deleteConfirm', { name: tagName })}
        </p>

        {error && (
          <p role="alert" className="text-[12px] font-bold text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-line bg-surface-subtle px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
          >
            {t('tags.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-describedby="tag-delete-confirm"
            className="rounded-lg border border-danger bg-danger px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
          >
            {isDeleting ? t('tags.deleting') : t('tags.confirmDelete')}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
