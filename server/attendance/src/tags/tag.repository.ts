import { Tag, CreateTagRecord, UpdateTagRecord } from './tag.model';

export interface ITagRepository {
  create(input: CreateTagRecord): Promise<Tag>;
  update(id: number, input: UpdateTagRecord): Promise<Tag>;
  delete(id: number): Promise<void>;

  findById(id: number): Promise<Tag | null>;
  findByExternalCode(externalCode: string): Promise<Tag | null>;
  findByOwner(ownerId: number): Promise<Tag[]>;

  // Xử lý quan hệ n-n — không lộ UserTag ra interface
  assignToUser(tagId: number, userId: number): Promise<void>;
  unassignFromUser(tagId: number, userId: number): Promise<void>;
  replaceUserIds(tagId: number, userIds: number[]): Promise<void>;
  findUserIdsByTag(tagId: number): Promise<number[]>;
  findTagsByUser(userId: number): Promise<Tag[]>;
}
