// scripts/test-scheduler.ts
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { JobSchedulerModule } from '../src/job-scheduler/job-scheduler.module';
import { LoggingModule } from '../src/common/logging/logging.module'; // đúng path thật của bạn
import { JOB_SCHEDULER } from '../src/job-scheduler/job-scheduler.token';
import { IJobScheduler } from '../src/job-scheduler/job-scheduler.interface';

@Module({
  imports: [LoggingModule, JobSchedulerModule],
})
class TestModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(TestModule);
  const scheduler = app.get<IJobScheduler>(JOB_SCHEDULER);

  scheduler.onJob<{ msg: string }>(
    'test:hello',
    async (payload: { msg: string }) => {
      console.log(`[${new Date().toISOString()}] Job chạy:`, payload.msg);
    },
  );

  await scheduler.schedule('test:hello', new Date(Date.now() - 5000), {
    msg: 'job quá khứ',
  });
  await scheduler.schedule('test:hello', new Date(Date.now() + 20000), {
    msg: 'job 20s sau',
  });
  await scheduler.schedule(
    'test:hello',
    new Date(Date.now() + 30000),
    { msg: 'job bị cancel' },
    'cancel-me',
  );
  await scheduler.cancel('cancel-me');
}

main();
