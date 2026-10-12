import { IoClose } from 'react-icons/io5';

import { useTranslation } from '../hooks/useTranslation';

interface CreateSessionModalHeaderProps {
  onClose: () => void;
}

export const CreateSessionModalHeader = ({
  onClose,
}: CreateSessionModalHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-b border-line px-6 py-4">
      <div>
        <h2 className="text-lg font-bold text-ink">
          {t('sessions.form.heading')}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {t('sessions.form.description')}
        </p>
      </div>
      <button
        onClick={onClose}
        type="button"
        aria-label={t('sessions.form.close')}
        className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-subtle hover:text-ink"
      >
        <IoClose className="text-xl" />
      </button>
    </div>
  );
};
