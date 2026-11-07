import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@gps-attendance/shared';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (user?: { role: Role }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('nên cho phép truy cập khi route không yêu cầu roles cụ thể', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ role: 'participant' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên cho phép truy cập khi user có role khớp với requiredRoles', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'organizer']);
    const context = createMockContext({ role: 'organizer' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('nên từ chối khi user có role không nằm trong requiredRoles', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ role: 'participant' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('nên từ chối khi không có thông tin user trong request', () => {
    reflector.getAllAndOverride.mockReturnValue(['participant']);
    const context = createMockContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });
});
