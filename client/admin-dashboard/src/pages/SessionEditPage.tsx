import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  MdAccessTime,
  MdArrowBack,
  MdLock,
  MdOutlineTitle,
} from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import type {
  AttendanceSessionDetailResponse,
} from '@gps-attendance/shared';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { PageActionBarPortal } from '../components/layout/page-action-bar';
import { SessionLocationFields } from '../components/sessions/SessionLocationFields';
import { SessionLocationPickerModal } from '../components/sessions/SessionLocationPickerModal';
import {
  logSessionError,
  resolveSessionErrorKey,
} from '../components/sessions/session-errors';
import { LoadingState } from '../components/ui/DataState';
import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
} from '../components/ui/Panel';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useTranslation } from '../hooks/useTranslation';
import {
  buildSessionDetailPath,
  ROUTE_PATHS,
} from '../routes/paths';
import {
  isAttendanceSession,
  isAttendanceSessionDetail,
  parseSessionId,
} from '../types/attendance-session';
import {
  combineLocalDateTime,
  buildUpdateSessionRequest,
  createDefaultSessionFormValues,
  isCloseAfterOpen,
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  resolveGeolocationErrorKey,
  RADIUS_MIN,
  snapRadius,
  toLocalDateTimeInput,
  type SessionFormValues,
} from '../utils/attendance-sessions/session-form';
import { MessagePage } from './MessagePage';

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted-soft focus:border-accent-strong focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted';

const toFormValues = (
  session: AttendanceSessionDetailResponse,
): SessionFormValues => {
  const [openDate, openTime] = toLocalDateTimeInput(
    new Date(session.openAt),
  ).split('T');
  const [closeDate, closeTime] = toLocalDateTimeInput(
    new Date(session.closeAt),
  ).split('T');

  return {
    ...createDefaultSessionFormValues(),
    title: session.title,
    latitude: session.latitude,
    longitude: session.longitude,
    radius: session.radius,
    openDate: openDate ?? '',
    openTime: openTime ?? '',
    closeDate: closeDate ?? '',
    closeTime: closeTime ?? '',
  };
};

const SessionEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [session, setSession] =
    useState<AttendanceSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const {
    control,
    register,
    reset,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<SessionFormValues>({
    defaultValues: createDefaultSessionFormValues(),
  });

  const latitude = useWatch({ control, name: 'latitude' });
  const longitude = useWatch({ control, name: 'longitude' });
  const radius = useWatch({ control, name: 'radius' });

  const hasCoordinates =
    Number.isFinite(latitude) &&
    latitude >= LATITUDE_MIN &&
    latitude <= LATITUDE_MAX &&
    Number.isFinite(longitude) &&
    longitude >= LONGITUDE_MIN &&
    longitude <= LONGITUDE_MAX;
  const canOpenMap =
    hasCoordinates && Number.isFinite(radius) && radius >= RADIUS_MIN;

  useEffect(() => {
    const loadSession = async () => {
      const sessionId = parseSessionId(id);
      if (sessionId === null) {
        setLoadError(true);
        setIsLoading(false);
        return;
      }

      try {
        const fetched: unknown = await attendanceSessionsApi.getDetail(
          sessionId,
          true,
        );
        if (!isAttendanceSessionDetail(fetched)) {
          throw new Error('Unexpected attendance session detail response');
        }

        setSession(fetched);
        reset(toFormValues(fetched));
      } catch (error) {
        logSessionError('detail', error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, [id, reset]);

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('sessions.form.locationError'));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', Number(position.coords.latitude.toFixed(6)), {
          shouldDirty: true,
          shouldValidate: true,
        });
        setValue('longitude', Number(position.coords.longitude.toFixed(6)), {
          shouldDirty: true,
          shouldValidate: true,
        });
        setIsLocating(false);
        toast.success(t('sessions.form.locationSuccess'));
      },
      (error) => {
        setIsLocating(false);
        toast.error(t(resolveGeolocationErrorKey(error)));
      },
      { enableHighAccuracy: true },
    );
  }, [setValue, t]);

  const applyLocation = (next: {
    latitude: number;
    longitude: number;
    radius: number;
  }) => {
    setValue('latitude', next.latitude, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('longitude', next.longitude, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('radius', snapRadius(next.radius), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsMapOpen(false);
  };

  const handleFormSubmit = async (values: SessionFormValues) => {
    if (!session) return;

    const openAt =
      session.status === 'open'
        ? session.openAt
        : combineLocalDateTime(values.openDate, values.openTime);
    const closeAt = combineLocalDateTime(values.closeDate, values.closeTime);
    if (!isCloseAfterOpen(openAt, closeAt)) {
      setError('closeTime', {
        type: 'validate',
        message: t('sessions.form.timeRangeInvalid'),
      });
      return;
    }
    clearErrors('closeTime');

    const request = buildUpdateSessionRequest(
      values,
      dirtyFields,
      session.status,
    );

    if (Object.keys(request).length === 0) return;

    try {
      const updated: unknown = await attendanceSessionsApi.update(
        session.id,
        request,
      );
      if (!isAttendanceSession(updated)) {
        throw new Error('Unexpected attendance session response');
      }

      toast.success(t('sessions.updateSuccess'));
      navigate(buildSessionDetailPath(session.id));
    } catch (error) {
      logSessionError('update', error);
      toast.error(t(resolveSessionErrorKey(error, 'update')));
    }
  };

  const actionBar = (
    <PageActionBarPortal>
      <div className="flex w-full items-center">
        <button
          type="button"
          onClick={() =>
            session
              ? navigate(buildSessionDetailPath(session.id))
              : navigate(ROUTE_PATHS.attendanceSessions)
          }
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
        >
          <MdArrowBack aria-hidden="true" />
          {session
            ? t('sessions.edit.backToDetail')
            : t('sessionDetail.backToList')}
        </button>
      </div>
    </PageActionBarPortal>
  );

  if (isLoading) {
    return (
      <>
        {actionBar}
        <Panel>
          <LoadingState description={t('sessions.edit.loading')} />
        </Panel>
      </>
    );
  }

  if (loadError || !session) {
    return (
      <>
        {actionBar}
        <MessagePage
          variant="error"
          title={t('common.errorTitle')}
          description={t('sessionDetail.loadError')}
          actionLabel={t('sessionDetail.backToList')}
          onAction={() => navigate(ROUTE_PATHS.attendanceSessions)}
        />
      </>
    );
  }

  if (session.status === 'closed' || session.status === 'cancelled') {
    return (
      <>
        {actionBar}
        <MessagePage
          variant="error"
          title={t('sessions.edit.unavailableTitle')}
          description={t('sessions.error.updateInvalidStatus')}
          actionLabel={t('sessions.edit.backToDetail')}
          onAction={() => navigate(buildSessionDetailPath(session.id))}
        />
      </>
    );
  }

  const isOpen = session.status === 'open';

  return (
    <>
      {actionBar}

      <Panel className="flex h-full min-h-0 flex-col">
        <PanelHeader
          title={t('sessions.edit.heading')}
          subtitle={t('sessions.edit.description')}
          action={<StatusBadge status={session.status} />}
        />

        <PanelBody className="overflow-hidden">
          <form
            id="edit-session-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="h-full overflow-y-auto px-4 py-5 sm:px-6"
            noValidate
          >
            <div className="mx-auto w-full max-w-4xl space-y-5">
              {isOpen && (
                <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm text-ink">
                  <MdLock
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-warning"
                  />
                  <div>
                    <p className="font-bold">
                      {t('sessions.edit.openLockedTitle')}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {t('sessions.edit.openLockedDescription')}
                    </p>
                  </div>
                </div>
              )}

              <section className="rounded-xl border border-line bg-surface-subtle p-4 sm:p-5">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <MdOutlineTitle
                    aria-hidden="true"
                    className="text-accent-strong"
                  />
                  {t('sessions.form.title')}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  disabled={isOpen}
                  aria-invalid={Boolean(errors.title)}
                  {...register('title', {
                    required: t('sessions.form.titleRequired'),
                  })}
                  className={INPUT_CLASS}
                />
                {errors.title && (
                  <p role="alert" className="mt-1.5 text-xs text-danger">
                    {errors.title.message}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-line bg-surface-subtle p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-strong">
                    <MdAccessTime aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">
                      {t('sessions.form.timeSection')}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {t('sessions.edit.timeHelp')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-medium text-muted">
                    {t('sessions.form.openDate')}
                    <input
                      type="date"
                      disabled={isOpen}
                      {...register('openDate', { required: true })}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    {t('sessions.form.openClock')}
                    <input
                      type="time"
                      disabled={isOpen}
                      {...register('openTime', { required: true })}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    {t('sessions.form.closeDate')}
                    <input
                      type="date"
                      {...register('closeDate', { required: true })}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    {t('sessions.form.closeClock')}
                    <input
                      type="time"
                      aria-invalid={Boolean(errors.closeTime)}
                      {...register('closeTime', { required: true })}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  </label>
                </div>
                {errors.closeTime && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {errors.closeTime.message}
                  </p>
                )}
              </section>

              {!isOpen && (
                <SessionLocationFields
                  latitude={latitude}
                  longitude={longitude}
                  isLocating={isLocating}
                  register={register}
                  errors={errors}
                  onUseCurrentLocation={locateCurrentPosition}
                  onOpenMap={() => {
                    if (!canOpenMap) {
                      toast.error(t('sessions.form.mapNeedsCoordinates'));
                      return;
                    }
                    setIsMapOpen(true);
                  }}
                  disableOpenMap={!canOpenMap}
                />
              )}

              <p className="flex gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-5 text-muted">
                <MdLock
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-accent-strong"
                />
                {t('sessions.edit.participantsUnchanged')}
              </p>
            </div>
          </form>
        </PanelBody>

        <PanelFooter className="bg-surface">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(buildSessionDetailPath(session.id))}
              className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface px-5 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              {t('sessions.form.cancel')}
            </button>
            <button
              type="submit"
              form="edit-session-form"
              disabled={!isDirty || isSubmitting}
              className="inline-flex min-h-10 items-center rounded-lg bg-accent-strong px-5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? t('sessions.edit.submitting')
                : t('sessions.edit.submit')}
            </button>
          </div>
        </PanelFooter>
      </Panel>

      {isMapOpen && canOpenMap && (
        <SessionLocationPickerModal
          initialLatitude={latitude}
          initialLongitude={longitude}
          initialRadius={radius}
          onCancel={() => setIsMapOpen(false)}
          onConfirm={applyLocation}
        />
      )}
    </>
  );
};

export default SessionEditPage;
