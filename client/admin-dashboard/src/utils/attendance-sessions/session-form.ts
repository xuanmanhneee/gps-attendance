/**
 * Logic thuần cho form tạo phiên điểm danh.
 *
 * Tách khỏi component để validate/parse có thể kiểm tra bằng `node:test` mà
 * không cần DOM, và để component chỉ hiển thị kết quả đã tính sẵn.
 */
import type { CreateAttendanceSessionRequest } from '@gps-attendance/shared';

import type { TranslationKey } from '../../i18n/translation-keys';

export type SessionFormValues = {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  /** `YYYY-MM-DD` theo giờ local (đúng định dạng input type="date"). */
  openDate: string;
  /** `HH:mm` theo giờ local (đúng định dạng input type="time"). */
  openTime: string;
  closeDate: string;
  closeTime: string;
  /** Vùng nhập tạm: mã sinh viên phân cách bằng dấu phẩy. */
  studentCodesText: string;
};

/** Field thật của form; mọi message đều gắn được vào một input cụ thể. */
export type SessionFormField =
  | 'title'
  | 'latitude'
  | 'longitude'
  | 'radius'
  | 'closeTime'
  | 'studentCodesText';

export const SESSION_FORM_FIELDS: readonly SessionFormField[] = [
  'title',
  'latitude',
  'longitude',
  'radius',
  'closeTime',
  'studentCodesText',
];

export type SessionFormErrors = Partial<
  Record<SessionFormField, TranslationKey>
>;

/** Định dạng `YYYY-MM-DDTHH:mm` theo giờ local (tránh lệch múi giờ UTC). */
export const toLocalDateTimeInput = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Giá trị mặc định cho mỗi lần mở modal: phiên mở ở thời điểm hiện tại và đóng
 * sau 2 giờ. Tính tại thời điểm mount nên không bị "cũ" như defaultValues giữ
 * trong state.
 */
export const createDefaultSessionFormValues = (
  now: Date = new Date(),
): SessionFormValues => {
  const closeAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const [openDate, openTime] = toLocalDateTimeInput(now).split('T');
  const [closeDate, closeTime] = toLocalDateTimeInput(closeAt).split('T');

  return {
    title: '',
    latitude: Number.NaN,
    longitude: Number.NaN,
    radius: 50,
    openDate: openDate ?? '',
    openTime: openTime ?? '',
    closeDate: closeDate ?? '',
    closeTime: closeTime ?? '',
    studentCodesText: '',
  };
};

/** Parse chuỗi mã sinh viên phân cách bằng dấu phẩy: trim, bỏ rỗng, dedup. */
export const parseStudentCodes = (raw: string): string[] => {
  const seen = new Set<string>();

  for (const part of raw.split(',')) {
    const code = part.trim();

    if (code) seen.add(code);
  }

  return Array.from(seen);
};

/** Ghép ngày + giờ local thành chuỗi gửi backend; rỗng khi thiếu một phần. */
export const combineLocalDateTime = (date: string, time: string): string =>
  date && time ? `${date}T${time}` : '';

/** `closeAt` phải sau `openAt`; so sánh trên timestamp local. */
export const isCloseAfterOpen = (openAt: string, closeAt: string): boolean => {
  const open = Date.parse(openAt);
  const close = Date.parse(closeAt);

  return Number.isFinite(open) && Number.isFinite(close) && close > open;
};

const validateRange = (
  value: number,
  min: number,
  max: number,
  requiredKey: TranslationKey,
  invalidKey: TranslationKey,
): TranslationKey | undefined => {
  if (!Number.isFinite(value)) return requiredKey;
  if (value < min || value > max) return invalidKey;

  return undefined;
};

/**
 * Validate toàn bộ form trước khi gửi.
 *
 * Trả về translation key theo từng field để UI hiển thị lỗi i18n; không throw,
 * không phụ thuộc DOM.
 */
export const validateSessionForm = (
  values: SessionFormValues,
): SessionFormErrors => {
  const errors: SessionFormErrors = {};

  if (values.title.trim().length === 0) {
    errors.title = 'sessions.form.titleRequired';
  }

  const latitudeError = validateRange(
    values.latitude,
    LATITUDE_MIN,
    LATITUDE_MAX,
    'sessions.form.latitudeRequired',
    'sessions.form.latitudeInvalid',
  );

  if (latitudeError) errors.latitude = latitudeError;

  const longitudeError = validateRange(
    values.longitude,
    LONGITUDE_MIN,
    LONGITUDE_MAX,
    'sessions.form.longitudeRequired',
    'sessions.form.longitudeInvalid',
  );

  if (longitudeError) errors.longitude = longitudeError;

  const radiusError = validateRange(
    values.radius,
    RADIUS_MIN,
    Number.MAX_SAFE_INTEGER,
    'sessions.form.radiusRequired',
    'sessions.form.radiusInvalid',
  );

  if (radiusError) errors.radius = radiusError;

  const openAt = combineLocalDateTime(values.openDate, values.openTime);
  const closeAt = combineLocalDateTime(values.closeDate, values.closeTime);

  if (!openAt) {
    errors.closeTime = 'sessions.form.openTimeRequired';
  } else if (!closeAt) {
    errors.closeTime = 'sessions.form.closeTimeRequired';
  } else if (!isCloseAfterOpen(openAt, closeAt)) {
    errors.closeTime = 'sessions.form.timeRangeInvalid';
  }

  if (parseStudentCodes(values.studentCodesText).length === 0) {
    errors.studentCodesText = 'sessions.form.participantCodesRequired';
  }

  return errors;
};

/**
 * Dựng payload đúng `CreateAttendanceSessionRequest`.
 *
 * Chỉ gọi sau khi `validateSessionForm` không còn lỗi.
 */
export const buildCreateSessionRequest = (
  values: SessionFormValues,
): CreateAttendanceSessionRequest => ({
  title: values.title.trim(),
  latitude: values.latitude,
  longitude: values.longitude,
  radius: values.radius,
  openAt: combineLocalDateTime(values.openDate, values.openTime),
  closeAt: combineLocalDateTime(values.closeDate, values.closeTime),
  participantCriteria: {
    codeFilter: {
      include: parseStudentCodes(values.studentCodesText),
    },
  },
});

/** Mã lỗi `GeolocationPositionError`: 1 denied, 2 unavailable, 3 timeout. */
export const resolveGeolocationErrorKey = (error: unknown): TranslationKey => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;

  if (code === 1) return 'sessions.form.locationPermissionDenied';
  if (code === 2) return 'sessions.form.locationUnavailable';
  if (code === 3) return 'sessions.form.locationTimeout';

  return 'sessions.form.locationError';
};

/** Giới hạn trùng DTO backend (`@IsLatitude`, `@IsLongitude`, `@IsPositive`). */
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;
export const RADIUS_MIN = 1;
