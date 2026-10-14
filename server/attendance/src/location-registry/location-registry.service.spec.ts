import { NotFoundException } from '@nestjs/common';
import { LocationRegistryService } from './location-registry.service';

describe('LocationRegistryService building registration', () => {
  const building = {
    id: 4,
    campusId: 2,
    code: 'A33',
    name: 'Tòa nhà A33',
    latitude: 11.95,
    longitude: 108.44,
    campus: { code: 'DLU', name: 'Đại học Đà Lạt' },
    type: 'BUILDING',
    verified: false,
    status: 'ACTIVE',
  };
  const transaction = {
    building: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    campus: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new LocationRegistryService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.campus.findUnique.mockResolvedValue({ id: 2 });
    transaction.building.create.mockResolvedValue(building);
    transaction.auditLog.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    );
  });

  it('creates an unverified building without field-test settings and audits its coordinates', async () => {
    const result = await service.createBuilding(
      {
        campusId: 2,
        code: ' A33 ',
        name: ' Tòa nhà A33 ',
        latitude: 11.95,
        longitude: 108.44,
      },
      9,
    );

    expect(transaction.building.create).toHaveBeenCalledWith({
      data: {
        campusId: 2,
        code: 'A33',
        name: 'Tòa nhà A33',
        latitude: 11.95,
        longitude: 108.44,
        type: 'BUILDING',
        verified: false,
      },
      include: { campus: { select: { code: true, name: true } } },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 9,
        action: 'LOCATION_REGISTRY_CREATED',
        entityType: 'Building',
        entityId: '4',
        metadata: expect.objectContaining({
          before: null,
          after: expect.objectContaining({
            latitude: 11.95,
            longitude: 108.44,
            geofenceRadius: null,
            gpsAccuracyThreshold: null,
            verified: false,
          }),
        }),
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 4,
        code: 'A33',
        geofenceRadius: null,
        gpsAccuracyThreshold: null,
        verified: false,
      }),
    );
  });

  it('rejects registration for a campus that does not exist', async () => {
    prisma.campus.findUnique.mockResolvedValue(null);

    await expect(
      service.createBuilding(
        {
          campusId: 99,
          code: 'A33',
          name: 'Tòa nhà A33',
          latitude: 11.95,
          longitude: 108.44,
        },
        9,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
