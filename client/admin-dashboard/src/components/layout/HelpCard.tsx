import { useTranslation } from '../../hooks/useTranslation';

/**
 * Thẻ trợ giúp trong sidebar — lấy từ prototype `help-card`.
 *
 * Đây là nội dung tĩnh, read-only và tách khỏi menu theo role nên không ảnh
 * hưởng điều hướng hay quyền truy cập.
 */
export const HelpCard = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-1.5 mb-4 hidden rounded-[10px] border border-line bg-surface-subtle p-[13px] md:block">
      <strong className="mb-[3px] block text-[12px] font-bold text-ink">
        {t('help.title')}
      </strong>

      <p className="mb-2.5 text-[11px] leading-[1.45] text-muted">
        {t('help.body')}
      </p>

      <span className="text-[11px] font-bold text-accent-strong">
        {t('help.action')}
      </span>
    </div>
  );
};
