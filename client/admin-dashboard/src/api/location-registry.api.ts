import { httpClient } from './http';

export interface LocationRegistryBuilding {
  id: number;
  campus: { code: string; name: string };
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number | null;
  gpsAccuracyThreshold: number | null;
  lecturerValidationRadius: number | null;
  type: 'BUILDING' | 'FACILITY';
  verified: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  roomCount: number;
}

export interface LocationRegistryCampus {
  id: number;
  code: string;
  name: string;
}

export interface CreateLocationRegistryBuilding {
  campusId: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface UpdateLocationRegistryBuilding {
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  gpsAccuracyThreshold?: number;
  lecturerValidationRadius?: number;
  verified?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface LocationRegistryRoom {
  id: number;
  code: string;
  name: string;
  floor: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  building: {
    id: number;
    code: string;
    name: string;
    type: 'BUILDING' | 'FACILITY';
    verified: boolean;
  } | null;
}

export const locationRegistryApi = {
  listCampuses() {
    return httpClient.get<LocationRegistryCampus[]>('/v0/location-registry/campuses');
  },

  listBuildings(includeInactive = true) {
    return httpClient.get<LocationRegistryBuilding[]>(
      `/v0/location-registry/buildings?includeInactive=${includeInactive}`,
    );
  },

  createBuilding(input: CreateLocationRegistryBuilding) {
    return httpClient.post<LocationRegistryBuilding>(
      '/v0/location-registry/buildings',
      input,
    );
  },

  updateBuilding(id: number, update: UpdateLocationRegistryBuilding) {
    return httpClient.patch<LocationRegistryBuilding>(
      `/v0/location-registry/buildings/${id}`,
      update,
    );
  },

  listRooms(includeInactive = true) {
    return httpClient.get<LocationRegistryRoom[]>(
      `/v0/location-registry/rooms?includeInactive=${includeInactive}`,
    );
  },

  createRoom(input: { code: string; name: string; buildingId: number; floor?: string }) {
    return httpClient.post<LocationRegistryRoom>('/v0/location-registry/rooms', input);
  },

  updateRoom(
    id: number,
    update: { buildingId?: number; floor?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ) {
    return httpClient.patch<LocationRegistryRoom>(
      `/v0/location-registry/rooms/${id}`,
      update,
    );
  },
};
