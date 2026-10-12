import type { Tag } from '../../types/tag';

export const toError = (unknownError: unknown, fallback: Error): Error =>
  unknownError instanceof Error ? unknownError : fallback;

/**
 * Cập nhật danh sách tag bất biến (không mutate array state hiện tại).
 * Upsert theo `id` để gọi lại nhiều lần vẫn không tạo duplicate.
 */
export const applyTagCreated = (
  tags: readonly Tag[],
  created: Tag,
): Tag[] => [created, ...tags.filter((tag) => tag.id !== created.id)];

export const applyTagDeleted = (
  tags: readonly Tag[],
  tagId: number,
): Tag[] => tags.filter((tag) => tag.id !== tagId);

export type TagMutationOutcome<T> = {
  result: T;
  /**
   * Lỗi của bước refresh danh sách sau mutation.
   *
   * Mutation đã thành công nên lỗi này KHÔNG được coi là lỗi tạo/xóa; UI hiển
   * thị trạng thái refresh riêng kèm nút thử lại.
   */
  refreshError: Error | null;
};

/**
 * Chạy mutation rồi refresh danh sách và tách hai kết quả:
 *
 * - lỗi mutation (POST/DELETE) → throw để UI báo thất bại;
 * - lỗi refresh → trả trong `refreshError`, mutation vẫn được coi là thành công;
 * - `applyResult` nhận kết quả mutation để cập nhật local state bất biến trước
 *   khi refresh, nhờ vậy danh sách vẫn đúng khi refresh lỗi.
 */
export const runTagMutation = async <T>(
  mutation: () => Promise<T>,
  applyResult: (result: T) => void,
  refresh: () => Promise<Error | null>,
): Promise<TagMutationOutcome<T>> => {
  const result = await mutation();

  applyResult(result);

  const refreshError = await refresh();

  return { result, refreshError };
};
