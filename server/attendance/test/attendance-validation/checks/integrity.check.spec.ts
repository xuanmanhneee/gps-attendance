import { createHash } from 'node:crypto';
import { serializeCheckInIntegrityInput } from '@gps-attendance/shared';

import { IntegrityCheck } from '../../../src/attendance-validation/checks/integrity.check';

const input = {
  session: { id: 7 },
  location: {
    latitude: 10,
    longitude: 106,
    accuracy: 5,
    timestamp: 1_700_000_000_000,
    isMockLocation: false,
  },
  device: {
    deviceId: 'device-1',
    platform: 'android' as const,
    model: 'Pixel',
  },
  integrity: { integrityToken: 'token' },
};

describe('IntegrityCheck', () => {
  it('binds verification to the exact check-in request', async () => {
    const verifier = {
      isEnabled: () => true,
      verify: jest.fn().mockResolvedValue(true),
    };
    const check = new IntegrityCheck(verifier);

    await expect(check.evaluate(input as never)).resolves.toEqual({
      coefficient: 1,
    });
    expect(verifier.verify).toHaveBeenCalledWith({
      token: 'token',
      expectedRequestHash: createHash('sha256')
        .update(
          serializeCheckInIntegrityInput({
            sessionId: 7,
            location: input.location,
            device: input.device,
          }),
        )
        .digest('hex'),
    });
  });

  it('does not call the verifier when the client has no token', async () => {
    const verifier = { isEnabled: () => true, verify: jest.fn() };
    const check = new IntegrityCheck(verifier);

    await expect(
      check.evaluate({
        ...input,
        integrity: { integrityToken: null },
      } as never),
    ).resolves.toEqual({ coefficient: 0 });
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('keeps the rollout fallback while backend verification is disabled', async () => {
    const verifier = { isEnabled: () => false, verify: jest.fn() };
    const check = new IntegrityCheck(verifier);

    await expect(check.evaluate(input as never)).resolves.toEqual({
      coefficient: 0.5,
    });
    expect(verifier.verify).not.toHaveBeenCalled();
  });
});
