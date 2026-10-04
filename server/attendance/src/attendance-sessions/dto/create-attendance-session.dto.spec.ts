import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAttendanceSessionDto } from './create-attendance-session.dto';

describe('CreateAttendanceSessionDto participantCriteria', () => {
  const validSession = {
    title: 'Session test',
    latitude: 11.95,
    longitude: 108.44,
    radius: 50,
    openAt: '2026-10-02T10:00:00.000Z',
    closeAt: '2026-10-02T11:00:00.000Z',
  };

  it('validates nested filters and preserves the legacy codeFilter.addCodes payload', async () => {
    const dto = plainToInstance(CreateAttendanceSessionDto, {
      ...validSession,
      participantCriteria: {
        codeFilter: { addCodes: ['2312686', '2312716'] },
      },
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors).toHaveLength(0);
    expect(dto.participantCriteria.codeFilter?.addCodes).toEqual([
      '2312686',
      '2312716',
    ]);
  });

  it('rejects values with the wrong nested type', async () => {
    const dto = plainToInstance(CreateAttendanceSessionDto, {
      ...validSession,
      participantCriteria: {
        codeFilter: { include: [2312686] },
      },
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors).not.toHaveLength(0);
  });
});
