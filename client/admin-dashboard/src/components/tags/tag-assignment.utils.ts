import type { DirectoryUser } from '../../types/tag';

export type AssignedRow = {
  userId: number;
  title: string;
  subtitle: string | null;
};

/** Dựng hàng hiển thị: ưu tiên fullname/code, fallback `ID {id}`. */
export const buildAssignedRows = (
  assignedUserIds: number[],
  directoryById: Map<number, DirectoryUser>,
  idFallback: (userId: number) => string,
): AssignedRow[] =>
  assignedUserIds.map((userId) => {
    const found = directoryById.get(userId);
    return {
      userId,
      title: found?.fullname || idFallback(userId),
      subtitle: found ? found.code : null,
    };
  });

export const buildAvailableUsers = (
  directory: DirectoryUser[],
  assignedUserIds: number[],
): DirectoryUser[] => {
  const assigned = new Set(assignedUserIds);
  return directory.filter((user) => !assigned.has(user.id));
};
