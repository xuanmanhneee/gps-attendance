import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { en } from '../../i18n/translations/en.ts';
import { vi } from '../../i18n/translations/vi.ts';
import {
  buildCreateSessionRequest,
  combineLocalDateTime,
  createDefaultSessionFormValues,
  isCloseAfterOpen,
  parseParticipantCodes,
  resolveGeolocationErrorKey,
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
      openAt: '2026-09-20T08:00',
      closeAt: '2026-09-20T10:00',
      participantCriteria: {
        codeFilter: {
          include: ['SV001', 'SV002'],
        },
      },
    });
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
