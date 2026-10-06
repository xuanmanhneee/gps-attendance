import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { CreateRegistryRoomDto } from './dto/create-registry-room.dto';
import { UpdateRegistryRoomDto } from './dto/update-registry-room.dto';
import { UpdateBuildingRegistryDto } from './dto/update-building-registry.dto';

@Injectable()
export class LocationRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async listBuildings(includeInactive = false) {
    const buildings = await this.prisma.building.findMany({
      where: includeInactive ? undefined : { status: 'ACTIVE' },
      include: {
        campus: { select: { code: true, name: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: [{ campus: { name: 'asc' } }, { code: 'asc' }],
    });

    return buildings.map((building) => ({
      id: building.id,
      campus: building.campus,
      code: building.code,
      name: building.name,
      latitude: Number(building.latitude),
      longitude: Number(building.longitude),
      geofenceRadius:
        building.geofenceRadius === null
          ? null
          : Number(building.geofenceRadius),
      gpsAccuracyThreshold:
        building.gpsAccuracyThreshold === null
          ? null
          : Number(building.gpsAccuracyThreshold),
      lecturerValidationRadius:
        building.lecturerValidationRadius === null
          ? null
          : Number(building.lecturerValidationRadius),
      type: building.type,
      verified: building.verified,
      status: building.status,
      roomCount: building._count.rooms,
    }));
  }

  async updateBuilding(
    buildingId: number,
    dto: UpdateBuildingRegistryDto,
    actorUserId: number,
  ) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });
    if (!building) {
      throw new NotFoundException('Không tìm thấy địa điểm trong registry');
    }

    const coordinatesChanged =
      (dto.latitude !== undefined && dto.latitude !== Number(building.latitude)) ||
      (dto.longitude !== undefined && dto.longitude !== Number(building.longitude));
    const radius = dto.geofenceRadius ?? building.geofenceRadius;
    const accuracyThreshold =
      dto.gpsAccuracyThreshold ?? building.gpsAccuracyThreshold;

    if (dto.verified === true && (radius === null || accuracyThreshold === null)) {
      throw new BadRequestException(
        'Cần cấu hình radius và GPS accuracy threshold trước khi xác minh địa điểm',
      );
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const after = await transaction.building.update({
        where: { id: buildingId },
        data: {
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.geofenceRadius !== undefined
            ? { geofenceRadius: dto.geofenceRadius }
            : {}),
          ...(dto.gpsAccuracyThreshold !== undefined
            ? { gpsAccuracyThreshold: dto.gpsAccuracyThreshold }
            : {}),
          ...(dto.lecturerValidationRadius !== undefined
            ? { lecturerValidationRadius: dto.lecturerValidationRadius }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(coordinatesChanged
            ? { verified: false }
            : dto.verified !== undefined
              ? { verified: dto.verified }
              : {}),
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'LOCATION_REGISTRY_UPDATED',
          entityType: 'Building',
          entityId: String(buildingId),
          metadata: {
            before: {
              latitude: Number(building.latitude),
              longitude: Number(building.longitude),
              geofenceRadius: building.geofenceRadius?.toNumber() ?? null,
              gpsAccuracyThreshold:
                building.gpsAccuracyThreshold?.toNumber() ?? null,
              verified: building.verified,
              status: building.status,
            },
            after: {
              latitude: Number(after.latitude),
              longitude: Number(after.longitude),
              geofenceRadius: after.geofenceRadius?.toNumber() ?? null,
              gpsAccuracyThreshold:
                after.gpsAccuracyThreshold?.toNumber() ?? null,
              verified: after.verified,
              status: after.status,
            },
          },
        },
      });

      return after;
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
      geofenceRadius:
        updated.geofenceRadius === null
          ? null
          : Number(updated.geofenceRadius),
      gpsAccuracyThreshold:
        updated.gpsAccuracyThreshold === null
          ? null
          : Number(updated.gpsAccuracyThreshold),
      lecturerValidationRadius:
        updated.lecturerValidationRadius === null
          ? null
          : Number(updated.lecturerValidationRadius),
      type: updated.type,
      verified: updated.verified,
      status: updated.status,
    };
  }

  async listRooms(includeInactive = false) {
    const rooms = await this.prisma.room.findMany({
      where: includeInactive ? undefined : { status: 'ACTIVE' },
      include: { registryBuilding: true },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { code: 'asc' }],
    });

    return rooms.map((room) => ({
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      building: room.registryBuilding
        ? {
            id: room.registryBuilding.id,
            code: room.registryBuilding.code,
            name: room.registryBuilding.name,
            type: room.registryBuilding.type,
            verified: room.registryBuilding.verified,
          }
        : null,
    }));
  }

  async createRoom(dto: CreateRegistryRoomDto, actorUserId: number) {
    await this.assertAssignableBuilding(dto.buildingId);
    return this.prisma.$transaction(async (transaction) => {
      const room = await transaction.room.create({
        data: {
          code: dto.code.trim(),
          name: dto.name.trim(),
          buildingId: dto.buildingId,
          floor: dto.floor?.trim() || null,
          building: null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'ROOM_CREATED',
          entityType: 'Room',
          entityId: String(room.id),
          metadata: {
            code: room.code,
            buildingId: room.buildingId,
            floor: room.floor,
          },
        },
      });
      return room;
    });
  }

  async updateRoom(
    roomId: number,
    dto: UpdateRegistryRoomDto,
    actorUserId: number,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Không tìm thấy phòng học');
    }
    if (dto.buildingId !== undefined) {
      await this.assertAssignableBuilding(dto.buildingId);
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.room.update({
        where: { id: roomId },
        data: {
          ...(dto.buildingId !== undefined ? { buildingId: dto.buildingId } : {}),
          ...(dto.floor !== undefined ? { floor: dto.floor.trim() || null } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'ROOM_LOCATION_UPDATED',
          entityType: 'Room',
          entityId: String(roomId),
          metadata: {
            before: {
              buildingId: room.buildingId,
              floor: room.floor,
              status: room.status,
            },
            after: {
              buildingId: updated.buildingId,
              floor: updated.floor,
              status: updated.status,
            },
          },
        },
      });
      return updated;
    });
  }

  private async assertAssignableBuilding(buildingId: number) {
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { type: true, status: true },
    });
    if (!building || building.type !== 'BUILDING' || building.status !== 'ACTIVE') {
      throw new BadRequestException('Phòng chỉ được liên kết với BUILDING đang hoạt động');
    }
  }
}
