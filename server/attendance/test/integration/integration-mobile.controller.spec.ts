import { UnauthorizedException } from '@nestjs/common';

import { IntegrationMobileController } from '../../src/integration/integration-mobile.controller';

describe('IntegrationMobileController', () => {
  const users = {
    findByCode: jest.fn(),
  };
  const sessions = {
    getMySessions: jest.fn().mockResolvedValue([]),
  };
  const checkIns = {
    checkIn: jest.fn().mockResolvedValue({ status: 'VALID' }),
  };
  const controller = new IntegrationMobileController(
    users as never,
    sessions as never,
    checkIns as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps a trusted external user code to the internal participant id', async () => {
    users.findByCode.mockResolvedValue({
      id: 42,
      code: 'SV001',
      fullname: 'Trần Minh Anh',
      role: 'participant',
    });

    await expect(controller.getSessions(' SV001 ')).resolves.toEqual([]);
    expect(sessions.getMySessions).toHaveBeenCalledWith(42);
  });

  it('rejects missing, unknown, or non-participant identities', async () => {
    users.findByCode.mockResolvedValue({ role: 'organizer' });

    await expect(controller.getProfile(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.getProfile('GV001')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
