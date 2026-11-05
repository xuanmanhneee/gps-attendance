import { validateSync } from 'class-validator';

import { CreateAccountWithUserDto } from '../../../src/account/dto/create-account-with-user.dto';

const validateRole = (role: string) => {
  const dto = Object.assign(new CreateAccountWithUserDto(), {
    code: 'U001',
    fullname: 'Test User',
    role,
    unitId: 1,
    username: 'test-user',
    password: 'password123',
  });

  return validateSync(dto).find((error) => error.property === 'role');
};

describe('CreateAccountWithUserDto.role', () => {
  it.each(['organizer', 'participant'])('accepts %s', (role) => {
    expect(validateRole(role)).toBeUndefined();
  });

  it('rejects admin', () => {
    expect(validateRole('admin')?.constraints?.isIn).toBeDefined();
  });

  it.each(['lecturer', 'student'])('rejects legacy role %s', (role) => {
    expect(validateRole(role)?.constraints?.isIn).toBeDefined();
  });
});
