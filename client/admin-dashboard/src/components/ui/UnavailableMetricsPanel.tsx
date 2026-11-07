import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translation-keys';

type UnavailableMetricsPanelProps = {
  itemLabelKeys: readonly TranslationKey[];
};

/**
 * Liệt kê các chỉ số dashboard chưa có API.
 *
 * Cố ý hiển thị dấu gạch kèm giải thích thay vì số liệu mock, để người dùng
 * không nhầm dữ liệu ước lượng là dữ liệu thật từ backend.
 */
export const UnavailableMetricsPanel = ({
  itemLabelKeys,
}: UnavailableMetricsPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="px-5 py-[14px]">
      <ul className="divide-y divide-line">
        {itemLabelKeys.map((labelKey) => (
          <li
            key={labelKey}
            className="flex items-center justify-between gap-3 py-3"
          >
            <span className="text-[12px] font-semibold text-ink">
              {t(labelKey)}
            </span>

            <span aria-hidden="true" className="text-[12px] text-muted-soft">
              —
            </span>

            <span className="sr-only">{t('common.dataUnavailable')}</span>
          </li>
        ))}
      </ul>

      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        {t('common.dataUnavailableHint')}
      </p>
    </div>
  );
};