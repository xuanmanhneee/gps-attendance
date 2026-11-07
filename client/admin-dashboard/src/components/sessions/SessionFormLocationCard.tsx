import { MdLocationOn, MdMap, MdMyLocation } from 'react-icons/md';

import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  latitude: number;
  longitude: number;
  radius: number;
  isLocating: boolean;
  onUseCurrentLocation: () => void;
  onOpenMap: () => void;
  /** Ẩn nút "Chọn trên bản đồ" nếu chưa có toạ độ ban đầu. */
  disableOpenMap?: boolean;
};

export const SessionFormLocationCard = ({
  latitude,
  longitude,
  radius,
  isLocating,
  onUseCurrentLocation,
  onOpenMap,
  disableOpenMap = false,
}: Props) => {
  const { t } = useTranslation();

  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <div className="rounded-xl border border-line bg-surface-subtle p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <MdLocationOn className="text-accent-strong text-sm" aria-hidden="true" />
        <span className="text-sm font-semibold text-ink">
          {t('sessions.form.locationSection')}{' '}
          <span className="text-danger">*</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <span className="block text-[11px] text-muted">
            {t('sessions.form.latitude')}
          </span>
          <span className="block text-[13px] font-bold tabular-nums text-ink">
            {hasCoords ? latitude.toFixed(6) : '—'}
          </span>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <span className="block text-[11px] text-muted">
            {t('sessions.form.longitude')}
          </span>
          <span className="block text-[13px] font-bold tabular-nums text-ink">
            {hasCoords ? longitude.toFixed(6) : '—'}
          </span>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2">
          <span className="block text-[11px] text-muted">
            {t('sessions.form.radius')}
          </span>
          <span className="block text-[13px] font-bold tabular-nums text-ink">
            {Number.isFinite(radius) ? `${radius} m` : '—'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-lg border border-accent-strong bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent-strong transition-colors hover:bg-accent-strong hover:text-white disabled:opacity-50"
        >
          <MdMyLocation aria-hidden="true" />
          {isLocating
            ? t('sessions.form.locating')
            : t('sessions.form.useCurrentLocation')}
        </button>
        <button
          type="button"
          onClick={onOpenMap}
          disabled={disableOpenMap}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
        >
          <MdMap aria-hidden="true" />
          {t('sessions.form.openMap')}
        </button>
      </div>
    </div>
  );
};