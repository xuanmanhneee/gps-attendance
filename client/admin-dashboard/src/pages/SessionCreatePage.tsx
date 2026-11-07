import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import {
  MdAccessTime,
  MdArrowBack,
  MdArrowForward,
  MdCheckCircle,
  MdGroups,
  MdLocationOn,
  MdOutlineTitle,
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { attendanceSessionsApi } from '../api/attendance-sessions.api';
import { PageActionBarPortal } from '../components/layout/page-action-bar';
import { SessionLocationFields } from '../components/sessions/SessionLocationFields';
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
import {
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
} from '../components/ui/Panel';
import { useTranslation } from '../hooks/useTranslation';
import { ROUTE_PATHS } from '../routes/paths';
import { isAttendanceSession } from '../types/attendance-session';
import {
  buildCreateSessionRequest,
  combineLocalDateTime,
  createDefaultSessionFormValues,
  isCloseAfterOpen,
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
  parseParticipantCodes,
  RADIUS_MIN,
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
  const { locale, t } = useTranslation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(DETAILS_STEP_INDEX);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

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
  const title = useWatch({ control, name: 'title' });
  const openDate = useWatch({ control, name: 'openDate' });
  const openTime = useWatch({ control, name: 'openTime' });
  const closeDate = useWatch({ control, name: 'closeDate' });
  const closeTime = useWatch({ control, name: 'closeTime' });
  const unitInclude = useWatch({ control, name: 'unitInclude' });
  const unitExclude = useWatch({ control, name: 'unitExclude' });
  const tagInclude = useWatch({ control, name: 'tagInclude' });
  const tagExclude = useWatch({ control, name: 'tagExclude' });
  const codeIncludeText = useWatch({ control, name: 'codeIncludeText' });
  const codeExcludeText = useWatch({ control, name: 'codeExcludeText' });

  const hasCoordinates =
    Number.isFinite(latitude) &&
    latitude >= LATITUDE_MIN &&
    latitude <= LATITUDE_MAX &&
    Number.isFinite(longitude) &&
    longitude >= LONGITUDE_MIN &&
    longitude <= LONGITUDE_MAX;
  const canOpenMap =
    hasCoordinates && Number.isFinite(radius) && radius >= RADIUS_MIN;

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
          setValue('latitude', Number(position.coords.latitude.toFixed(6)), {
            shouldDirty: true,
            shouldValidate: true,
          });
          setValue('longitude', Number(position.coords.longitude.toFixed(6)), {
            shouldDirty: true,
            shouldValidate: true,
          });
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

  const participantRuleCount =
    unitInclude.length +
    unitExclude.length +
    tagInclude.length +
    tagExclude.length +
    parseParticipantCodes(codeIncludeText).length +
    parseParticipantCodes(codeExcludeText).length;

  useEffect(() => {
    if (participantRuleCount > 0) clearErrors('codeIncludeText');
  }, [clearErrors, participantRuleCount]);

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
    const isDetailsValid = await trigger(DETAILS_STEP_FIELDS, {
      shouldFocus: true,
    });
    if (!isDetailsValid || !validateTimeRange(getValues())) return;
    setCurrentStep(PARTICIPANTS_STEP_INDEX);
  };

  const handlePreviousStep = () => setCurrentStep(DETAILS_STEP_INDEX);

  const handleFormSubmit = async (values: SessionFormValues) => {
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
  const formatDraftDateTime = (date: string, time: string) => {
    const value = combineLocalDateTime(date, time);
    if (!value) return t('sessions.form.notSet');

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t('sessions.form.notSet');

    return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  };

  return (
    <>
      <PageActionBarPortal>
        <div className="flex w-full items-center">
          <button
            type="button"
            onClick={() => navigate(ROUTE_PATHS.attendanceSessions)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
          >
            <MdArrowBack aria-hidden="true" />
            {t('sessionDetail.backToList')}
          </button>
        </div>
      </PageActionBarPortal>

      <Panel className="flex h-full min-h-0 flex-col">
        <PanelHeader
          title={t('sessions.form.heading')}
          subtitle={t('sessions.form.description')}
        />

        <PanelBody className="overflow-hidden">
          <form
            id="create-session-form"
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
            className="h-full w-full overflow-y-auto px-4 py-5 sm:px-6"
            noValidate
          >
            <div className="mx-auto w-full max-w-6xl">
              <SessionStepIndicator steps={steps} currentStep={currentStep} />

              {isDetailsStep ? (
                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="space-y-5">
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
                    <SessionLocationFields
                      latitude={latitude}
                      longitude={longitude}
                      isLocating={isLocating}
                      register={register}
                      errors={errors}
                      onUseCurrentLocation={() => locateCurrentPosition(true)}
                      onOpenMap={() => {
                        if (!hasCoordinates) {
                          toast.error(t('sessions.form.mapNeedsCoordinates'));
                          return;
                        }
                        setIsMapOpen(true);
                      }}
                      disableOpenMap={!canOpenMap}
                    />

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
                                  required: t(
                                    'sessions.form.closeTimeRequired',
                                  ),
                                })}
                                className={INPUT_CLASS + ' mt-1 text-[13px]'}
                              />
                            </label>
                            <label className="text-[11px] text-muted">
                              {t('sessions.form.closeClock')}
                              <input
                                type="time"
                                {...register('closeTime', {
                                  required: t(
                                    'sessions.form.closeTimeRequired',
                                  ),
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
                  </div>

                  <aside className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-0">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-strong">
                        <MdCheckCircle aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-ink">
                          {t('sessions.form.draftSummary')}
                        </h2>
                        <p className="text-xs text-muted">
                          {t('sessions.form.draftSummaryHint')}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 divide-y divide-line text-xs">
                      <div className="py-3 first:pt-0">
                        <dt className="flex items-center gap-1.5 font-medium text-muted">
                          <MdOutlineTitle aria-hidden="true" />
                          {t('sessions.form.title')}
                        </dt>
                        <dd className="mt-1 break-words font-semibold text-ink">
                          {title.trim() || t('sessions.form.untitled')}
                        </dd>
                      </div>
                      <div className="py-3">
                        <dt className="flex items-center gap-1.5 font-medium text-muted">
                          <MdAccessTime aria-hidden="true" />
                          {t('sessions.form.timeSection')}
                        </dt>
                        <dd className="mt-1 space-y-1 text-ink">
                          <span className="block">
                            {formatDraftDateTime(openDate, openTime)}
                          </span>
                          <span className="block text-muted">
                            → {formatDraftDateTime(closeDate, closeTime)}
                          </span>
                        </dd>
                      </div>
                      <div className="py-3 last:pb-0">
                        <dt className="flex items-center gap-1.5 font-medium text-muted">
                          <MdLocationOn aria-hidden="true" />
                          {t('sessions.form.locationSection')}
                        </dt>
                        <dd className="mt-1 font-semibold text-ink">
                          {hasCoordinates
                            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                            : t('sessions.form.notSet')}
                        </dd>
                        {hasCoordinates && (
                          <dd className="mt-1 text-muted">
                            {t('sessions.form.radius')}: {radius} m
                          </dd>
                        )}
                      </div>
                    </dl>

                    <p className="mt-4 flex gap-2 rounded-lg bg-surface-subtle p-3 text-xs leading-5 text-muted">
                      <MdGroups
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-accent-strong"
                      />
                      {t('sessions.form.participantsNextHint')}
                    </p>
                  </aside>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        {title.trim()}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDraftDateTime(openDate, openTime)} · {radius} m
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePreviousStep}
                      className="text-xs font-bold text-accent-strong hover:underline"
                    >
                      {t('sessions.form.editDetails')}
                    </button>
                  </div>

                  <div className="mb-4">
                    <h2 className="text-base font-bold text-ink">
                      {t('sessions.form.participantHeading')}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {t('sessions.form.participantsStepNote')}
                    </p>
                  </div>

                  {errors.codeIncludeText && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-danger bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger"
                    >
                      {errors.codeIncludeText.message}
                    </div>
                  )}

                  <ParticipantCriteriaEditor
                    control={control}
                    setValue={setValue}
                  />
                </>
              )}

              {/* Footer nút */}
            </div>
          </form>
        </PanelBody>

        <PanelFooter className="bg-surface">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                isDetailsStep
                  ? navigate(ROUTE_PATHS.attendanceSessions)
                  : handlePreviousStep()
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-5 text-xs font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              {!isDetailsStep && <MdArrowBack aria-hidden="true" />}
              {isDetailsStep
                ? t('sessions.form.cancel')
                : t('sessions.form.back')}
            </button>

            {isDetailsStep ? (
              <button
                type="button"
                onClick={() => void handleNextStep()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-strong px-5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                {t('sessions.form.next')}
                <MdArrowForward aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                form="create-session-form"
                disabled={isSubmitting}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-strong px-5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
              >
                {isSubmitting
                  ? t('sessions.form.submitting')
                  : t('sessions.form.submit')}
              </button>
            )}
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

export default SessionCreatePage;
