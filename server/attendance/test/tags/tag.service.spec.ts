import type { ITagRepository } from '../../src/tags/tag.repository';
import { TagService } from '../../src/tags/tag.service';

describe('TagService', () => {
  it('updates the same external tag when its name or owner changes', async () => {
    const existing = {
      id: 10,
      externalCode: 'INT101',
      name: 'Tên cũ',
      ownerId: 2,
      createdAt: new Date(),
    };
    const repository = {
      findByExternalCode: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({
        ...existing,
        name: 'Tên mới',
        ownerId: 1,
      }),
    } as unknown as jest.Mocked<ITagRepository>;
    const service = new TagService(repository);

    await expect(
      service.syncExternal('INT101', 'Tên mới', 1),
    ).resolves.toMatchObject({ created: false, metadataChanged: true });
    expect(repository.update).toHaveBeenCalledWith(10, {
      name: 'Tên mới',
      ownerId: 1,
    });
  });

  it('replaces tag membership with the integration snapshot', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 10, ownerId: 1 }),
      findUserIdsByTag: jest.fn().mockResolvedValue([2, 3]),
      replaceUserIds: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITagRepository>;
    const service = new TagService(repository);

    await expect(service.replaceUsers(10, [3, 4], 1)).resolves.toBe(true);
    expect(repository.replaceUserIds).toHaveBeenCalledWith(10, [3, 4]);
  });
});
