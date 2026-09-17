import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ITagRepository } from './tag.repository';
import { Tag } from './tag.model';

export const TAG_REPOSITORY = Symbol('TAG_REPOSITORY');

@Injectable()
export class TagService {
  constructor(
    @Inject(TAG_REPOSITORY)
    private readonly tagRepository: ITagRepository,
  ) {}

  create(name: string, ownerId: number): Promise<Tag> {
    return this.tagRepository.create({ name, ownerId });
  }

  async delete(id: number, requesterId: number): Promise<void> {
    const tag = await this.ensureOwnership(id, requesterId);

    await this.tagRepository.delete(tag.id);
  }

  findById(id: number): Promise<Tag | null> {
    return this.tagRepository.findById(id);
  }

  findByOwner(ownerId: number): Promise<Tag[]> {
    return this.tagRepository.findByOwner(ownerId);
  }

  async assignToUser(
    tagId: number,
    userId: number,
    requesterId: number,
  ): Promise<void> {
    await this.ensureOwnership(tagId, requesterId);

    await this.tagRepository.assignToUser(tagId, userId);
  }

  async unassignFromUser(
    tagId: number,
    userId: number,
    requesterId: number,
  ): Promise<void> {
    await this.ensureOwnership(tagId, requesterId);

    await this.tagRepository.unassignFromUser(tagId, userId);
  }

  /**
   * Query operation.
   * Authorization should be handled by the caller/business boundary.
   */
  async getUserIdsByTag(tagId: number, requesterId: number): Promise<number[]> {
    await this.ensureOwnership(tagId, requesterId);

    return this.tagRepository.findUserIdsByTag(tagId);
  }

  findUserIdsByTag(tagId: number): Promise<number[]> {
    return this.tagRepository.findUserIdsByTag(tagId);
  }

  findTagsByUser(userId: number): Promise<Tag[]> {
    return this.tagRepository.findTagsByUser(userId);
  }

  private async ensureOwnership(
    tagId: number,
    requesterId: number,
  ): Promise<Tag> {
    const tag = await this.tagRepository.findById(tagId);

    if (!tag) {
      throw new NotFoundException(`Tag ${tagId} not found`);
    }

    if (tag.ownerId !== requesterId) {
      throw new ForbiddenException('You do not own this tag');
    }

    return tag;
  }
}
