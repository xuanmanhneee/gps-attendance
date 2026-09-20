import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { en } from '../i18n/translations/en.ts';
import { vi } from '../i18n/translations/vi.ts';
import {
  ATTENDANCE_STATUS_LABEL_KEYS,
  ATTENDANCE_STATUS_TONE_CLASS,
  PARTICIPANT_ROLE_LABEL_KEYS,
} from './attendance-status.ts';

describe('ATTENDANCE_STATUS_LABEL_KEYS', () => {
  it('mỗi AttendanceStatus đều có nhãn i18n ở cả vi và en', () => {
    for (const key of Object.values(ATTENDANCE_STATUS_LABEL_KEYS)) {
      assert.ok(key in vi, `thiếu key ${key} trong vi`);
      assert.ok(key in en, `thiếu key ${key} trong en`);
    }
  });

  it('mỗi trạng thái có tone riêng để không chỉ dựa vào màu', () => {
    assert.deepEqual(Object.keys(ATTENDANCE_STATUS_TONE_CLASS).sort(), [
      'absent',
      'present',
    ]);
  });
});

describe('PARTICIPANT_ROLE_LABEL_KEYS', () => {
  it('mỗi Role của participant đều có nhãn i18n ở cả vi và en', () => {
    for (const key of Object.values(PARTICIPANT_ROLE_LABEL_KEYS)) {
      assert.ok(key in vi, `thiếu key ${key} trong vi`);
      assert.ok(key in en, `thiếu key ${key} trong en`);
    }
  });
});
