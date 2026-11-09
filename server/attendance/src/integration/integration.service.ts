import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import { AttendanceRecordsService } from '#attendance-record/attendance-records.service';
import { AttendanceSessionsService } from '#attendance-sessions/attendance-sessions.service';
import { UnitService } from '#units/units.service';
import { UsersService } from '#user/users.service';
import type { AttendanceSession } from '#attendance-sessions/attendance-session.model';

import type {
  CreateIntegrationSessionDto,
  IntegrationCourseDto,
  IntegrationUserDto,
  IntegrationUnitDto,
  SyncIntegrationUsersDto,
} from './dto/integration.dto';
import type { IIntegrationSessionLinkRepository } from './integration-session-link.repository';
import { INTEGRATION_SESSION_LINK_REPOSITORY } from './integration-session-link.token';
import type { IntegrationSessionLink } from './integration-session-link.model';
import { TagService } from '../tags/tag.service';
import { AccountService } from '../account/account.service';

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  failed: { key: string; code: string; message: string }[];
}

@Injectable()
export class IntegrationService {
  constructor(
    private readonly units: UnitService,
    private readonly users: UsersService,
    private readonly sessions: AttendanceSessionsService,
    private readonly records: AttendanceRecordsService,
    private readonly tags: TagService,
    private readonly accounts: AccountService,
    @Inject(INTEGRATION_SESSION_LINK_REPOSITORY)
    private readonly sessionLinks: IIntegrationSessionLinkRepository,
  ) {}

  async syncUnits(input: IntegrationUnitDto[]): Promise<SyncResult> {
    const result: SyncResult = this.emptyResult();
    const pending = new Map(
      input.map((unit) => [unit.externalCode.trim(), unit]),
    );

    while (pending.size > 0) {
      let progressed = false;
      for (const [code, item] of pending) {
        const parentCode = item.parentCode?.trim() || null;
        const parent = parentCode
          ? await this.units.findByExternalCode(parentCode)
          : null;
        if (parentCode && !parent) continue;

        const existing = await this.units.findByExternalCode(code);
        if (!existing) {
          await this.units.create({
            externalCode: code,
            name: item.name.trim(),
            parentId: parent?.id ?? null,
          });
          result.created++;
        } else if (
          existing.name !== item.name.trim() ||
          existing.parentId !== (parent?.id ?? null)
        ) {
          await this.units.update(existing.id, {
            name: item.name.trim(),
            parentId: parent?.id ?? null,
          });
          result.updated++;
        } else {
          result.unchanged++;
        }

        pending.delete(code);
        progressed = true;
      }

      if (!progressed) {
        for (const [code, item] of pending) {
          result.failed.push({
            key: code,
            code: 'INTEGRATION_PARENT_UNIT_NOT_FOUND',
            message: `Không tìm thấy unit cha ${item.parentCode}`,
          });
        }
        break;
      }
    }
    return result;
  }

  async syncUsers(dto: SyncIntegrationUsersDto): Promise<SyncResult> {
    const result = this.emptyResult();
    for (const input of dto.users) {
      const code = input.code.trim();
      const unit = await this.units.findByExternalCode(input.unitCode.trim());
      if (!unit) {
        result.failed.push({
          key: code,
          code: 'INTEGRATION_UNIT_NOT_FOUND',
          message: `Không tìm thấy unit ${input.unitCode}`,
        });
        continue;
      }

      const outcome = await this.users.upsertByCode({
        code,
        fullname: input.fullname.trim(),
        role: input.role,
        unitId: unit.id,
      });
      result[outcome]++;
    }
    return result;
  }

  async syncCourses(courses: IntegrationCourseDto[]): Promise<SyncResult> {
    const result = this.emptyResult();
    for (const course of courses) {
      const lecturer = await this.users.findByCode(course.lecturerCode.trim());
      if (!lecturer || lecturer.role !== 'organizer') {
        result.failed.push({ key: course.externalCode, code: 'INTEGRATION_LECTURER_NOT_FOUND', message: 'Không tìm thấy lecturer organizer' });
        continue;
      }
      const tagName = `${course.externalCode.trim()} · ${course.name.trim()}`;
      const tags = await this.tags.findByOwner(lecturer.id);
      let tag = tags.find((candidate) => candidate.name === tagName);
      if (!tag) {
        tag = await this.tags.create(tagName, lecturer.id);
        result.created++;
      }
      const students = await this.users.findByCodes(course.studentCodes.map((code) => code.trim()));
      for (const student of students) {
        if (student.role === 'participant') await this.tags.assignToUser(tag.id, student.id, lecturer.id);
      }
      if (tag && tags.some((candidate) => candidate.id === tag?.id)) result.unchanged++;
    }
    return result;
  }

  async syncAccounts(users: IntegrationUserDto[]): Promise<SyncResult> {
    const result = this.emptyResult();
    for (const input of users) {
      const user = await this.users.findByCode(input.code.trim());
      if (!user) {
        result.failed.push({ key: input.code, code: 'INTEGRATION_USER_NOT_FOUND', message: 'User phải được sync trước khi provision Account' });
        continue;
      }
      const outcome = await this.accounts.provisionForUser(user.id, input.code.trim().toLowerCase());
      result[outcome.created ? 'created' : 'unchanged']++;
    }
    return result;
  }

  async createSession(
    dto: CreateIntegrationSessionDto,
  ): Promise<{ created: boolean; externalId: string }> {
    const normalized = this.normalizeSession(dto);
    if (
      !normalized.externalId ||
      !normalized.lecturerCode ||
      normalized.studentCodes.some((code) => !code) ||
      new Set(normalized.studentCodes).size !== normalized.studentCodes.length
    ) {
      throw new UnprocessableEntityException({
        code: 'INTEGRATION_VALIDATION_FAILED',
        message: 'externalId và các mã người dùng phải khác rỗng, không trùng',
      });
    }
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');

    const existing = await this.sessionLinks.findByExternalId(
      normalized.externalId,
    );
    if (existing) return this.resolveExistingLink(existing, fingerprint);

    const codes = [normalized.lecturerCode, ...normalized.studentCodes];
    const users = await this.users.findByCodes(codes);
    const byCode = new Map(users.map((user) => [user.code, user]));
    const unknownCodes = codes.filter((code) => !byCode.has(code));
    const lecturer = byCode.get(normalized.lecturerCode);
    const invalidParticipants = normalized.studentCodes.filter(
      (code) => byCode.get(code)?.role !== 'participant',
    );

    if (
      unknownCodes.length > 0 ||
      lecturer?.role !== 'organizer' ||
      invalidParticipants.length > 0
    ) {
      throw new UnprocessableEntityException({
        code: 'INTEGRATION_UNKNOWN_CODES',
        message: 'Lecturer hoặc danh sách participant không hợp lệ',
        unknownCodes,
      });
    }

    let link: IntegrationSessionLink;
    try {
      link = await this.sessionLinks.create({
        externalId: normalized.externalId,
        requestFingerprint: fingerprint,
      });
    } catch (error) {
      if (!this.isUniqueConstraint(error)) throw error;
      const concurrent = await this.sessionLinks.findByExternalId(
        normalized.externalId,
      );
      if (!concurrent) throw error;
      return this.resolveExistingLink(concurrent, fingerprint);
    }

    try {
      const session = await this.sessions.create(
        {
          title: normalized.title,
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          radius: normalized.radius,
          openAt: normalized.openAt,
          closeAt: normalized.closeAt,
          participantCriteria: {
            codeFilter: { include: normalized.studentCodes, exclude: [] },
          },
        },
        lecturer.id,
      );
      await this.sessionLinks.attachSession(link.id, session.id);
      return { created: true, externalId: normalized.externalId };
    } catch (error) {
      await this.sessionLinks.delete(link.id);
      throw error;
    }
  }

  async getSession(externalId: string) {
    const session = await this.requireSession(externalId);
    const criteria = await this.sessions.getPendingCriteria(session.id);
    const participantCount =
      criteria?.codeFilter?.include?.length ??
      (await this.records.findBySessionId(session.id)).length;
    return this.toSession(externalId, session, participantCount);
  }

  async getRecords(externalId: string) {
    const session = await this.requireSession(externalId);
    const records = await this.records.findBySessionId(session.id);
    const users = await this.users.findByIds(
      records.map((record) => record.userId),
    );
    const byId = new Map(users.map((user) => [user.id, user]));
    return {
      externalId,
      finalized: this.isFinalized(session),
      records: records.map((record) => {
        const user = byId.get(record.userId);
        if (!user) throw new Error(`User ${record.userId} not found`);
        return {
          code: user.code,
          fullname: user.fullname,
          status: record.status,
          checkedInAt: record.checkedInAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async cancelSession(externalId: string) {
    const session = await this.requireSession(externalId);
    const current = await this.getSession(externalId);
    const cancelled = await this.sessions.cancel(session.id, session.createdBy);
    return this.toSession(externalId, cancelled, current.participantCount);
  }

  private async requireSession(externalId: string): Promise<AttendanceSession> {
    const link = await this.sessionLinks.findByExternalId(externalId);
    if (!link || !link.attendanceSessionId) {
      throw new NotFoundException({
        code: 'INTEGRATION_SESSION_NOT_FOUND',
        message: `Không tìm thấy session ${externalId}`,
      });
    }
    const session = await this.sessions.findById(link.attendanceSessionId);
    if (!session) {
      throw new Error(
        `Attendance session ${link.attendanceSessionId} not found`,
      );
    }
    return session;
  }

  private toSession(
    externalId: string,
    session: AttendanceSession,
    participantCount: number,
  ) {
    return {
      externalId,
      title: session.title,
      status: session.status,
      openAt: session.openAt.toISOString(),
      closeAt: session.closeAt.toISOString(),
      participantCount,
      finalized: this.isFinalized(session),
    };
  }

  private isFinalized(session: AttendanceSession): boolean {
    return session.finalizedAt != null;
  }

  private resolveExistingLink(
    link: {
      externalId: string;
      requestFingerprint: string;
      attendanceSessionId: number | null;
    },
    fingerprint: string,
  ) {
    if (link.requestFingerprint !== fingerprint) {
      throw new ConflictException({
        code: 'INTEGRATION_EXTERNAL_ID_CONFLICT',
        message: 'externalId đã tồn tại với nội dung khác',
      });
    }
    if (!link.attendanceSessionId) {
      // shortcut: a process crash between creating the link and the session leaves a retryable pending link; add stale-link recovery when integration is production-critical.
      throw new ServiceUnavailableException({
        code: 'INTEGRATION_SESSION_CREATION_PENDING',
        message: 'Session đang được tạo, hãy thử lại sau',
      });
    }
    return { created: false, externalId: link.externalId };
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }

  private normalizeSession(dto: CreateIntegrationSessionDto) {
    return {
      externalId: dto.externalId.trim(),
      lecturerCode: dto.lecturerCode.trim(),
      title: dto.title.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      radius: dto.radius,
      openAt: new Date(dto.openAt).toISOString(),
      closeAt: new Date(dto.closeAt).toISOString(),
      studentCodes: [...dto.studentCodes.map((code) => code.trim())].sort(),
    };
  }

  private emptyResult(): SyncResult {
    return { created: 0, updated: 0, unchanged: 0, failed: [] };
  }
}
