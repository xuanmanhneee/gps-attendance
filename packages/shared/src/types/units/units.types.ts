// shared/unit.contract.ts
export interface UnitResponse {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
}

export interface UnitTreeResponse {
  id: number;
  name: string;
  level: number;
  children: UnitTreeResponse[];
}

export interface CreateUnitRequest {
  name: string;
  parentId?: number | null;
}

export interface UpdateUnitRequest {
  name?: string;
  parentId?: number | null;
}

export interface AssignUsersRequest {
  unitId: number;
  userIds: number[];
}
