// job-scheduler.interface.ts
export interface IJobScheduler {
  /**
   * Đăng ký handler xử lý cho 1 loại job. Gọi trong onModuleInit của module sở hữu domain logic.
   */
  onJob<T>(type: string, handler: (payload: T) => Promise<void>): void;

  /**
   * Lên lịch 1 job chạy tại thời điểm runAt.
   * id: optional, dùng để có thể cancel/replace job sau này (vd session bị sửa closeAt).
   */
  schedule<T>(
    type: string,
    runAt: Date,
    payload: T,
    id?: string,
  ): Promise<void>;

  /**
   * Huỷ 1 job đã đăng ký trước đó, theo id đã truyền lúc schedule.
   * Cần thiết cho case: session bị xoá hoặc đổi closeAt trước khi job chạy.
   */
  cancel(id: string): Promise<void>;
}
