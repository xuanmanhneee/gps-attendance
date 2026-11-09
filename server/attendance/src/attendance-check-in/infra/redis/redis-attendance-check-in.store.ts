import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type {
  AttendanceAttemptResult,
  AttendanceHistoryEventType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { deviceTrustCacheKey } from '../../../device-trust/device-trust-cache';
import type { AttendanceAttemptInput, IAttendanceCheckInAttemptRepository } from '../../repositories/attendance-check-in-attempt.repository';
import type { IAttendanceCheckInDeviceUsageRepository } from '../../repositories/attendance-check-in-device-usage.repository';

const ATTEMPT_QUEUE_KEY = 'attendance:attempts:queue';
const ATTEMPT_PENDING_KEY = 'attendance:attempts:pending';
const ATTEMPT_PENDING_INDEX_KEY = 'attendance:attempts:pending-index';
const WORKER_LOCK_KEY = 'attendance:attempts:worker-lock';
const DEVICE_TTL_SECONDS = 86_400;
const ATTEMPT_WINDOW_MS = 120_000;
const ATTEMPT_BATCH_SIZE = 250;
const ABANDONED_ATTEMPT_MS = 300_000;

const attemptCountKey = (sessionId: number, userId: number) =>
  `attendance:attempts:count:${sessionId}:${userId}`;
const deviceClaimKey = (sessionId: number, deviceId: string) =>
  `attendance:device:${sessionId}:${deviceId}`;
type AttestationResult = {
  provider: string;
  verdict: string;
  reasons: string[];
};

type QueuedAttempt = {
  id: string;
  input: AttendanceAttemptInput;
  createdAt: string;
  result?: AttendanceAttemptResult;
  reasons: string[];
  attestation?: AttestationResult;
};

type QueuedAttemptWire = Omit<QueuedAttempt, 'reasons' | 'attestation'> & {
  reasons?: unknown;
  reasonsJson?: unknown;
  attestation?: unknown;
  attestationJson?: unknown;
};

type QueuedDevice = {
  userId: number;
  deviceId: string;
  platform: string;
  model: string | null;
  lastSeenAt: Date;
};

const CREATE_ATTEMPT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local attempt = cjson.decode(ARGV[3])
attempt.id = ARGV[2]
attempt.createdAt = ARGV[4]
redis.call('HSET', KEYS[2], ARGV[2], cjson.encode(attempt))
redis.call('ZADD', KEYS[3], ARGV[5], ARGV[2])
return count
`;

const COMPLETE_ATTEMPT_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local attempt = cjson.decode(raw)
attempt.result = ARGV[2]
attempt.reasonsJson = ARGV[3]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(attempt))
redis.call('ZREM', KEYS[2], ARGV[1])
redis.call('ZADD', KEYS[3], ARGV[4], ARGV[1])
return 1
`;

const SET_ATTESTATION_SCRIPT = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 0 end
local attempt = cjson.decode(raw)
attempt.attestationJson = ARGV[2]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(attempt))
return 1
`;

const PROMOTE_ABANDONED_SCRIPT = `
local ids = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2])
for _, id in ipairs(ids) do
  local raw = redis.call('HGET', KEYS[2], id)
  if raw then
    local attempt = cjson.decode(raw)
    if not attempt.result then
      attempt.result = 'REJECTED'
      attempt.reasonsJson = '["ATTEMPT_INCOMPLETE"]'
      redis.call('HSET', KEYS[2], id, cjson.encode(attempt))
      redis.call('ZADD', KEYS[3], ARGV[3], id)
    end
  end
  redis.call('ZREM', KEYS[1], id)
end
return #ids
`;

const ACK_ATTEMPTS_SCRIPT = `
for i = 1, #ARGV do
  redis.call('ZREM', KEYS[1], ARGV[i])
  redis.call('HDEL', KEYS[2], ARGV[i])
end
return #ARGV
`;

const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

@Injectable()
export class RedisAttendanceCheckInStore
  implements
    IAttendanceCheckInAttemptRepository,
    IAttendanceCheckInDeviceUsageRepository
{
  private readonly logger = new Logger(RedisAttendanceCheckInStore.name);
  private processing = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async createAttempt(
    input: AttendanceAttemptInput,
  ): Promise<{ id: string; count: number }> {
    const id = randomUUID();
    const now = Date.now();
    const raw = await this.redisService.eval(
      CREATE_ATTEMPT_SCRIPT,
      [
        attemptCountKey(input.sessionId, input.userId),
        ATTEMPT_PENDING_KEY,
        ATTEMPT_PENDING_INDEX_KEY,
      ],
      [
        String(ATTEMPT_WINDOW_MS),
        id,
        JSON.stringify({ input }),
        new Date(now).toISOString(),
        String(now),
      ],
    );
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error('Redis returned an invalid check-in attempt count');
    }
    return { id, count };
  }

  async completeAttempt(
    id: string,
    result: AttendanceAttemptResult,
    reasons: string[],
  ): Promise<void> {
    const completed = await this.redisService.eval(
      COMPLETE_ATTEMPT_SCRIPT,
      [ATTEMPT_PENDING_KEY, ATTEMPT_PENDING_INDEX_KEY, ATTEMPT_QUEUE_KEY],
      [id, result, JSON.stringify(reasons), String(Date.now())],
    );
    if (Number(completed) !== 1) {
      throw new Error(`Unable to finalize queued check-in attempt ${id}`);
    }
  }

  async setAttestationResult(
    id: string,
    input: AttestationResult,
  ): Promise<void> {
    const updated = await this.redisService.eval(
      SET_ATTESTATION_SCRIPT,
      [ATTEMPT_PENDING_KEY],
      [id, JSON.stringify(input)],
    );
    if (Number(updated) !== 1) {
      throw new Error(`Unable to attach attestation to check-in attempt ${id}`);
    }
  }

  async getAttemptCount(sessionId: number, userId: number): Promise<number> {
    const count = await this.redisService.get(
      attemptCountKey(sessionId, userId),
    );
    return count ? Number(count) : 0;
  }

  async getDeviceTrustStatus(
    userId: number,
    deviceId: string,
    loadFromDatabase: () => Promise<string>,
  ): Promise<string> {
    const key = deviceTrustCacheKey(userId, deviceId);
    const cached = await this.redisService.get(key);
    if (cached) return cached;

    const trustStatus = await loadFromDatabase();
    await this.redisService.set(key, trustStatus, { ifNotExists: true });
    return (await this.redisService.get(key)) ?? trustStatus;
  }

  async setDeviceTrustStatus(
    userId: number,
    deviceId: string,
    trustStatus: string,
  ): Promise<void> {
    await this.redisService.set(
      deviceTrustCacheKey(userId, deviceId),
      trustStatus,
    );
  }

  async isUsed(
    sessionId: number,
    deviceId: string,
    userId?: number,
  ): Promise<boolean> {
    const owner = await this.redisService.get(
      deviceClaimKey(sessionId, deviceId),
    );
    return owner !== null && (userId === undefined || owner !== String(userId));
  }

  async markUsed(_sessionId: number, _deviceId: string): Promise<void> {
    // The attendance record buffer claims the device atomically with the record.
  }

  @Interval(250)
  async flushQueuedAttempts(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    const owner = randomUUID();
    try {
      const acquired = await this.redisService.set(
        WORKER_LOCK_KEY,
        owner,
        { ttlSec: 60, ifNotExists: true },
      );
      if (acquired !== 'OK') return;

      await this.promoteAbandonedAttempts();
      const ids = await this.redisService.zrangebyscore(
        ATTEMPT_QUEUE_KEY,
        '-inf',
        '+inf',
        0,
        ATTEMPT_BATCH_SIZE,
      );
      if (ids.length === 0) return;

      const rawAttempts = await Promise.all(
        ids.map((id) => this.redisService.hget(ATTEMPT_PENDING_KEY, id)),
      );
      const attempts = rawAttempts.map((raw, index) => {
        if (!raw) throw new Error(`Queued attempt ${ids[index]} has no payload`);
        return this.decodeQueuedAttempt(raw, ids[index]);
      });

      await this.persistBatch(attempts);
      await this.redisService.eval(
        ACK_ATTEMPTS_SCRIPT,
        [ATTEMPT_QUEUE_KEY, ATTEMPT_PENDING_KEY],
        ids,
      );
    } catch (error) {
      this.logger.error(
        `Unable to flush asynchronous check-in batch: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      try {
        await this.redisService.eval(
          RELEASE_LOCK_SCRIPT,
          [WORKER_LOCK_KEY],
          [owner],
        );
      } catch (error) {
        this.logger.error(
          `Unable to release asynchronous check-in worker lock: ${(error as Error).message}`,
          (error as Error).stack,
        );
      } finally {
        this.processing = false;
      }
    }
  }

  private async promoteAbandonedAttempts(): Promise<void> {
    await this.redisService.eval(
      PROMOTE_ABANDONED_SCRIPT,
      [
        ATTEMPT_PENDING_INDEX_KEY,
        ATTEMPT_PENDING_KEY,
        ATTEMPT_QUEUE_KEY,
      ],
      [
        String(Date.now() - ABANDONED_ATTEMPT_MS),
        '100',
        String(Date.now()),
      ],
    );
  }

  private decodeQueuedAttempt(raw: string, id: string): QueuedAttempt {
    const wire = JSON.parse(raw) as QueuedAttemptWire;
    if (!wire.result) {
      throw new Error(`Queued attempt ${id} has no final result`);
    }

    const attestationValue = wire.attestationJson ?? wire.attestation;
    const attestation = attestationValue === undefined
      ? undefined
      : this.decodeAttestation(attestationValue, id);

    return {
      id: wire.id,
      input: wire.input,
      createdAt: wire.createdAt,
      result: wire.result,
      reasons: this.decodeStringArray(wire.reasonsJson ?? wire.reasons ?? [], `${id}.reasons`),
      attestation,
    };
  }

  private decodeStringArray(value: unknown, field: string): string[] {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.keys(parsed).length === 0
    ) {
      return [];
    }
    throw new Error(`Queued attempt field ${field} is not a string array`);
  }

  private decodeAttestation(value: unknown, id: string): AttestationResult {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`Queued attempt ${id} has invalid attestation data`);
    }

    const attestation = parsed as Record<string, unknown>;
    if (
      (attestation.provider !== 'PLAY_INTEGRITY' &&
        attestation.provider !== 'APP_ATTEST') ||
      typeof attestation.verdict !== 'string'
    ) {
      throw new Error(`Queued attempt ${id} has invalid attestation data`);
    }

    return {
      provider: attestation.provider,
      verdict: attestation.verdict,
      reasons: this.decodeStringArray(
        attestation.reasonsJson ?? attestation.reasons ?? [],
        `${id}.attestation.reasons`,
      ),
    };
  }

  private async persistBatch(attempts: QueuedAttempt[]): Promise<void> {
    const devicePairs = new Map<string, QueuedDevice>();
    for (const attempt of attempts) {
      const { userId, deviceId, platform, model } = attempt.input;
      const key = `${userId}:${deviceId}`;
      const lastSeenAt = new Date(attempt.createdAt);
      const existing = devicePairs.get(key);
      if (!existing || lastSeenAt > existing.lastSeenAt) {
        devicePairs.set(key, {
          userId,
          deviceId,
          platform: platform ?? 'unknown',
          model: model ?? null,
          lastSeenAt,
        });
      }
    }
    await this.prisma.registeredDevice.createMany({
      data: [...devicePairs.values()].map(
        ({ lastSeenAt: _lastSeenAt, ...device }) => device,
      ),
      skipDuplicates: true,
    });

    const deviceUpdateGroups = new Map<string, QueuedDevice[]>();
    for (const device of devicePairs.values()) {
      const groupKey = JSON.stringify([device.platform, device.model]);
      const group = deviceUpdateGroups.get(groupKey) ?? [];
      group.push(device);
      deviceUpdateGroups.set(groupKey, group);
    }
    await Promise.all(
      [...deviceUpdateGroups.values()].map((devices) =>
        this.prisma.registeredDevice.updateMany({
          where: {
            OR: devices.map(({ userId, deviceId }) => ({ userId, deviceId })),
          },
          data: {
            platform: devices[0].platform,
            model: devices[0].model,
            lastSeenAt: devices.reduce(
              (latest, device) =>
                device.lastSeenAt > latest ? device.lastSeenAt : latest,
              devices[0].lastSeenAt,
            ),
          },
        }),
      ),
    );

    const devices = await this.prisma.registeredDevice.findMany({
      where: {
        OR: [...devicePairs.values()].map(({ userId, deviceId }) => ({
          userId,
          deviceId,
        })),
      },
      select: { id: true, userId: true, deviceId: true },
    });
    const registeredDeviceId = new Map(
      devices.map((device) => [
        `${device.userId}:${device.deviceId}`,
        device.id,
      ]),
    );

    await this.prisma.attendanceAttempt.createMany({
      data: attempts.map((attempt) => ({
        queueId: attempt.id,
        sessionId: attempt.input.sessionId,
        userId: attempt.input.userId,
        latitude: attempt.input.latitude,
        longitude: attempt.input.longitude,
        accuracy: attempt.input.accuracy,
        distanceToCenter: attempt.input.distanceToCenter,
        deviceId: attempt.input.deviceId,
        isMockLocation: attempt.input.isMockLocation,
        serverTimestamp: new Date(attempt.createdAt),
        createdAt: new Date(attempt.createdAt),
        result: attempt.result,
        reasons: attempt.reasons,
      })),
      skipDuplicates: true,
    });

    const persistedAttempts = await this.prisma.attendanceAttempt.findMany({
      where: { queueId: { in: attempts.map((attempt) => attempt.id) } },
      select: { id: true, queueId: true, sessionId: true, userId: true },
    });
    const attemptsByQueueId = new Map(
      persistedAttempts.map((attempt) => [attempt.queueId, attempt]),
    );
    if (attemptsByQueueId.size !== attempts.length) {
      throw new Error('Not all asynchronous check-in attempts were persisted');
    }

    await this.prisma.attendanceHistoryEvent.createMany({
      data: attempts.flatMap((queuedAttempt) => {
        const persisted = attemptsByQueueId.get(queuedAttempt.id)!;
        const result = queuedAttempt.result!;
        const status = result === 'APPROVED' || result === 'REVIEW'
          ? 'present'
          : null;
        const semanticEvent: AttendanceHistoryEventType =
          result === 'APPROVED'
            ? 'GPS_VALIDATED'
            : result === 'REVIEW'
              ? 'GPS_REVIEW'
              : queuedAttempt.reasons.includes('DUPLICATE_DEVICE') ||
                  queuedAttempt.reasons.includes('DEVICE_BLOCKED')
                ? 'DEVICE_REJECTED'
                : queuedAttempt.reasons.includes('TOO_MANY_ATTEMPTS')
                  ? 'ATTEMPT_REJECTED'
                  : 'GPS_REJECTED';
        return [
          {
            sourceKey: `${queuedAttempt.id}:attempt`,
            sessionId: persisted.sessionId,
            userId: persisted.userId,
            actorId: persisted.userId,
            attemptId: persisted.id,
            eventType: 'CHECK_IN_ATTEMPT' as const,
            status,
            attemptResult: result,
            reasons: queuedAttempt.reasons,
          },
          {
            sourceKey: `${queuedAttempt.id}:result`,
            sessionId: persisted.sessionId,
            userId: persisted.userId,
            actorId: persisted.userId,
            attemptId: persisted.id,
            eventType: semanticEvent,
            status,
            attemptResult: result,
            reasons: queuedAttempt.reasons,
          },
        ];
      }),
      skipDuplicates: true,
    });

    const integrityChecks = attempts.flatMap((attempt) => {
      if (!attempt.attestation) return [];
      return [{
        sourceKey: `${attempt.id}:integrity`,
        userId: attempt.input.userId,
        registeredDeviceId:
          registeredDeviceId.get(
            `${attempt.input.userId}:${attempt.input.deviceId}`,
          ) ?? null,
        sessionId: attempt.input.sessionId,
        provider: attempt.attestation.provider as 'PLAY_INTEGRITY' | 'APP_ATTEST',
        verdict: attempt.attestation.verdict,
        reasons: attempt.attestation.reasons.length
          ? attempt.attestation.reasons
          : ['ATTESTATION_OK'],
      }];
    });
    if (integrityChecks.length > 0) {
      await this.prisma.deviceIntegrityCheck.createMany({
        data: integrityChecks,
        skipDuplicates: true,
      });
    }

    await this.prisma.auditLog.createMany({
      data: attempts.flatMap((attempt) => {
        const common = {
          actorUserId: attempt.input.userId,
          entityType: 'attendance_check_in',
          entityId: String(attempt.input.sessionId),
        };
        const resultAction =
          attempt.result === 'REJECTED'
            ? 'CHECK_IN_REJECTED'
            : 'CHECK_IN_RESULT';
        const resultMetadata = {
          status: attempt.result,
          reasons: attempt.reasons,
          distanceMeters: attempt.input.distanceToCenter,
        } as Prisma.InputJsonValue;
        return [
          {
            ...common,
            sourceKey: `${attempt.id}:requested`,
            action: 'CHECK_IN_REQUESTED',
            metadata: {
              latitude: attempt.input.latitude,
              longitude: attempt.input.longitude,
              accuracy: attempt.input.accuracy,
              deviceId: attempt.input.deviceId,
            } as Prisma.InputJsonValue,
          },
          {
            ...common,
            sourceKey: `${attempt.id}:outcome`,
            action: resultAction,
            metadata: resultMetadata,
          },
        ];
      }),
      skipDuplicates: true,
    });
  }
}
