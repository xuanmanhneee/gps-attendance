export type SessionRecord = {
  code: string;
  fullname: string;
  status: string;
  checkedInAt: string | null;
};
export type SessionRecordsResponse = {
  externalId: string;
  finalized: boolean;
  records: SessionRecord[];
};
// Route thật trả đủ title/openAt/closeAt; mock fallback chỉ trả status/participantCount/finalized.
export type SessionDetail = {
  externalId: string;
  status: string;
  finalized: boolean;
  participantCount?: number;
  title?: string;
  openAt?: string;
  closeAt?: string;
};

export const REPORT_CSV_BOM = '﻿';
export const NOT_AVAILABLE = 'Không có';

export const STATUS_LABELS: Record<string, string> = {
  present: 'Có mặt',
  absent: 'Vắng',
  late: 'Đi muộn',
  excused: 'Có phép',
};
export const SESSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Chưa mở',
  open: 'Đang mở',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
};

const CRLF = '\r\n';
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const QUOTE_NEEDED = /[",\r\n]/;

/** Escape một ô CSV; chặn formula injection bằng dấu nháy đơn đứng trước. */
export const escapeCsvCell = (value: string | number): string => {
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return QUOTE_NEEDED.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toRow = (cells: Array<string | number>) =>
  cells.map(escapeCsvCell).join(',');

export const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;
export const sessionStatusLabel = (status: string) =>
  SESSION_STATUS_LABELS[status] ?? status;

/** ISO UTC nếu parse được, ngược lại giữ nguyên chuỗi gốc; thiếu thì "Không có". */
export const toUtcIso = (value: string | null | undefined): string => {
  if (!value) return NOT_AVAILABLE;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toISOString();
};

export const summarizeRecords = (records: SessionRecord[]) => {
  const counts: Record<string, number> = {};
  for (const record of records)
    counts[record.status] = (counts[record.status] ?? 0) + 1;
  return { total: records.length, counts };
};

export const filterRecords = (
  records: SessionRecord[],
  status: string,
  query: string,
): SessionRecord[] => {
  const needle = query.trim().toLowerCase();
  return records.filter(
    (record) =>
      (status === 'all' || record.status === status) &&
      (!needle ||
        record.code.toLowerCase().includes(needle) ||
        record.fullname.toLowerCase().includes(needle)),
  );
};

/**
 * CSV xuất TOÀN BỘ records của phiên (không phụ thuộc bộ lọc đang xem).
 * Dữ liệu LMS không có role/updatedAt nên không có cột tương ứng.
 */
export const buildSessionReportCsv = (input: {
  session: SessionDetail;
  records: SessionRecord[];
  generatedAt: Date;
}): string => {
  const { session, records, generatedAt } = input;
  const { total, counts } = summarizeRecords(records);
  const summary = [
    `Tổng: ${total}`,
    ...Object.entries(counts).map(
      ([status, count]) => `${statusLabel(status)}: ${count}`,
    ),
  ].join('; ');
  const lines = [
    toRow(['Mã phiên', session.externalId]),
    toRow(['Tiêu đề', session.title ?? NOT_AVAILABLE]),
    toRow(['Trạng thái phiên', sessionStatusLabel(session.status)]),
    toRow(['Chốt kết quả', session.finalized ? 'Đã chốt' : 'Chưa chốt']),
    toRow(['Giờ mở', toUtcIso(session.openAt)]),
    toRow(['Giờ đóng', toUtcIso(session.closeAt)]),
    toRow(['Thời điểm xuất', generatedAt.toISOString()]),
    toRow(['Múi giờ', 'UTC']),
    toRow(['Số dòng', total]),
    toRow(['Tổng hợp', summary]),
    '',
    toRow(['Mã sinh viên', 'Họ và tên', 'Trạng thái', 'Điểm danh lúc (UTC)']),
    ...records.map((record) =>
      toRow([
        record.code,
        record.fullname,
        statusLabel(record.status),
        record.checkedInAt ? toUtcIso(record.checkedInAt) : '',
      ]),
    ),
  ];
  return `${REPORT_CSV_BOM}${lines.join(CRLF)}${CRLF}`;
};

export const buildSessionReportFileName = (
  externalId: string,
  generatedAt: Date,
): string => {
  const safeId = externalId.replace(/[^A-Za-z0-9_-]+/g, '-') || 'session';
  return `diem-danh-${safeId}-${generatedAt.toISOString().replace(/[:.]/g, '-')}.csv`;
};

export const downloadCsvFile = (fileName: string, csv: string): void => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
