import { Injectable, NotFoundException } from '@nestjs/common';
import { DeviceTrustStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { UpdateDeviceTrustDto } from './dto/update-device-trust.dto';

@Injectable()
export class DeviceTrustService {
  constructor(private readonly prisma: PrismaService) {}

  async updateTrust(deviceId: number, actorUserId: number, dto: UpdateDeviceTrustDto) {
    const existing = await this.prisma.registeredDevice.findUnique({
      where: { id: deviceId },
      include: { user: { select: { code: true, fullname: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thiết bị đã đăng ký');
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.registeredDevice.update({
        where: { id: deviceId },
        data: {
          trustStatus: dto.trustStatus,
          blockedAt: dto.trustStatus === DeviceTrustStatus.BLOCKED ? new Date() : null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'DEVICE_TRUST_UPDATED',
          entityType: 'RegisteredDevice',
          entityId: String(deviceId),
          metadata: {
            userCode: existing.user.code,
            deviceId: existing.deviceId,
            before: existing.trustStatus,
            after: updated.trustStatus,
            note: dto.note ?? null,
          },
        },
      });

      return {
        id: updated.id,
        userCode: existing.user.code,
        userFullname: existing.user.fullname,
        deviceId: updated.deviceId,
        platform: updated.platform,
        model: updated.model,
        trustStatus: updated.trustStatus,
        blockedAt: updated.blockedAt?.toISOString() ?? null,
      };
    });
  }
}
