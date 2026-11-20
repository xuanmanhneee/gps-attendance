import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { en } from '../../i18n/translations/en.ts';
import { vi } from '../../i18n/translations/vi.ts';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  combineLocalDateTime,
  createDefaultSessionFormValues,
  isCloseAfterOpen,
  localDateTimeToIso,
  parseParticipantCodes,
  RADIUS_MAX,
  resolveGeolocationErrorKey,
  toLocalDateTimeInput,
  validateSessionForm,
  type SessionFormValues,
} from './session-form.ts';

const VALID_VALUES: SessionFormValues = {
  title: '  Buá»•i há»c sÃ¡ng  ',
  latitude: 21.0278,
  longitude: 105.8342,
  radius: 50,
  openDate: '2026-09-20',
  openTime: '08:00',
  closeDate: '2026-09-20',
  closeTime: '10:00',
  unitInclude: [],
  unitExclude: [],
  tagInclude: [],
  tagExclude: [],
  codeIncludeText: ' SV001, SV002, SV001 , ',
  codeExcludeText: '',
};

describe('isCloseAfterOpen', () => {
  it('cháº¥p nháº­n khi closeAt sau openAt', () => {
    assert.equal(
      isCloseAfterOpen('2026-09-20T08:00', '2026-09-20T08:01'),
      true,
    );
  });

  it('tá»« chá»‘i khi closeAt báº±ng openAt', () => {
    assert.equal(
      isCloseAfterOpen('2026-09-20T08:00', '2026-09-20T08:00'),
      false,
    );
  });

  it('tá»« chá»‘i khi closeAt trÆ°á»›c openAt', () => {
    assert.equal(
      isCloseAfterOpen('2026-09-20T08:00', '2026-09-20T07:00'),
      false,
    );
  });

  it('tá»« chá»‘i khi thiáº¿u má»™t trong hai thá»i Ä‘iá»ƒm', () => {
    assert.equal(isCloseAfterOpen('', '2026-09-20T08:00'), false);
    assert.equal(isCloseAfterOpen('2026-09-20T08:00', ''), false);
  });
});

describe('parseParticipantCodes', () => {
  it('trim, bá» pháº§n rá»—ng vÃ  dedup theo thá»© tá»± xuáº¥t hiá»‡n', () => {
    assert.deepEqual(parseParticipantCodes(VALID_VALUES.codeIncludeText), [
      'SV001',
      'SV002',
    ]);
  });

  it('chấp nhận cùng các dấu phân cách được hướng dẫn trên giao diện', () => {
    assert.deepEqual(parseParticipantCodes('SV001; SV002\nSV003\tSV004'), [
      'SV001',
      'SV002',
      'SV003',
      'SV004',
    ]);
  });
});

describe('validateSessionForm', () => {
  it('form há»£p lá»‡ tráº£ vá» khÃ´ng cÃ³ lá»—i nÃ o', () => {
    assert.deepEqual(validateSessionForm(VALID_VALUES), {});
  });

  it('form rá»—ng bÃ¡o lá»—i required cho tá»«ng field, khÃ´ng throw', () => {
    const errors = validateSessionForm({
      ...VALID_VALUES,
      title: '   ',
      latitude: Number.NaN,
      longitude: Number.NaN,
      codeIncludeText: '',
    });

    assert.equal(errors.title, 'sessions.form.titleRequired');
    assert.equal(errors.latitude, 'sessions.form.latitudeRequired');
    assert.equal(errors.longitude, 'sessions.form.longitudeRequired');
    assert.equal(
      errors.codeIncludeText,
      'sessions.form.participantCodesRequired',
    );
  });

  it('validation thá»i gian: closeAt pháº£i sau openAt', () => {
    const errors = validateSessionForm({
      ...VALID_VALUES,
      closeTime: '08:00',
    });

    assert.equal(errors.closeTime, 'sessions.form.timeRangeInvalid');
  });

  it('radius pháº£i lÃ  sá»‘ dÆ°Æ¡ng', () => {
    const errors = validateSessionForm({ ...VALID_VALUES, radius: 0 });

    assert.equal(errors.radius, 'sessions.form.radiusInvalid');
  });

  it('vÄ© Ä‘á»™/kinh Ä‘á»™ ngoÃ i khoáº£ng DTO backend bá»‹ tá»« chá»‘i', () => {
    const errors = validateSessionForm({
      ...VALID_VALUES,
      latitude: 91,
      longitude: -181,
    });

    assert.equal(errors.latitude, 'sessions.form.latitudeInvalid');
    assert.equal(errors.longitude, 'sessions.form.longitudeInvalid');
  });

  describe('toạ độ và bán kính (kiểm tra biên theo bảng)', () => {
    const boundaryCases: Array<{
      field: 'latitude' | 'longitude' | 'radius';
      value: number;
      expected: string | undefined;
      label: string;
    }> = [
      {
        field: 'latitude',
        value: 90,
        expected: undefined,
        label: 'lat 90 (cận trên hợp lệ)',
      },
      {
        field: 'latitude',
        value: -90,
        expected: undefined,
        label: 'lat -90 (cận dưới hợp lệ)',
      },
      {
        field: 'latitude',
        value: 90.0001,
        expected: 'sessions.form.latitudeInvalid',
        label: 'lat 90.0001 (vượt cận trên)',
      },
      {
        field: 'latitude',
        value: -90.0001,
        expected: 'sessions.form.latitudeInvalid',
        label: 'lat -90.0001 (vượt cận dưới)',
      },
      {
        field: 'longitude',
        value: 180,
        expected: undefined,
        label: 'lng 180 (cận trên hợp lệ)',
      },
      {
        field: 'longitude',
        value: -180,
        expected: undefined,
        label: 'lng -180 (cận dưới hợp lệ)',
      },
      {
        field: 'longitude',
        value: 180.0001,
        expected: 'sessions.form.longitudeInvalid',
        label: 'lng 180.0001 (vượt cận trên)',
      },
      {
        field: 'longitude',
        value: -180.0001,
        expected: 'sessions.form.longitudeInvalid',
        label: 'lng -180.0001 (vượt cận dưới)',
      },
      {
        field: 'radius',
        value: 1,
        expected: undefined,
        label: 'radius 1 (cận dưới hợp lệ)',
      },
      {
        field: 'radius',
        value: RADIUS_MAX,
        expected: undefined,
        label: `radius ${RADIUS_MAX} (cận trên hợp lệ)`,
      },
      {
        field: 'radius',
        value: 0,
        expected: 'sessions.form.radiusInvalid',
        label: 'radius 0 (dưới RADIUS_MIN)',
      },
      {
        field: 'radius',
        value: -1,
        expected: 'sessions.form.radiusInvalid',
        label: 'radius -1 (số âm)',
      },
      {
        field: 'radius',
        value: -0.0001,
        expected: 'sessions.form.radiusInvalid',
        label: 'radius -0.0001 (số âm sát 0)',
      },
      {
        field: 'radius',
        value: RADIUS_MAX + 0.01,
        expected: 'sessions.form.radiusInvalid',
        label: 'radius RADIUS_MAX + 0.01 (vượt trần Decimal(8,2))',
      },
      {
        field: 'radius',
        value: Number.NaN,
        expected: 'sessions.form.radiusRequired',
        label: 'radius NaN (bắt buộc nhập)',
      },
      {
        field: 'radius',
        value: Number.POSITIVE_INFINITY,
        expected: 'sessions.form.radiusRequired',
        label: 'radius Infinity (không hữu hạn)',
      },
    ];

    for (const { field, value, expected, label } of boundaryCases) {
      it(label, () => {
        const errors = validateSessionForm({ ...VALID_VALUES, [field]: value });
        assert.equal(errors[field], expected);
      });
    }
  });

  describe('thời gian (kiểm tra biên theo bảng)', () => {
    const timeCases: Array<{
      openDate?: string;
      openTime?: string;
      closeDate?: string;
      closeTime?: string;
      expectedError: string | undefined;
      label: string;
    }> = [
      {
        closeTime: '08:00',
        expectedError: 'sessions.form.timeRangeInvalid',
        label: 'closeAt = openAt -> timeRangeInvalid',
      },
      {
        closeTime: '07:30',
        expectedError: 'sessions.form.timeRangeInvalid',
        label: 'closeAt < openAt -> timeRangeInvalid',
      },
      {
        closeTime: '08:01',
        expectedError: undefined,
        label: 'closeAt sau openAt đúng 1 phút -> không lỗi',
      },
      {
        openTime: '',
        expectedError: 'sessions.form.openTimeRequired',
        label: 'thiếu openTime -> openTimeRequired',
      },
      {
        openDate: '',
        expectedError: 'sessions.form.openTimeRequired',
        label: 'thiếu openDate -> openTimeRequired',
      },
      {
        closeTime: '',
        expectedError: 'sessions.form.closeTimeRequired',
        label: 'thiếu closeTime -> closeTimeRequired',
      },
      {
        closeDate: '',
        expectedError: 'sessions.form.closeTimeRequired',
        label: 'thiếu closeDate -> closeTimeRequired',
      },
      {
        openDate: '2026-09-20',
        openTime: '23:50',
        closeDate: '2026-09-21',
        closeTime: '00:30',
        expectedError: undefined,
        label: 'qua đêm hợp lệ -> không lỗi',
      },
    ];

    for (const testCase of timeCases) {
      it(testCase.label, () => {
        const errors = validateSessionForm({
          ...VALID_VALUES,
          ...(testCase.openDate !== undefined && { openDate: testCase.openDate }),
          ...(testCase.openTime !== undefined && { openTime: testCase.openTime }),
          ...(testCase.closeDate !== undefined && { closeDate: testCase.closeDate }),
          ...(testCase.closeTime !== undefined && { closeTime: testCase.closeTime }),
        });
        assert.equal(errors.closeTime, testCase.expectedError);
      });
    }
  });

  it('má»i error key tráº£ vá» Ä‘á»u tá»“n táº¡i trong dictionary vi vÃ  en', () => {
    const samples: SessionFormValues[] = [
      {
        ...VALID_VALUES,
        title: '',
        latitude: Number.NaN,
        longitude: Number.NaN,
        radius: -1,
        openDate: '',
        openTime: '',
        closeDate: '',
        closeTime: '',
        codeIncludeText: '',
      },
      { ...VALID_VALUES, latitude: 91, longitude: 181, radius: 0 },
      { ...VALID_VALUES, closeTime: '07:00' },
    ];

    for (const values of samples) {
      for (const key of Object.values(validateSessionForm(values))) {
        assert.ok(key in vi, `thiáº¿u key ${key} trong vi`);
        assert.ok(key in en, `thiáº¿u key ${key} trong en`);
      }
    }
  });
});

describe('buildCreateSessionRequest', () => {
  it('payload khá»›p CreateAttendanceSessionRequest vá»›i participantCriteria', () => {
    assert.deepEqual(buildCreateSessionRequest(VALID_VALUES), {
      title: 'Buá»•i há»c sÃ¡ng',
      latitude: 21.0278,
      longitude: 105.8342,
      radius: 50,
      openAt: new Date(2026, 8, 20, 8, 0).toISOString(),
      closeAt: new Date(2026, 8, 20, 10, 0).toISOString(),
      participantCriteria: {
        codeFilter: {
          include: ['SV001', 'SV002'],
        },
      },
    });
  });
});

describe('buildUpdateSessionRequest', () => {
  it('phiên pending chỉ gửi các field đã thay đổi', () => {
    assert.deepEqual(
      buildUpdateSessionRequest(
        { ...VALID_VALUES, title: '  Tên mới  ', radius: 80 },
        { title: true, radius: true, closeTime: true },
        'pending',
      ),
      {
        title: 'Tên mới',
        radius: 80,
        closeAt: new Date(2026, 8, 20, 10, 0).toISOString(),
      },
    );
  });

  it('phiên open chỉ gửi closeAt dù form đánh dấu field bị khóa là dirty', () => {
    assert.deepEqual(
      buildUpdateSessionRequest(
        VALID_VALUES,
        { title: true, latitude: true, openTime: true, closeTime: true },
        'open',
      ),
      { closeAt: new Date(2026, 8, 20, 10, 0).toISOString() },
    );
  });
});

describe('createDefaultSessionFormValues', () => {
  it('máº·c Ä‘á»‹nh Ä‘Ã³ng sau openAt 2 giá» theo giá» local', () => {
    const now = new Date(2026, 8, 20, 8, 0); // 2026-09-20 08:00 local
    const defaults = createDefaultSessionFormValues(now);

    assert.equal(defaults.openDate, '2026-09-20');
    assert.equal(defaults.openTime, '08:00');
    assert.equal(defaults.closeDate, '2026-09-20');
    assert.equal(defaults.closeTime, '10:00');
    assert.equal(defaults.radius, 50);
  });
});

describe('resolveGeolocationErrorKey', () => {
  const geolocationError = (code: number): GeolocationPositionError =>
    ({
      code,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    }) as GeolocationPositionError;

  it('map mÃ£ lá»—i GeolocationPositionError sang key i18n', () => {
    assert.equal(
      resolveGeolocationErrorKey(geolocationError(1)),
      'sessions.form.geolocationPermissionDenied',
    );
    assert.equal(
      resolveGeolocationErrorKey(geolocationError(2)),
      'sessions.form.geolocationUnavailable',
    );
    assert.equal(
      resolveGeolocationErrorKey(geolocationError(3)),
      'sessions.form.geolocationTimeout',
    );
    assert.equal(
      resolveGeolocationErrorKey(geolocationError(99)),
      'sessions.form.geolocationUnavailable',
    );
  });
});

describe('combineLocalDateTime', () => {
  it('ghÃ©p ngÃ y + giá» vÃ  tráº£ rá»—ng khi thiáº¿u má»™t pháº§n', () => {
    assert.equal(
      combineLocalDateTime('2026-09-20', '08:00'),
      '2026-09-20T08:00',
    );
    assert.equal(combineLocalDateTime('', '08:00'), '');
    assert.equal(combineLocalDateTime('2026-09-20', ''), '');
  });
});

describe('localDateTimeToIso', () => {
  it("chuỗi kết thúc bằng 'Z' đại diện thời điểm ISO UTC", () => {
    const iso = localDateTimeToIso('2026-09-20', '08:00');
    assert.ok(iso.endsWith('Z'));
  });

  it('round-trip bảo toàn đúng mốc thời gian tuyệt đối', () => {
    const iso = localDateTimeToIso('2026-09-20', '08:00');
    const expectedMs = new Date(2026, 8, 20, 8, 0).getTime();
    assert.equal(new Date(iso).getTime(), expectedMs);
  });

  it('thiếu date hoặc time trả về chuỗi rỗng', () => {
    assert.equal(localDateTimeToIso('', '08:00'), '');
    assert.equal(localDateTimeToIso('2026-09-20', ''), '');
    assert.equal(localDateTimeToIso('', ''), '');
  });

  it('ngày hoặc giờ không hợp lệ trả về chuỗi rỗng và không throw RangeError', () => {
    assert.equal(localDateTimeToIso('invalid-date', '08:00'), '');
    assert.equal(localDateTimeToIso('2026-09-20', 'invalid-time'), '');
    assert.equal(localDateTimeToIso('abc', 'def'), '');
    assert.equal(localDateTimeToIso('2026-13-45', '99:99'), '');
  });

  it('chuyển đúng các mốc giờ biên 00:00 và 23:59', () => {
    assert.equal(
      localDateTimeToIso('2026-09-20', '00:00'),
      new Date(2026, 8, 20, 0, 0).toISOString(),
    );
    assert.equal(
      localDateTimeToIso('2026-09-20', '23:59'),
      new Date(2026, 8, 20, 23, 59).toISOString(),
    );
  });

  it('chuyển đúng cho phiên qua đêm (2026-09-20 23:50 -> 2026-09-21 00:30)', () => {
    const open = localDateTimeToIso('2026-09-20', '23:50');
    const close = localDateTimeToIso('2026-09-21', '00:30');
    assert.equal(open, new Date(2026, 8, 20, 23, 50).toISOString());
    assert.equal(close, new Date(2026, 8, 21, 0, 30).toISOString());
    assert.ok(new Date(close).getTime() > new Date(open).getTime());
  });
});

describe('toLocalDateTimeInput và format pad số 0', () => {
  it('toLocalDateTimeInput pad số 0 cho tháng, ngày, giờ, phút đơn lẻ', () => {
    const d = new Date(2026, 0, 5, 4, 7); // 2026-01-05 04:07 local
    assert.equal(toLocalDateTimeInput(d), '2026-01-05T04:07');
  });

  it('createDefaultSessionFormValues pad số 0 cho openDate và openTime', () => {
    const defaults = createDefaultSessionFormValues(new Date(2026, 0, 5, 4, 7));
    assert.equal(defaults.openDate, '2026-01-05');
    assert.equal(defaults.openTime, '04:07');
    assert.equal(defaults.closeDate, '2026-01-05');
    assert.equal(defaults.closeTime, '06:07');
  });
});
