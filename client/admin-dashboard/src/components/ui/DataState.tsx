import { MdErrorOutline, MdInbox, MdOutlineInfo } from 'react-icons/md';

import { useTranslation } from '../../hooks/useTranslation';

type DataStateVariant = 'loading' | 'empty' | 'error' | 'unavailable';

type DataStateProps = {
  variant: DataStateVariant;
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

const variantToneClass: Record<DataStateVariant, string> = {
  loading: 'bg-accent-soft text-accent-strong',
  empty: 'bg-surface-subtle text-muted',
  error: 'bg-danger-soft text-danger',
  unavailable: 'bg-warning-soft text-warning',
};

const variantIcons = {
  empty: MdInbox,
  error: MdErrorOutline,
  unavailable: MdOutlineInfo,
} as const;

/**
 * Khối biểu diễn trạng thái dữ liệu dùng chung.
 *
 * Các page/hook phải phân biệt rõ loading, empty, error và unavailable thay vì
 * hiển thị dữ liệu fallback trông như thành công.
 */
export const DataState = ({
  variant,
  title,
  description,
  onRetry,
  retryLabel,
}: DataStateProps) => {
  const Icon = variant === 'loading' ? null : variantIcons[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-center gap-2.5 px-5 py-9 text-center"
    >
      <span
        aria-hidden="true"
        className={`grid h-9 w-9 place-items-center rounded-lg ${variantToneClass[variant]}`}
      >
        {Icon ? (
          <Icon className="text-[18px]" />
        ) : (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
      </span>

      <p className="text-[13px] font-bold text-ink">{title}</p>

      {description && (
        <p className="max-w-md text-[11px] leading-relaxed text-muted">
          {description}
        </p>
      )}

      {onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-line bg-surface-subtle px-3 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};

export const LoadingState = ({ description }: { description?: string }) => {
  const { t } = useTranslation();

  return (
    <DataState variant="loading" title={t('common.loading')} description={description} />
  );
};

export const EmptyState = ({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) => {
  const { t } = useTranslation();

  return (
    <DataState
      variant="empty"
      title={title ?? t('common.emptyTitle')}
      description={description}
    />
  );
};

export const ErrorState = ({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <DataState
      variant="error"
      title={title ?? t('common.errorTitle')}
      description={description}
      onRetry={onRetry}
      retryLabel={onRetry ? t('common.retry') : undefined}
    />
  );
};

/** Chỉ số chưa có API trong dashboard — không được thay bằng số liệu ước lượng. */
export const UnavailableState = ({
  description,
}: {
  description?: string;
}) => {
  const { t } = useTranslation();

  return (
    <DataState
      variant="unavailable"
      title={t('common.dataUnavailable')}
      description={description ?? t('common.dataUnavailableHint')}
    />
  );
};