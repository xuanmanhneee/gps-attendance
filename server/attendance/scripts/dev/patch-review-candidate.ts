import Redis from 'ioredis';

const VALID_REASONS = new Set([
  'LOW_CONFIDENCE_SCORE',
  'MOCK_LOCATION',
  'OUT_OF_RANGE',
  'INVALID_LOCATION_TIMESTAMP',
]);

type AttendanceRecord = {
  sessionId: number;
  userId: number;
  status: string;
  updateBy: number | null;
};

const args = process.argv.slice(2);
const hasFlag = (name: string) => args.includes(name);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const parsePositiveInt = (name: string): number => {
  const value = Number(valueOf(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} phải là số nguyên dương`);
  }
  return value;
};

const bufferKeyFor = (sessionId: number) => `attendance:buffer:${sessionId}`;
const reviewKeyFor = (sessionId: number) => `attendance:review:${sessionId}`;

async function scanBufferKeys(redis: Redis): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      'MATCH',
      'attendance:buffer:*',
      'COUNT',
      100,
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys.filter((key) => /^attendance:buffer:\d+$/.test(key)).sort();
}

async function listBuffers(redis: Redis): Promise<void> {
  const keys = await scanBufferKeys(redis);
  if (keys.length === 0) {
    console.log('Không tìm thấy attendance buffer nào.');
    return;
  }

  for (const key of keys) {
    const records = await redis.hgetall(key);
    console.log(`${key}: ${Object.keys(records).length} record(s)`);
    for (const [userId, raw] of Object.entries(records)) {
      const record = JSON.parse(raw) as AttendanceRecord;
      console.log(
        `  user=${userId} status=${record.status} updateBy=${String(record.updateBy)}`,
      );
    }
  }
}

async function patchReviewCandidate(redis: Redis): Promise<void> {
  const sessionId = parsePositiveInt('--session-id');
  const userId = parsePositiveInt('--user-id');
  const reasons = (valueOf('--reasons') ?? 'LOW_CONFIDENCE_SCORE')
    .split(',')
    .map((reason) => reason.trim())
    .filter(Boolean);

  if (reasons.length === 0 || reasons.some((reason) => !VALID_REASONS.has(reason))) {
    throw new Error(
      `--reasons chỉ nhận: ${[...VALID_REASONS].join(', ')}`,
    );
  }

  const bufferKeys = await scanBufferKeys(redis);
  const bufferKey = bufferKeyFor(sessionId);
  if (!bufferKeys.includes(bufferKey)) {
    throw new Error(
      `Không tìm thấy ${bufferKey}. Hãy tạo session và khởi tạo roster trước.`,
    );
  }

  const rawRecord = await redis.hget(bufferKey, String(userId));
  if (!rawRecord) {
    throw new Error(`Không tìm thấy user=${userId} trong ${bufferKey}.`);
  }

  const record = JSON.parse(rawRecord) as AttendanceRecord;
  if (record.status !== 'absent' || record.updateBy !== null) {
    throw new Error(
      `Record không ở trạng thái có thể review: status=${record.status}, updateBy=${String(record.updateBy)}`,
    );
  }

  const candidate = {
    sessionId,
    userId,
    reasons,
    createdAt: new Date().toISOString(),
  };

  console.log(`Sẽ ghi ${reviewKeyFor(sessionId)} field=${userId}:`);
  console.log(JSON.stringify(candidate, null, 2));

  if (!hasFlag('--apply')) {
    console.log('Chưa ghi Redis. Thêm --apply để thực hiện.');
    return;
  }

  await redis.hset(reviewKeyFor(sessionId), String(userId), JSON.stringify(candidate));
  console.log('Đã tạo review candidate.');
}

async function main(): Promise<void> {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6370),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redis.on('error', () => undefined);

  try {
    await redis.connect();
    if (hasFlag('--list')) {
      await listBuffers(redis);
      return;
    }
    await patchReviewCandidate(redis);
  } finally {
    await redis.quit();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
