import { HttpException } from '@nestjs/common';

import { ConcurrencyGate } from '../../src/common/concurrency/concurrency-gate';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe('ConcurrencyGate', () => {
  it('không bao giờ chạy quá maxConcurrent tác vụ cùng lúc', async () => {
    const gate = new ConcurrencyGate(3, 100);
    let running = 0;
    let peak = 0;
    const task = async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
    };
    await Promise.all(Array.from({ length: 50 }, () => gate.run(task)));
    expect(peak).toBe(3);
    expect(running).toBe(0);
  });

  it('chạy theo thứ tự đến trước, phục vụ trước (FIFO)', async () => {
    const gate = new ConcurrencyGate(1, 10);
    const first = deferred();
    const order: number[] = [];
    const a = gate.run(async () => {
      await first.promise;
      order.push(1);
    });
    const b = gate.run(async () => void order.push(2));
    const c = gate.run(async () => void order.push(3));
    first.resolve();
    await Promise.all([a, b, c]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('từ chối nhanh bằng 503 khi hàng chờ đầy', async () => {
    const gate = new ConcurrencyGate(1, 1);
    const hold = deferred();
    const running = gate.run(() => hold.promise);
    const queued = gate.run(async () => 'ok');
    const error = await gate.run(async () => 'x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(503);
    expect(gate.queueLength).toBe(1);
    hold.resolve();
    await expect(queued).resolves.toBe('ok');
    await running;
  });

  it('trả slot khi tác vụ ném lỗi, không làm kẹt hàng chờ', async () => {
    const gate = new ConcurrencyGate(1, 5);
    const failing = gate.run(async () => {
      throw new Error('boom');
    });
    const after = gate.run(async () => 'still-works');
    await expect(failing).rejects.toThrow('boom');
    await expect(after).resolves.toBe('still-works');
  });

  it('từ chối cấu hình không hợp lệ', () => {
    expect(() => new ConcurrencyGate(0, 1)).toThrow();
  });
});
