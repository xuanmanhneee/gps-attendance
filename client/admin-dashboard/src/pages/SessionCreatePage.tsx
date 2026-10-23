import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import {
  MdAccessTime,
  MdArrowBack,
  MdArrowForward,
  MdOutlineTitle,
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { SessionFormLocationCard } from '../components/sessions/SessionFormLocationCard';
import { SessionLocationPickerModal } from '../components/sessions/SessionLocationPickerModal';
import { ParticipantCriteriaEditor } from '../components/sessions/ParticipantCriteriaEditor';

import {
  SessionStepIndicator,
  type SessionStep,
} from '../components/sessions/SessionStepIndicator';
import {
  logSessionError,
  resolveSessionErrorKey,
} from '../components/sessions/session-errors';
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel';
import { useTranslation } from '../hooks/useTranslation';
import { ROUTE_PATHS } from '../routes/paths';
import { isAttendanceSession } from '../types/attendance-session';
import {
  buildCreateSessionRequest,
  combineLocalDateTime,
  createDefaultSessionFormValues,
  isCloseAfterOpen,
  resolveGeolocationErrorKey,
  snapRadius,
  type SessionFormValues,
} from '../utils/attendance-sessions/session-form';

const DETAILS_STEP_INDEX = 0;
const PARTICIPANTS_STEP_INDEX = 1;

const DETAILS_STEP_FIELDS: FieldPath<SessionFormValues>[] = [
  'title',
  'latitude',
  'longitude',
  'radius',
  'openDate',
  'openTime',
  'closeDate',
  'closeTime',
];

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-muted-soft focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent-soft';

const SessionCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(DETAILS_STEP_INDEX);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const hasRequestedLocationRef = useRef(false);

  const {
    control,
    register,
    getValues,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    defaultValues: createDefaultSessionFormValues(),
  });

  const latitude = useWatch({ control, name: 'latitude' });
  const longitude = useWatch({ control, name: 'longitude' });
  const radius = useWatch({ control, name: 'radius' });

  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const locateCurrentPosition = useCallback(
    (notifySuccess: boolean) => {
      if (!navigator.geolocation) {
        setIsLocating(false);
        toast.error(t('sessions.form.locationError'));
        return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('latitude', Number(position.coords.latitude.toFixed(6)));
          setValue('longitude', Number(position.coords.longitude.toFixed(6)));
          setIsLocating(false);
          if (notifySuccess) toast.success(t('sessions.form.locationSuccess'));
        },
        (error) => {
          setIsLocating(false);
          toast.error(t(resolveGeolocationErrorKey(error)));
        },
        { enableHighAccuracy: true },
      );
    },
    [setValue, t],
  );

  useEffect(() => {
    if (hasRequestedLocationRef.current) return;
    hasRequestedLocationRef.current = true;
    locateCurrentPosition(false);
  }, [locateCurrentPosition]);

  const applyLocation = (next: {
    latitude: number;
    longitude: number;
    radius: number;
  }) => {
    setValue('latitude', next.latitude);
    setValue('longitude', next.longitude);
    setValue('radius', snapRadius(next.radius));
    setIsMapOpen(false);
  };

  const validateTimeRange = (values: SessionFormValues): boolean => {
    const openAt = combineLocalDateTime(values.openDate, values.openTime);
    const closeAt = combineLocalDateTime(values.closeDate, values.closeTime);
    if (isCloseAfterOpen(openAt, closeAt)) {
      clearErrors('closeTime');
      return true;
    }
    setError('closeTime', {
      type: 'validate',
      message: t('sessions.form.timeRangeInvalid'),
    });
    return false;
  };

  const handleNextStep = async () => {
    const isDetailsValid = await trigger(DETAILS_STEP_FIELDS);
    if (!isDetailsValid || !validateTimeRange(getValues())) return;
    setCurrentStep(PARTICIPANTS_STEP_INDEX);
  };

  const handlePreviousStep = () => setCurrentStep(DETAILS_STEP_INDEX);

  const handleFormSubmit = async (values: SessionFormValues) => {
    console.log('[submit] currentStep =', currentStep);
    console.log(
      '[submit] latitude =',
      values.latitude,
      'longitude =',
      values.longitude,
    );
    console.log(
      '[submit] openDate =',
      values.openDate,
      'openTime =',
      values.openTime,
    );
    console.log(
      '[submit] closeDate =',
      values.closeDate,
      'closeTime =',
      values.closeTime,
    );
    console.log('[submit] unitInclude =', values.unitInclude);
    console.log('[submit] tagInclude =', values.tagInclude);
    console.log(
      '[submit] codeIncludeText =',
      JSON.stringify(values.codeIncludeText),
    );
    console.log(
      '[submit] codeExcludeText =',
      JSON.stringify(values.codeExcludeText),
    );

    // Defensive: nếu vẫn ở bước 1, chuyển bước thay vì submit
    if (currentStep === DETAILS_STEP_INDEX) {
      await handleNextStep();
      return;
    }

    if (
      !Number.isFinite(values.latitude) ||
      !Number.isFinite(values.longitude)
    ) {
      toast.error(t('sessions.form.mapNeedsCoordinates'));
      return;
    }

    if (!validateTimeRange(values)) return;

    const hasAnyCriteria =
      values.unitInclude.length > 0 ||
      values.unitExclude.length > 0 ||
      values.tagInclude.length > 0 ||
      values.tagExclude.length > 0 ||
      values.codeIncludeText.trim().length > 0 ||
      values.codeExcludeText.trim().length > 0;

    if (!hasAnyCriteria) {
      setError('codeIncludeText', {
        type: 'validate',
        message: t('sessions.form.participantCodesRequired'),
      });
      return;
    }

    try {
      const created: unknown = await attendanceSessionsApi.create(
        buildCreateSessionRequest(values),
      );
      if (!isAttendanceSession(created)) {
        throw new Error('Unexpected attendance session response');
      }
      toast.success(t('sessions.createSuccess'));
      navigate(ROUTE_PATHS.attendanceSessions);
    } catch (error) {
      logSessionError('create', error);
      toast.error(t(resolveSessionErrorKey(error, 'create')));
    }
  };

  const steps: SessionStep[] = [
    {
      title: t('sessions.form.step.details.title'),
      description: t('sessions.form.step.details.description'),
    },
    {
      title: t('sessions.form.step.participants.title'),
      description: t('sessions.form.step.participants.description'),
    },
  ];

  const isDetailsStep = currentStep === DETAILS_STEP_INDEX;

  return (
    <>
      <Panel className="flex h-full min-h-0 flex-col">
        <PanelHeader
          title={t('sessions.form.heading')}
          subtitle={t('sessions.form.description')}
        />

        <PanelBody className="overflow-hidden">
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                currentStep === DETAILS_STEP_INDEX &&
                (e.target as HTMLElement).tagName !== 'TEXTAREA'
              ) {
                e.preventDefault();
                void handleNextStep();
              }
            }}
            className="flex h-full w-full flex-col gap-5 overflow-y-auto px-6 py-5"
            noValidate
          >
            <SessionStepIndicator steps={steps} currentStep={currentStep} />

            {isDetailsStep ? (
              <>
                {/* Tên phiên */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <MdOutlineTitle className="text-accent-strong text-sm" />
                    {t('sessions.form.title')}{' '}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('sessions.form.titlePlaceholder')}
                    aria-invalid={Boolean(errors.title)}
                    {...register('title', {
                      required: t('sessions.form.titleRequired'),
                    })}
                    className={INPUT_CLASS}
                  />
                  {errors.title && (
                    <p className="text-danger mt-1 text-xs">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Vị trí GPS gọn */}
                <SessionFormLocationCard
                  latitude={latitude}
                  longitude={longitude}
                  radius={radius}
                  isLocating={isLocating}
                  onUseCurrentLocation={() => locateCurrentPosition(true)}
                  onOpenMap={() => {
                    if (!hasCoordinates) {
                      toast.error(t('sessions.form.mapNeedsCoordinates'));
                      return;
                    }
                    setIsMapOpen(true);
                  }}
                  disableOpenMap={!hasCoordinates}
                />

                {(errors.latitude || errors.longitude || errors.radius) && (
                  <div className="space-y-1">
                    {errors.latitude && (
                      <p className="text-danger text-xs">
                        {errors.latitude.message}
                      </p>
                    )}
                    {errors.longitude && (
                      <p className="text-danger text-xs">
                        {errors.longitude.message}
                      </p>
                    )}
                    {errors.radius && (
                      <p className="text-danger text-xs">
                        {errors.radius.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Thời gian — gọn 1 card, 2 hàng */}
                <div className="rounded-xl border border-line bg-surface-subtle p-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <MdAccessTime
                      className="text-accent-strong text-sm"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-ink">
                      {t('sessions.form.timeSection')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-line bg-surface p-3">
                      <p className="mb-2 text-[12px] font-bold text-ink">
                        {t('sessions.form.openTime')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-muted">
                          {t('sessions.form.openDate')}
                          <input
                            type="date"
                            {...register('openDate', {
                              required: t('sessions.form.openTimeRequired'),
                            })}
                            className={INPUT_CLASS + ' mt-1 text-[13px]'}
                          />
                        </label>
                        <label className="text-[11px] text-muted">
                          {t('sessions.form.openClock')}
                          <input
                            type="time"
                            {...register('openTime', {
                              required: t('sessions.form.openTimeRequired'),
                            })}
                            className={INPUT_CLASS + ' mt-1 text-[13px]'}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-3">
                      <p className="mb-2 text-[12px] font-bold text-ink">
                        {t('sessions.form.closeTime')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-muted">
                          {t('sessions.form.closeDate')}
                          <input
                            type="date"
                            {...register('closeDate', {
                              required: t('sessions.form.closeTimeRequired'),
                            })}
                            className={INPUT_CLASS + ' mt-1 text-[13px]'}
                          />
                        </label>
                        <label className="text-[11px] text-muted">
                          {t('sessions.form.closeClock')}
                          <input
                            type="time"
                            {...register('closeTime', {
                              required: t('sessions.form.closeTimeRequired'),
                            })}
                            className={INPUT_CLASS + ' mt-1 text-[13px]'}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {(errors.openDate ||
                    errors.openTime ||
                    errors.closeDate ||
                    errors.closeTime) && (
                    <div className="mt-2 space-y-1">
                      {errors.openDate && (
                        <p className="text-danger text-xs">
                          {errors.openDate.message}
                        </p>
                      )}
                      {errors.openTime && (
                        <p className="text-danger text-xs">
                          {errors.openTime.message}
                        </p>
                      )}
                      {errors.closeDate && (
                        <p className="text-danger text-xs">
                          {errors.closeDate.message}
                        </p>
                      )}
                      {errors.closeTime && (
                        <p className="text-danger text-xs">
                          {errors.closeTime.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-xs text-muted">
                  {t('sessions.form.participantsStepNote')}
                </p>

                <ParticipantCriteriaEditor
                  control={control}
                  setValue={setValue}
                />
              </>
            )}

            {/* Footer nút */}
            <div className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t border-line pt-4">
              {isDetailsStep ? (
                <>
                  <button
                    key="cancel"
                    type="button"
                    onClick={() => navigate(ROUTE_PATHS.attendanceSessions)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-5 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
                  >
                    {t('sessions.form.cancel')}
                  </button>
                  <button
                    key="next"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void handleNextStep();
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-strong px-5 text-[12px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    {t('sessions.form.next')}
                    <MdArrowForward
                      aria-hidden="true"
                      className="text-[15px]"
                    />
                  </button>
                </>
              ) : (
                <>
                  <button
                    key="back"
                    type="button"
                    onClick={handlePreviousStep}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-5 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
                  >
                    <MdArrowBack aria-hidden="true" className="text-[15px]" />
                    {t('sessions.form.back')}
                  </button>
                  <button
                    key="submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-strong px-5 text-[12px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? t('sessions.form.submitting')
                      : t('sessions.form.submit')}
                  </button>
                </>
              )}
            </div>
          </form>
        </PanelBody>
      </Panel>

      {isMapOpen && hasCoordinates && (
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

export default SessionCreatePage;
