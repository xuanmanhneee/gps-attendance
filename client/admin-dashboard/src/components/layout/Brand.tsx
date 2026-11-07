import { useTranslation } from '../../hooks/useTranslation';
import { LogoMark } from './LogoMark';

interface BrandProps {
  isCollapsed?: boolean;
}

export const Brand = ({ isCollapsed = false }: BrandProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-center gap-[11px] pb-6 ${
        isCollapsed ? '' : 'md:justify-start md:px-2.5'
      }`}
    >
      <span
        aria-hidden="true"
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-ink text-canvas"
      >
        <LogoMark className="h-[25px] w-[25px]" />
      </span>

      <span
        className={`font-display hidden text-[16px] font-extrabold tracking-[-0.04em] text-ink ${
          isCollapsed ? '' : 'md:inline'
        }`}
      >
        {t('app.brandPrimary')}{' '}
        <span className="text-accent-strong">{t('app.brandSecondary')}</span>
      </span>
    </div>
  );
};
