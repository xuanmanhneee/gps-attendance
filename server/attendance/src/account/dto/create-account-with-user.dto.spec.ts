import { validateSync } from 'class-validator';

import { CreateAccountWithUserDto } from './create-account-with-user.dto';

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
  it.each(['lecturer', 'student'])('accepts %s', (role) => {
    expect(validateRole(role)).toBeUndefined();
  });

  it('rejects admin', () => {
    expect(validateRole('admin')?.constraints?.isIn).toBeDefined();
  });
});
