import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeviceTrustStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { UpdateDeviceTrustDto } from './dto/update-device-trust.dto';
import { ReplaceDeviceDto } from './dto/replace-device.dto';

@Injectable()
export class DeviceTrustService {
  constructor(private readonly prisma: PrismaService) {}

  async listDevices(options: {
    search?: string;
    trustStatus?: DeviceTrustStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.RegisteredDeviceWhereInput = {};

    if (options.trustStatus) {
      where.trustStatus = options.trustStatus;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { deviceId: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { user: { code: { contains: q, mode: 'insensitive' } } },
        { user: { fullname: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.registeredDevice.count({ where }),
      this.prisma.registeredDevice.findMany({
        where,
        include: {
          user: {
            select: { id: true, code: true, fullname: true, email: true },
          },
        },
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        userCode: item.user.code,
        userFullname: item.user.fullname,
        userEmail: item.user.email,
        deviceId: item.deviceId,
        platform: item.platform,
        model: item.model,
        trustStatus: item.trustStatus,
        firstSeenAt: item.firstSeenAt.toISOString(),
        lastSeenAt: item.lastSeenAt.toISOString(),
        blockedAt: item.blockedAt?.toISOString() ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

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

  /**
   * Cập nhật / thay thế thiết bị khi sinh viên đổi điện thoại mới
   */
  async replaceDevice(deviceId: number, actorUserId: number, dto: ReplaceDeviceDto) {
    const existing = await this.prisma.registeredDevice.findUnique({
      where: { id: deviceId },
      include: { user: { select: { id: true, code: true, fullname: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thiết bị để cập nhật');
    }

    const newTrustStatus = dto.trustStatus ?? DeviceTrustStatus.TRUSTED;

    return this.prisma.$transaction(async (transaction) => {
      // Nếu có truyền deviceId mới, kiểm tra xem đã bị trùng với deviceId khác của cùng user chưa
      if (dto.newDeviceId && dto.newDeviceId !== existing.deviceId) {
        const conflict = await transaction.registeredDevice.findUnique({
          where: {
            userId_deviceId: {
              userId: existing.userId,
              deviceId: dto.newDeviceId,
            },
          },
        });
        if (conflict && conflict.id !== deviceId) {
          // Xóa bản ghi cũ để gộp vào bản ghi mới
          await transaction.registeredDevice.delete({ where: { id: conflict.id } });
        }
      }

      const updated = await transaction.registeredDevice.update({
        where: { id: deviceId },
        data: {
          deviceId: dto.newDeviceId?.trim() || existing.deviceId,
          model: dto.newModel?.trim() || existing.model,
          platform: dto.newPlatform?.trim() || existing.platform,
          trustStatus: newTrustStatus,
          blockedAt: newTrustStatus === DeviceTrustStatus.BLOCKED ? new Date() : null,
          lastSeenAt: new Date(),
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'DEVICE_REPLACED_FOR_STUDENT',
          entityType: 'RegisteredDevice',
          entityId: String(deviceId),
          metadata: {
            userCode: existing.user.code,
            oldDeviceId: existing.deviceId,
            oldModel: existing.model,
            newDeviceId: updated.deviceId,
            newModel: updated.model,
            trustStatus: updated.trustStatus,
            note: dto.note ?? 'Đổi điện thoại cho sinh viên',
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

  /**
   * Đặt lại (reset/xóa) thiết bị để sinh viên tự do liên kết điện thoại mới trong lần điểm danh tới
   */
  async resetDevice(deviceId: number, actorUserId: number, note?: string) {
    const existing = await this.prisma.registeredDevice.findUnique({
      where: { id: deviceId },
      include: { user: { select: { code: true, fullname: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thiết bị cần đặt lại');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.registeredDevice.delete({
        where: { id: deviceId },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'DEVICE_RESET_ALLOWED_CHANGE',
          entityType: 'RegisteredDevice',
          entityId: String(deviceId),
          metadata: {
            userCode: existing.user.code,
            userFullname: existing.user.fullname,
            oldDeviceId: existing.deviceId,
            oldModel: existing.model,
            note: note ?? 'Đặt lại thiết bị cho phép sinh viên liên kết máy mới',
          },
        },
      });

      return {
        message: 'Đã đặt lại thiết bị thành công. Sinh viên có thể liên kết điện thoại mới trong lần điểm danh tới.',
        userCode: existing.user.code,
        userFullname: existing.user.fullname,
      };
    });
  }
}
