export interface Unit {
  id: number;
  externalCode: string | null;
  name: string;
  parentId: number | null;
  level: number;
}

export interface CreateUnitInput {
  externalCode?: string | null;
  name: string;
  parentId?: number | null;
}

export interface UpdateUnitInput {
  externalCode?: string | null;
  name?: string;
  parentId?: number | null;
}

export interface AssignUsersInput {
  userIds: number[];
}
