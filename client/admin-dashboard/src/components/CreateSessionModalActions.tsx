import { useTranslation } from '../hooks/useTranslation';

interface CreateSessionModalActionsProps {
  isSubmitting: boolean;
  onClose: () => void;
}

export const CreateSessionModalActions = ({
  isSubmitting,
  onClose,
}: CreateSessionModalActionsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-ink transition-colors hover:bg-surface-subtle"
      >
        {t('sessions.form.cancel')}
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="cursor-pointer rounded-lg bg-accent-strong px-5 py-2 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-strong/90 disabled:opacity-50"
      >
        {isSubmitting
          ? t('sessions.form.submitting')
          : t('sessions.form.submit')}
      </button>
    </div>
  );
};
