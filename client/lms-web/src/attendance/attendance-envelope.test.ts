import assert from 'node:assert/strict';
import test from 'node:test';
import { describeFailure, parseEnvelope } from './attendance-envelope.ts';

test('envelope thành công trả data', () => {
  assert.deepEqual(parseEnvelope(200, { success: true, data: [1] }), {
    ok: true,
    data: [1],
  });
});

test('PATCH void: 2xx thân rỗng hoặc data undefined vẫn thành công', () => {
  assert.equal(parseEnvelope(200, { success: true }).ok, true);
  assert.equal(parseEnvelope(204, undefined).ok, true);
});

test('mảng thô 2xx (không envelope) vẫn chấp nhận', () => {
  assert.deepEqual(parseEnvelope(200, [1, 2]), { ok: true, data: [1, 2] });
});

test('mã lỗi ưu tiên hơn status', () => {
  const r = parseEnvelope(409, {
    success: false,
    code: 'ATTENDANCE_REVIEW_CANDIDATE_NOT_FOUND',
    message: 'raw secret detail',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.failure.kind, 'already-resolved');
});

test('401/403/404/429/500 không có envelope map theo status', () => {
  const kinds = [401, 403, 404, 429, 500].map((s) => {
    const r = parseEnvelope(s, { message: 'x' });
    return r.ok ? 'ok' : r.failure.kind;
  });
  assert.deepEqual(kinds, [
    'unauthorized',
    'forbidden',
    'not-found',
    'rate-limited',
    'server',
  ]);
});

test('success:false với HTTP 200 là invalid-response, không báo thành công', () => {
  const r = parseEnvelope(200, { success: false });
  assert.equal(r.ok, false);
});

test('describeFailure không lộ message thô, có fallback theo ngữ cảnh', () => {
  const text = describeFailure({ kind: 'unknown', status: 418 }, 'resolve');
  assert.equal(text, 'Không thể chốt yêu cầu. Vui lòng tải lại và thử lại.');
  assert.match(describeFailure({ kind: 'unauthorized' }, 'list'), /JWT/);
  assert.match(describeFailure({ kind: 'network' }, 'users'), /3000/);
});
