import type { ITransactionContext } from '#common/unit-of-work/unit-of-work.interface';

export interface IRefreshSessionRepository {
  create(accountId: number, tokenHash: string, expiresAt: Date): Promise<void>;

  /** Đánh dấu thu hồi token còn hiệu lực; không làm gì nếu không tìm thấy. */
  revoke(tokenHash: string): Promise<void>;

  rotate(
    currentHash: string,
    nextHash: string,
    nextExpiresAt: Date,
    ctx: ITransactionContext,
  ): Promise<number | undefined>;
}
