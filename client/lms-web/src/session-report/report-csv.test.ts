import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REPORT_CSV_BOM,
  buildSessionReportCsv,
  buildSessionReportFileName,
  escapeCsvCell,
  filterRecords,
  toUtcIso,
} from './report-csv.ts';

const records = [
  { code: 'SV1', fullname: 'An', status: 'present', checkedInAt: '2026-01-01T01:00:00.000Z' },
  { code: 'SV2', fullname: '=cmd|x', status: 'absent', checkedInAt: null },
  { code: 'SV3', fullname: 'Bình, "B"', status: 'weird', checkedInAt: null },
];
const at = new Date('2026-02-03T04:05:06.789Z');

test('escapeCsvCell chặn công thức, quote dấu phẩy/nháy/xuống dòng', () => {
  assert.equal(escapeCsvCell('=1+1'), "'=1+1");
  assert.equal(escapeCsvCell('-x'), "'-x");
  assert.equal(escapeCsvCell('a,b'), '"a,b"');
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""');
  assert.equal(escapeCsvCell('a\nb'), '"a\nb"');
  assert.equal(escapeCsvCell('\r=x'), '"\'\r=x"');
  assert.equal(escapeCsvCell(5), '5');
});

test('toUtcIso chuẩn hóa, giữ chuỗi lạ, thiếu -> Không có', () => {
  assert.equal(toUtcIso('2026-01-01T08:00:00+07:00'), '2026-01-01T01:00:00.000Z');
  assert.equal(toUtcIso('abc'), 'abc');
  assert.equal(toUtcIso(undefined), 'Không có');
  assert.equal(toUtcIso(null), 'Không có');
});

test('CSV có BOM, CRLF, toàn bộ records, không cột role/updatedAt', () => {
  const csv = buildSessionReportCsv({
    session: { externalId: 'lms-1', status: 'open', finalized: false },
    records,
    generatedAt: at,
  });
  assert.ok(csv.startsWith(REPORT_CSV_BOM));
  assert.ok(csv.endsWith('\r\n'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[1], 'Tiêu đề,Không có');
  assert.equal(lines[2], 'Trạng thái phiên,Đang mở');
  assert.equal(lines[6], 'Thời điểm xuất,2026-02-03T04:05:06.789Z');
  assert.equal(lines[7], 'Múi giờ,UTC');
  assert.equal(lines[8], 'Số dòng,3');
  assert.equal(lines[11], 'Mã sinh viên,Họ và tên,Trạng thái,Điểm danh lúc (UTC)');
  assert.equal(lines[12], 'SV1,An,Có mặt,2026-01-01T01:00:00.000Z');
  assert.equal(lines[13], "SV2,'=cmd|x,Vắng,");
  assert.equal(lines[14], 'SV3,"Bình, ""B""",weird,');
  assert.ok(!csv.includes('Vai trò'));
});

test('filterRecords chỉ lọc bảng; CSV luôn nhận toàn bộ records', () => {
  assert.equal(filterRecords(records, 'present', '').length, 1);
  assert.equal(filterRecords(records, 'all', 'sv2').length, 1);
  assert.equal(filterRecords(records, 'all', '').length, 3);
});

test('tên file an toàn', () => {
  assert.equal(
    buildSessionReportFileName('a/b c', at),
    'diem-danh-a-b-c-2026-02-03T04-05-06-789Z.csv',
  );
});
