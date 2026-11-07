import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AttendanceParticipantResponse } from '@gps-attendance/shared';

import {
  filterAttendanceRecords,
  summarizeAttendanceRecords,
} from './attendance-record-list.ts';

const participants: AttendanceParticipantResponse[] = [
  {
    user: { code: 'SV001', fullname: 'Nguyễn An', role: 'participant' },
    status: 'present',
    checkedInAt: '2026-10-27T01:00:00.000Z',
    updatedAt: '2026-10-27T01:00:00.000Z',
  },
  {
    user: { code: 'SV002', fullname: 'Trần Bình', role: 'participant' },
    status: 'absent',
    checkedInAt: null,
    updatedAt: '2026-10-27T01:00:00.000Z',
  },
  {
    user: { code: 'SV003', fullname: 'Lê An', role: 'participant' },
    status: 'late',
    checkedInAt: '2026-10-27T01:05:00.000Z',
    updatedAt: '2026-10-27T01:05:00.000Z',
  },
];

describe('attendance record list', () => {
  it('tổng hợp số lượng theo từng trạng thái', () => {
    assert.deepEqual(summarizeAttendanceRecords(participants), {
      total: 3,
      present: 1,
      absent: 1,
      late: 1,
      excused: 0,
    });
  });

  it('lọc đồng thời theo tên, mã và trạng thái', () => {
    assert.deepEqual(
      filterAttendanceRecords(participants, 'an', 'late').map(
        (participant) => participant.user.code,
      ),
      ['SV003'],
    );
    assert.deepEqual(
      filterAttendanceRecords(participants, 'sv00', 'present').map(
        (participant) => participant.user.code,
      ),
      ['SV001'],
    );
  });

  it('không mutate danh sách gốc khi không có bộ lọc', () => {
    const result = filterAttendanceRecords(participants, '', 'all');

    assert.deepEqual(result, participants);
    assert.notEqual(result, participants);
  });
});
