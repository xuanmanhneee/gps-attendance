import { useRef, useState } from 'react';
import { IoClose } from 'react-icons/io5';

import { useTranslation } from '../../hooks/useTranslation';
import { MAX_TAG_NAME_LENGTH, validateTagName } from '../../types/tag';
import { Dialog } from '../ui/Dialog';

type TagFormModalProps = {
  isSubmitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

/**
 * Modal tạo tag. Chỉ được render khi modal đang mở (TagsPanel điều kiện hoá),
 * nhờ vậy form luôn bắt đầu ở state sạch mà không cần reset bằng effect.
 */
export const TagFormModal = ({
  isSubmitting,
  formError,
  onClose,
  onSubmit,
}: TagFormModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedLength = name.trim().length;
  const errorMessage = validationError ?? formError;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const result = validateTagName(name);

    if (result.ok === false) {
      setValidationError(
        result.error === 'tags.nameRequired'
          ? t('tags.nameRequired')
          : t('tags.nameTooLong', { max: MAX_TAG_NAME_LENGTH }),
      );
      return;
    }

    setValidationError(null);
    onSubmit(result.value);
  };

  return (
    <Dialog
      ariaLabel={t('tags.create')}
      canClose={!isSubmitting}
      onClose={onClose}
      initialFocusRef={inputRef}
      panelClassName="max-w-md"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-ink">
          {t('tags.create')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={t('tags.cancel')}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
        >
          <IoClose aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
        <label
          htmlFor="tag-name-input"
          className="flex flex-col gap-1.5 text-[12px] font-bold text-ink"
        >
          {t('tags.name')}
          <input
            id="tag-name-input"
            ref={inputRef}
            type="text"
            value={name}
            maxLength={MAX_TAG_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('tags.namePlaceholder')}
            disabled={isSubmitting}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={
              errorMessage
                ? 'tag-name-error tag-name-meta'
                : 'tag-name-meta'
            }
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-normal text-ink outline-none transition focus:border-accent-strong disabled:opacity-60"
          />
        </label>

        {errorMessage && (
          <p
            id="tag-name-error"
            role="alert"
            className="text-[12px] font-bold text-danger"
          >
            {errorMessage}
          </p>
        )}

        <p id="tag-name-meta" className="text-[11px] text-muted">
          {t('tags.nameLength', {
            current: trimmedLength,
            max: MAX_TAG_NAME_LENGTH,
          })}
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-line bg-surface-subtle px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
          >
            {t('tags.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || trimmedLength === 0}
            className="rounded-lg border border-accent-strong bg-accent-strong px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? t('tags.creating') : t('tags.create')}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
