import { Injectable } from '@nestjs/common';
import * as os from 'node:os';
import { PrismaService } from '../common/database/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: 'connected' | 'error';
    latencyMs: number;
    error?: string;
  };
  migrations: {
    status: 'applied' | 'unknown' | 'error';
    appliedCount: number;
    error?: string;
  };
  system: {
    memory: {
      rssMb: number;
      heapTotalMb: number;
      heapUsedMb: number;
      systemTotalMb: number;
      systemFreeMb: number;
      systemUsedPercentage: number;
    };
    cpu: {
      cores: number;
      loadAverage: number[];
      userCpuUsageMicroseconds: number;
      systemCpuUsageMicroseconds: number;
    };
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const startDb = Date.now();
    let dbStatus: 'connected' | 'error' = 'connected';
    let dbError: string | undefined;
    let latencyMs = 0;

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1;');
      latencyMs = Date.now() - startDb;
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err?.message || 'Database connection error';
      latencyMs = Date.now() - startDb;
    }

    let migrationStatus: 'applied' | 'unknown' | 'error' = 'applied';
    let appliedCount = 0;
    let migrationError: string | undefined;

    try {
      const migrations = await this.prisma.$queryRawUnsafe<any[]>(
        'SELECT count(*) as count FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL;',
      );
      if (migrations && migrations.length > 0) {
        appliedCount = Number(migrations[0].count);
      }
    } catch (err: any) {
      migrationStatus = 'unknown';
      migrationError = err?.message;
    }

    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const cpuUsage = process.cpuUsage();

    const heapUsedPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    const overallStatus: 'ok' | 'degraded' | 'error' =
      dbStatus === 'error'
        ? 'error'
        : latencyMs > 3000 || heapUsedPercent > 98
          ? 'degraded'
          : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        latencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      migrations: {
        status: migrationStatus,
        appliedCount,
        ...(migrationError ? { error: migrationError } : {}),
      },
      system: {
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          systemTotalMb: Math.round(totalMem / 1024 / 1024),
          systemFreeMb: Math.round(freeMem / 1024 / 1024),
          systemUsedPercentage: usedMemPercent,
        },
        cpu: {
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
          userCpuUsageMicroseconds: cpuUsage.user,
          systemCpuUsageMicroseconds: cpuUsage.system,
        },
      },
    };
  }
}
