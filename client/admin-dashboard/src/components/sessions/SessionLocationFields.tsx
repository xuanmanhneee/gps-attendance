import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import {
  MdCheckCircle,
  MdLocationOn,
  MdMap,
  MdMyLocation,
} from 'react-icons/md';

import { useTranslation } from '../../hooks/useTranslation';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  RADIUS_MIN,
  type SessionFormValues,
} from '../../utils/attendance-sessions/session-form';

type Props = {
  latitude: number;
  longitude: number;
  isLocating: boolean;
  register: UseFormRegister<SessionFormValues>;
  errors: FieldErrors<SessionFormValues>;
  onUseCurrentLocation: () => void;
  onOpenMap: () => void;
  disableOpenMap?: boolean;
};

const INPUT_CLASS =
  'mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold tabular-nums text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft';

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="mt-1.5 text-xs text-danger">
      {message}
    </p>
  ) : null;

export const SessionLocationFields = ({
  latitude,
  longitude,
  isLocating,
  register,
  errors,
  onUseCurrentLocation,
  onOpenMap,
  disableOpenMap = false,
}: Props) => {
  const { t } = useTranslation();
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <section className="rounded-xl border border-line bg-surface-subtle p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <MdLocationOn aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">
              {t('sessions.form.locationSection')}{' '}
              <span className="text-danger">*</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {t('sessions.form.locationHelp')}
            </p>
          </div>
        </div>

        {hasCoords && (
          <span className="inline-flex items-center gap-1 rounded-full bg-positive-soft px-2.5 py-1 text-[11px] font-bold text-positive">
            <MdCheckCircle aria-hidden="true" />
            {t('sessions.form.locationReady')}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-muted">
          {t('sessions.form.latitude')}
          <input
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="21.028511"
            aria-invalid={Boolean(errors.latitude)}
            {...register('latitude', {
              valueAsNumber: true,
              validate: (value) =>
                Number.isFinite(value) || t('sessions.form.latitudeRequired'),
              min: {
                value: LATITUDE_MIN,
                message: t('sessions.form.latitudeInvalid'),
              },
              max: {
                value: LATITUDE_MAX,
                message: t('sessions.form.latitudeInvalid'),
              },
            })}
            className={INPUT_CLASS}
          />
          <FieldError message={errors.latitude?.message} />
        </label>

        <label className="text-xs font-medium text-muted">
          {t('sessions.form.longitude')}
          <input
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="105.804817"
            aria-invalid={Boolean(errors.longitude)}
            {...register('longitude', {
              valueAsNumber: true,
              validate: (value) =>
                Number.isFinite(value) || t('sessions.form.longitudeRequired'),
              min: {
                value: LONGITUDE_MIN,
                message: t('sessions.form.longitudeInvalid'),
              },
              max: {
                value: LONGITUDE_MAX,
                message: t('sessions.form.longitudeInvalid'),
              },
            })}
            className={INPUT_CLASS}
          />
          <FieldError message={errors.longitude?.message} />
        </label>

        <label className="text-xs font-medium text-muted sm:col-span-2 lg:col-span-1">
          {t('sessions.form.radius')}
          <div className="relative">
            <input
              type="number"
              min={RADIUS_MIN}
              step={10}
              inputMode="numeric"
              aria-invalid={Boolean(errors.radius)}
              {...register('radius', {
                valueAsNumber: true,
                validate: (value) =>
                  Number.isFinite(value) || t('sessions.form.radiusRequired'),
                min: {
                  value: RADIUS_MIN,
                  message: t('sessions.form.radiusInvalid'),
                },
              })}
              className={`${INPUT_CLASS} pr-10`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-muted">
              m
            </span>
          </div>
          <FieldError message={errors.radius?.message} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent-strong bg-accent-soft px-3 text-xs font-bold text-accent-strong transition-colors hover:bg-accent-strong hover:text-white disabled:cursor-wait disabled:opacity-50"
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
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MdMap aria-hidden="true" />
          {t('sessions.form.openMap')}
        </button>
      </div>
    </section>
  );
};
