import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../common/database/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRawUnsafe: jest.Mock };
  let memoryUsage: jest.SpyInstance;

  beforeEach(async () => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    memoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 1024 * 1024,
      heapTotal: 1024 * 1024,
      heapUsed: 512 * 1024,
      external: 0,
      arrayBuffers: 0,
    });
  });

  afterEach(() => {
    memoryUsage.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report ok status when database is connected', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ '?column?': 1 }]) // SELECT 1
      .mockResolvedValueOnce([{ count: '5' }]); // migration count

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database.status).toBe('connected');
    expect(result.migrations.status).toBe('applied');
    expect(result.migrations.appliedCount).toBe(5);
    expect(result.system.memory.rssMb).toBeGreaterThan(0);
    expect(result.system.cpu.cores).toBeGreaterThan(0);
  });

  it('should report error status when database fails', async () => {
    prisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('Connection timeout'));

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.database.status).toBe('error');
    expect(result.database.error).toContain('Connection timeout');
  });
});
