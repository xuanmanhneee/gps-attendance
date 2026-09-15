// prisma-tag.repository.ts
import { Injectable } from '@nestjs/common';
import { Tag, CreateTagRecord, UpdateTagRecord } from '../tag.model';
import { ITagRepository } from '../tag.repository';
import { TagModel as PrismaTag } from '#prisma/generated/models';
import { PrismaService } from '#prisma/prisma.service';

@Injectable()
export class PrismaTagRepository implements ITagRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateTagRecord): Promise<Tag> {
    const record = await this.prisma.tag.create({
      data: {
        name: input.name,
        ownerId: input.ownerId,
      },
    });
    return this.toDomain(record);
  }

  async update(id: number, input: UpdateTagRecord): Promise<Tag> {
    const record = await this.prisma.tag.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
      },
    });
    return this.toDomain(record);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.tag.delete({ where: { id } });
  }

  async findById(id: number): Promise<Tag | null> {
    const record = await this.prisma.tag.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByOwner(ownerId: number): Promise<Tag[]> {
    const records = await this.prisma.tag.findMany({ where: { ownerId } });
    return records.map((r) => this.toDomain(r));
  }

  // ---- Quan hệ n-n qua bảng join UserTag ----

  async assignToUser(tagId: number, userId: number): Promise<void> {
    await this.prisma.userTag.upsert({
      where: { tagId_userId: { tagId, userId } },
      create: { tagId, userId },
      update: {}, // đã tồn tại thì không làm gì, tránh lỗi unique constraint
    });
  }

  async unassignFromUser(tagId: number, userId: number): Promise<void> {
    await this.prisma.userTag.deleteMany({
      where: { tagId, userId },
    });
    // dùng deleteMany thay vì delete để không throw nếu record không tồn tại
  }

  async findUserIdsByTag(tagId: number): Promise<number[]> {
    const rows = await this.prisma.userTag.findMany({
      where: { tagId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async findTagsByUser(userId: number): Promise<Tag[]> {
    const rows = await this.prisma.userTag.findMany({
      where: { userId },
      include: { tag: true },
    });
    return rows.map((r) => this.toDomain(r.tag));
  }

  // ---- Mapper: Prisma type -> Domain type ----
  private toDomain(record: PrismaTag): Tag {
    return {
      id: record.id,
      name: record.name,
      ownerId: record.ownerId,
      createdAt: record.createdAt,
    };
  }
}
