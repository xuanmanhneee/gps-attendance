import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MdClose, MdMyLocation } from 'react-icons/md';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { useTranslation } from '../../hooks/useTranslation';
import { snapRadius } from '../../utils/attendance-sessions/session-form';

/** Chuyển mét sang độ vĩ (xấp xỉ — đủ cho UI). */
const METERS_PER_DEG_LAT = 111_320;
const metersToLatDelta = (meters: number): number =>
  meters / METERS_PER_DEG_LAT;

/** Icon mặc định của Leaflet bị lỗi đường dẫn khi bundle — tự định nghĩa. */
const CENTER_ICON = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#0ea5e9;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const RADIUS_HANDLE_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:white;border:3px solid #0ea5e9;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:grab"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** Khi modal mở, ép map invalidate để tile load đúng kích thước. */
const MapInvalidator = () => {
  const map = useMap();

  useEffect(() => {
    const initial = window.setTimeout(() => map.invalidateSize(), 50);

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      window.clearTimeout(initial);
      observer.disconnect();
    };
  }, [map]);

  return null;
};

/** Tính khoảng cách (mét) từ tâm tới một điểm, có xét cos(vĩ độ). */
const computeDistanceMeters = (
  center: [number, number],
  point: [number, number],
): number => {
  const dLat = point[0] - center[0];
  const dLng = point[1] - center[1];
  return Math.sqrt(
    (dLat * METERS_PER_DEG_LAT) ** 2 +
      (dLng * METERS_PER_DEG_LAT * Math.cos((center[0] * Math.PI) / 180)) ** 2,
  );
};

/**
 * Marker rìa — kéo để đổi radius.
 *
 * Không bind `position` liên tục trong lúc kéo: dùng ref để Leaflet tự giữ
 * vị trí marker, tránh React ép marker giật về vị trí cũ mỗi lần re-render.
 * Chỉ đồng bộ lại vị trí marker khi radius thay đổi từ bên ngoài (input tay,
 * lấy vị trí hiện tại).
 */
const RadiusHandleMarker = ({
  center,
  radius,
  onRadiusChange,
}: {
  center: [number, number];
  radius: number;
  onRadiusChange: (next: number) => void;
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const isDraggingRef = useRef(false);

  const initialPosition: [number, number] = [
    center[0] + metersToLatDelta(radius),
    center[1],
  ];

  // Khi radius/center đổi từ bên ngoài → đặt lại vị trí marker (không làm khi đang kéo)
  useEffect(() => {
    if (isDraggingRef.current) return;
    const m = markerRef.current;
    if (!m) return;
    m.setLatLng([center[0] + metersToLatDelta(radius), center[1]]);
  }, [center, radius]);

  return (
    <Marker
      ref={markerRef}
      position={initialPosition}
      draggable
      icon={RADIUS_HANDLE_ICON}
      eventHandlers={{
        dragstart: () => {
          isDraggingRef.current = true;
        },
        drag: (e) => {
          const latlng = (e.target as L.Marker).getLatLng();
          const meters = computeDistanceMeters(center, [
            latlng.lat,
            latlng.lng,
          ]);
          onRadiusChange(snapRadius(meters));
        },
        dragend: (e) => {
          isDraggingRef.current = false;
          const latlng = (e.target as L.Marker).getLatLng();
          const meters = computeDistanceMeters(center, [
            latlng.lat,
            latlng.lng,
          ]);
          const snapped = snapRadius(meters);
          onRadiusChange(snapped);
          // Đặt lại vị trí marker khớp chính xác với radius đã snap
          (e.target as L.Marker).setLatLng([
            center[0] + metersToLatDelta(snapped),
            center[1],
          ]);
        },
      }}
    />
  );
};

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  initialRadius: number;
  onCancel: () => void;
  onConfirm: (next: {
    latitude: number;
    longitude: number;
    radius: number;
  }) => void;
};

export const SessionLocationPickerModal = ({
  initialLatitude,
  initialLongitude,
  initialRadius,
  onCancel,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();

  const [center, setCenter] = useState<[number, number]>([
    initialLatitude,
    initialLongitude,
  ]);
  const [radius, setRadius] = useState(snapRadius(initialRadius));

  // ESC để đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const goToCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6)),
        ]);
      },
      () => {
        /* Silent — user tự chọn trên map */
      },
      { enableHighAccuracy: true },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-[14px] font-bold text-ink">
            {t('sessions.form.pickLocationTitle')}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-muted transition-colors hover:text-ink"
            aria-label={t('sessions.form.close')}
          >
            <MdClose />
          </button>
        </div>

        {/* Map */}
        <div className="relative min-h-0 flex-1">
          <MapContainer
            center={center}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors, Tiles style by HOT"
              subdomains={['a', 'b']}
              maxZoom={19}
            />

            <MapInvalidator />

            {/* Vòng tròn bán kính */}
            <Circle
              center={center}
              radius={radius}
              pathOptions={{
                color: '#0ea5e9',
                weight: 2,
                fillColor: '#0ea5e9',
                fillOpacity: 0.15,
              }}
            />

            {/* Marker tâm — kéo tự do */}
            <Marker
              position={center}
              draggable
              icon={CENTER_ICON}
              eventHandlers={{
                dragend: (e) => {
                  const latlng = (e.target as L.Marker).getLatLng();
                  setCenter([
                    Number(latlng.lat.toFixed(6)),
                    Number(latlng.lng.toFixed(6)),
                  ]);
                },
              }}
            />

            {/* Marker rìa — kéo để đổi radius, cập nhật circle real-time */}
            <RadiusHandleMarker
              center={center}
              radius={radius}
              onRadiusChange={setRadius}
            />
          </MapContainer>

          {/* Nút "Lấy vị trí hiện tại" nổi trên map */}
          <button
            type="button"
            onClick={goToCurrentLocation}
            className="absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-lg border border-line bg-surface/95 px-3 py-2 text-[12px] font-bold text-ink shadow-md backdrop-blur transition-colors hover:border-accent-strong hover:text-accent-strong"
          >
            <MdMyLocation aria-hidden="true" />
            {t('sessions.form.useCurrentLocation')}
          </button>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3">
          <div className="text-[12px] text-muted">
            <p className="tabular-nums">
              {center[0].toFixed(6)}, {center[1].toFixed(6)}
            </p>
            <p className="font-bold text-ink">{radius} m</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              {t('sessions.form.cancel')}
            </button>
            <button
              type="button"
              onClick={() =>
                onConfirm({
                  latitude: center[0],
                  longitude: center[1],
                  radius,
                })
              }
              className="rounded-lg bg-accent-strong px-3.5 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            >
              {t('sessions.form.confirmLocation')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
