export interface Unit {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
}

export interface CreateUnitInput {
  name: string;
  parentId?: number | null;
}

export interface UpdateUnitInput {
  name?: string;
  parentId?: number | null;
}

export interface AssignUsersInput {
  userIds: number[];
}
