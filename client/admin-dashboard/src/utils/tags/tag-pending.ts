/**
 * Theo dõi trạng thái pending của assignment theo từng user ID.
 *
 * Dùng `Set` thay cho `number | null` để nhiều row có thể pending đồng thời mà
 * không ghi đè loading state của nhau; mỗi request kết thúc chỉ xóa đúng user
 * ID của nó.
 */
export const withPendingUser = (
  pendingUserIds: ReadonlySet<number>,
  userId: number,
  isPending: boolean,
): Set<number> => {
  const next = new Set(pendingUserIds);

  if (isPending) {
    next.add(userId);
  } else {
    next.delete(userId);
  }

  return next;
};

/**
 * Single-flight có chủ đích cho assignment:
 *
 * Chỉ cho phép MỘT mutation assignment chạy tại một thời điểm. UI cũng disable
 * toàn bộ control assign/unassign khi `pendingUserIds` không rỗng (xem
 * `TagUserAssignmentPanel`), nhờ vậy hai request refresh chồng nhau không thể
 * ghi ra danh sách assignment lệch nhau.
 */
export const canStartAssignmentMutation = (
  pendingUserIds: ReadonlySet<number>,
): boolean => pendingUserIds.size === 0;

