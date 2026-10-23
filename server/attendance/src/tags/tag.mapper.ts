import type { TagResponse } from '@gps-attendance/shared';
import { Tag } from './tag.model';


export class TagMapper {
  static toResponse(tag: Tag): TagResponse {
    return {
      id: tag.id,
      name: tag.name,
      ownerId: tag.ownerId,
      createdAt: tag.createdAt.toISOString(),
    };
  }

  static toResponses(tags: Tag[]): TagResponse[] {
    return tags.map((tag) => this.toResponse(tag));
  }
}