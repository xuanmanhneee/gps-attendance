import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import DashboardSidebar from '../components/DashboardSidebar';
import { locationRegistryApi } from '../api/location-registry.api';
import type {
  LocationRegistryCampus,
  LocationRegistryBuilding,
  LocationRegistryRoom,
} from '../api/location-registry.api';
import { useAuth } from '../hooks/useAuth';

interface BuildingDraft {
  latitude: string;
  longitude: string;
  geofenceRadius: string;
  gpsAccuracyThreshold: string;
  lecturerValidationRadius: string;
  verified: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

const toDraft = (building: LocationRegistryBuilding): BuildingDraft => ({
  latitude: String(building.latitude),
  longitude: String(building.longitude),
  geofenceRadius: building.geofenceRadius?.toString() ?? '',
  gpsAccuracyThreshold: building.gpsAccuracyThreshold?.toString() ?? '',
  lecturerValidationRadius: building.lecturerValidationRadius?.toString() ?? '',
  verified: building.verified,
  status: building.status,
});

const LocationRegistryPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [campuses, setCampuses] = useState<LocationRegistryCampus[]>([]);
  const [buildings, setBuildings] = useState<LocationRegistryBuilding[]>([]);
  const [rooms, setRooms] = useState<LocationRegistryRoom[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BuildingDraft>>({});
  const [newBuildingCampusId, setNewBuildingCampusId] = useState('');
  const [newBuildingCode, setNewBuildingCode] = useState('');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingLatitude, setNewBuildingLatitude] = useState('');
  const [newBuildingLongitude, setNewBuildingLongitude] = useState('');
  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomFloor, setRoomFloor] = useState('');
  const [roomBuildingId, setRoomBuildingId] = useState(0);
  const [roomSavingId, setRoomSavingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBuildings = async () => {
    try {
      setError(null);
      const [campusData, data, roomData] = await Promise.all([
        locationRegistryApi.listCampuses(),
        locationRegistryApi.listBuildings(true),
        locationRegistryApi.listRooms(true),
      ]);
      setCampuses(campusData);
      setBuildings(data);
      setRooms(roomData);
      setNewBuildingCampusId((current) =>
        current || (campusData.length === 1 ? String(campusData[0].id) : ''),
      );
      setDrafts(Object.fromEntries(data.map((item) => [item.id, toDraft(item)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được Location Registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBuildings();
  }, []);

  const createBuilding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    const campusId = Number(newBuildingCampusId);
    const latitude = Number(newBuildingLatitude);
    const longitude = Number(newBuildingLongitude);
    if (
      !Number.isInteger(campusId) ||
      campusId <= 0 ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error('Chọn khuôn viên và nhập tọa độ latitude/longitude hợp lệ.');
      return;
    }

    try {
      setIsCreatingBuilding(true);
      await locationRegistryApi.createBuilding({
        campusId,
        code: newBuildingCode.trim(),
        name: newBuildingName.trim(),
        latitude,
        longitude,
      });
      setNewBuildingCode('');
      setNewBuildingName('');
      setNewBuildingLatitude('');
      setNewBuildingLongitude('');
      await loadBuildings();
      toast.success('Đã đăng ký tòa nhà với tọa độ master data; cần field test trước khi cấu hình radius/accuracy.');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Không đăng ký được tòa nhà.');
    } finally {
      setIsCreatingBuilding(false);
    }
  };

  const updateDraft = <K extends keyof BuildingDraft>(
    id: number,
    key: K,
    value: BuildingDraft[K],
  ) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  };

  const saveBuilding = async (building: LocationRegistryBuilding) => {
    if (!isAdmin) return;
    const draft = drafts[building.id];
    if (!draft) return;

    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Latitude/longitude không hợp lệ.');
      return;
    }

    const parseOptionalPositive = (value: string, label: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${label} phải là số lớn hơn 0.`);
      }
      return parsed;
    };

    try {
      const geofenceRadius = parseOptionalPositive(draft.geofenceRadius, 'Radius');
      const gpsAccuracyThreshold = parseOptionalPositive(draft.gpsAccuracyThreshold, 'GPS accuracy');
      const lecturerValidationRadius = parseOptionalPositive(
        draft.lecturerValidationRadius,
        'Lecturer validation radius',
      );
      setSavingId(building.id);
      await locationRegistryApi.updateBuilding(building.id, {
        latitude,
        longitude,
        ...(geofenceRadius !== undefined ? { geofenceRadius } : {}),
        ...(gpsAccuracyThreshold !== undefined ? { gpsAccuracyThreshold } : {}),
        ...(lecturerValidationRadius !== undefined ? { lecturerValidationRadius } : {}),
        verified: draft.verified,
        status: draft.status,
      });
      await loadBuildings();
      toast.success(
        latitude !== building.latitude || longitude !== building.longitude
          ? 'Đã lưu tọa độ. Building được chuyển về chưa xác minh; cần kiểm tra lại thực địa.'
          : 'Đã lưu cấu hình Location Registry và audit log.',
      );
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Không lưu được cấu hình.');
    } finally {
      setSavingId(null);
    }
  };

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;
    if (!roomCode.trim() || !roomName.trim() || roomBuildingId <= 0) {
      toast.error('Nhập mã, tên phòng và chọn Building.');
      return;
    }
    try {
      setRoomSavingId(-1);
      await locationRegistryApi.createRoom({
        code: roomCode.trim(),
        name: roomName.trim(),
        buildingId: roomBuildingId,
        ...(roomFloor.trim() ? { floor: roomFloor.trim() } : {}),
      });
      setRoomCode('');
      setRoomName('');
      setRoomFloor('');
      await loadBuildings();
      toast.success('Đã tạo phòng và liên kết Building.');
    } catch (roomError) {
      toast.error(roomError instanceof Error ? roomError.message : 'Không tạo được phòng.');
    } finally {
      setRoomSavingId(null);
    }
  };

  const linkRoom = async (room: LocationRegistryRoom, buildingId: number) => {
    if (!isAdmin || buildingId <= 0) return;
    try {
      setRoomSavingId(room.id);
      await locationRegistryApi.updateRoom(room.id, { buildingId });
      await loadBuildings();
      toast.success(`Đã liên kết ${room.code} với Building.`);
    } catch (roomError) {
      toast.error(roomError instanceof Error ? roomError.message : 'Không cập nhật được phòng.');
    } finally {
      setRoomSavingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <DashboardSidebar
        user={user}
        onLogout={() => {
          logout();
          navigate('/login', { replace: true });
        }}
      />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Location Registry</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Tọa độ master data; radius và ngưỡng accuracy chỉ nhập sau field test. Đổi tọa độ sẽ tự bỏ xác minh và ghi audit before/after.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBuildings()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Tải lại
          </button>
        </header>

        {!isAdmin && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Bạn có quyền xem registry; chỉ admin mới được hiệu chuẩn hoặc thay đổi tọa độ.
          </p>
        )}
        {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {isAdmin && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Đăng ký tòa nhà</h2>
              <p className="mt-1 text-sm text-slate-600">
                Nhập mã, tên, khuôn viên và tọa độ thực địa. Tòa nhà mới chưa được xác minh; radius và ngưỡng accuracy để trống đến sau field test.
              </p>
            </div>
            <form onSubmit={(event) => void createBuilding(event)} className="grid gap-3 md:grid-cols-3">
              <select
                required
                aria-label="Khuôn viên trường"
                value={newBuildingCampusId}
                onChange={(event) => setNewBuildingCampusId(event.target.value)}
                className="rounded border bg-white px-3 py-2 text-sm"
              >
                <option value="">Chọn khuôn viên</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.code} — {campus.name}
                  </option>
                ))}
              </select>
              <input
                required
                maxLength={50}
                value={newBuildingCode}
                onChange={(event) => setNewBuildingCode(event.target.value)}
                placeholder="Mã tòa nhà (ví dụ A33)"
                aria-label="Mã tòa nhà"
                className="rounded border px-3 py-2 text-sm"
              />
              <input
                required
                maxLength={150}
                value={newBuildingName}
                onChange={(event) => setNewBuildingName(event.target.value)}
                placeholder="Tên tòa nhà"
                aria-label="Tên tòa nhà"
                className="rounded border px-3 py-2 text-sm"
              />
              <label className="text-xs text-slate-600">
                Latitude
                <input
                  required
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={newBuildingLatitude}
                  onChange={(event) => setNewBuildingLatitude(event.target.value)}
                  aria-label="Latitude tòa nhà"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="text-xs text-slate-600">
                Longitude
                <input
                  required
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={newBuildingLongitude}
                  onChange={(event) => setNewBuildingLongitude(event.target.value)}
                  aria-label="Longitude tòa nhà"
                  className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <button
                type="submit"
                disabled={isCreatingBuilding || campuses.length === 0}
                className="self-end rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingBuilding ? 'Đang đăng ký…' : 'Đăng ký tọa độ'}
              </button>
              {campuses.length === 0 && (
                <p className="text-sm text-amber-800 md:col-span-3">
                  Chưa có khuôn viên nào để chọn; cần tạo dữ liệu khuôn viên trước.
                </p>
              )}
            </form>
          </section>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Mã / loại</th>
                <th className="px-3 py-3">Địa điểm</th>
                <th className="px-3 py-3">Latitude</th>
                <th className="px-3 py-3">Longitude</th>
                <th className="px-3 py-3">Radius m</th>
                <th className="px-3 py-3">Accuracy m</th>
                <th className="px-3 py-3">GV radius m</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3">Phòng</th>
                <th className="px-3 py-3">Lưu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buildings.map((building) => {
                const draft = drafts[building.id] ?? toDraft(building);
                return (
                  <tr key={building.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <strong>{building.code}</strong>
                      <div className="mt-1 text-[11px] text-slate-500">{building.type}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{building.name}</div>
                      <a
                        href={`https://www.google.com/maps?q=${draft.latitude},${draft.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        Mở bản đồ
                      </a>
                    </td>
                    <td className="px-2 py-3"><input aria-label={`${building.code} latitude`} disabled={!isAdmin} type="number" step="any" value={draft.latitude} onChange={(event) => updateDraft(building.id, 'latitude', event.target.value)} className="w-28 rounded border px-2 py-1 disabled:bg-slate-100" /></td>
                    <td className="px-2 py-3"><input aria-label={`${building.code} longitude`} disabled={!isAdmin} type="number" step="any" value={draft.longitude} onChange={(event) => updateDraft(building.id, 'longitude', event.target.value)} className="w-28 rounded border px-2 py-1 disabled:bg-slate-100" /></td>
                    <td className="px-2 py-3"><input aria-label={`${building.code} radius`} disabled={!isAdmin} type="number" min="0.01" step="0.01" placeholder="Field test" value={draft.geofenceRadius} onChange={(event) => updateDraft(building.id, 'geofenceRadius', event.target.value)} className="w-24 rounded border px-2 py-1 disabled:bg-slate-100" /></td>
                    <td className="px-2 py-3"><input aria-label={`${building.code} GPS accuracy`} disabled={!isAdmin} type="number" min="0.01" step="0.01" placeholder="Field test" value={draft.gpsAccuracyThreshold} onChange={(event) => updateDraft(building.id, 'gpsAccuracyThreshold', event.target.value)} className="w-24 rounded border px-2 py-1 disabled:bg-slate-100" /></td>
                    <td className="px-2 py-3"><input aria-label={`${building.code} lecturer radius`} disabled={!isAdmin} type="number" min="0.01" step="0.01" placeholder="Optional" value={draft.lecturerValidationRadius} onChange={(event) => updateDraft(building.id, 'lecturerValidationRadius', event.target.value)} className="w-24 rounded border px-2 py-1 disabled:bg-slate-100" /></td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-1 text-xs">
                        <input disabled={!isAdmin} type="checkbox" checked={draft.verified} onChange={(event) => updateDraft(building.id, 'verified', event.target.checked)} />
                        Đã xác minh
                      </label>
                      <select disabled={!isAdmin} value={draft.status} onChange={(event) => updateDraft(building.id, 'status', event.target.value as BuildingDraft['status'])} className="mt-2 rounded border px-2 py-1 text-xs disabled:bg-slate-100">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">{building.roomCount}</td>
                    <td className="px-3 py-3">
                      {isAdmin ? (
                        <button type="button" disabled={savingId === building.id} onClick={() => void saveBuilding(building)} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                          {savingId === building.id ? 'Lưu…' : 'Lưu'}
                        </button>
                      ) : '—'}
                      <div className={`mt-1 text-[10px] ${building.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {building.verified ? 'READY' : 'CHƯA XÁC MINH'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && buildings.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">Không có dữ liệu registry.</td></tr>
              )}
            </tbody>
          </table>
          {isLoading && <p className="p-6 text-center text-slate-500">Đang tải registry…</p>}
        </div>

        <section className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Rooms → Buildings</h2>
            <p className="mt-1 text-sm text-slate-600">
              Phòng chỉ liên kết với địa điểm loại BUILDING; dữ liệu phòng/thời khóa biểu cần nhập từ nguồn học vụ, không suy ra từ file tọa độ.
            </p>
          </div>
          {isAdmin && (
            <form onSubmit={(event) => void createRoom(event)} className="grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-5">
              <input required maxLength={50} value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Mã phòng A24-202" className="rounded border bg-white px-3 py-2 text-sm" />
              <input required maxLength={100} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Tên phòng" className="rounded border bg-white px-3 py-2 text-sm" />
              <input maxLength={30} value={roomFloor} onChange={(event) => setRoomFloor(event.target.value)} placeholder="Tầng (tùy chọn)" className="rounded border bg-white px-3 py-2 text-sm" />
              <select required value={roomBuildingId} onChange={(event) => setRoomBuildingId(Number(event.target.value))} className="rounded border bg-white px-3 py-2 text-sm">
                <option value={0}>Chọn tòa BUILDING</option>
                {buildings.filter((building) => building.type === 'BUILDING' && building.status === 'ACTIVE').map((building) => (
                  <option key={building.id} value={building.id}>{building.code} — {building.name}</option>
                ))}
              </select>
              <button type="submit" disabled={roomSavingId === -1} className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {roomSavingId === -1 ? 'Đang tạo…' : 'Tạo phòng'}
              </button>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-[650px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Phòng</th><th className="px-3 py-2">Tầng</th><th className="px-3 py-2">Building</th><th className="px-3 py-2">Trạng thái</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-3 py-2"><strong>{room.code}</strong> · {room.name}</td>
                    <td className="px-3 py-2">{room.floor ?? '—'}</td>
                    <td className="px-3 py-2">
                      {isAdmin ? (
                        <select
                          value={room.building?.id ?? 0}
                          disabled={roomSavingId === room.id}
                          onChange={(event) => void linkRoom(room, Number(event.target.value))}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value={0}>Chưa liên kết</option>
                          {buildings.filter((building) => building.type === 'BUILDING' && building.status === 'ACTIVE').map((building) => (
                            <option key={building.id} value={building.id}>{building.code}</option>
                          ))}
                        </select>
                      ) : room.building?.code ?? 'Chưa liên kết'}
                    </td>
                    <td className="px-3 py-2">{room.status}</td>
                  </tr>
                ))}
                {!isLoading && rooms.length === 0 && (
                  <tr><td colSpan={4} className="p-5 text-center text-slate-500">Chưa có dữ liệu phòng học.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LocationRegistryPage;
