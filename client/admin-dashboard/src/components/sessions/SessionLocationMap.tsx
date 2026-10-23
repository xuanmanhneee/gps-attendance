import { useEffect, useState } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { useTranslation } from '../../hooks/useTranslation';

/** Mức zoom khi mở bản đồ: đủ gần để thấy vòng bán kính vài chục mét. */
const DEFAULT_ZOOM = 16;

/** Số mét trên một độ vĩ tuyến (xấp xỉ đủ dùng cho bán kính điểm danh). */
const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Bán kính nhỏ nhất cho phép, khớp `RADIUS_MIN` của form tạo phiên. */
const MIN_RADIUS = 1;

// Marker mặc định của Leaflet cần file ảnh nằm cạnh bundle; vẽ marker bằng
// `divIcon` để không phải import asset và không phụ thuộc đường dẫn ảnh.
const CENTER_ICON = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#0284c7;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const RADIUS_HANDLE_ICON = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ffffff;border:3px solid #0284c7;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const roundCoordinate = (value: number): number => Number(value.toFixed(6));

/**
 * Vị trí điểm điều khiển bán kính: nằm ở rìa phía đông của vòng tròn.
 *
 * Đổi mét sang độ kinh tuyến theo vĩ độ hiện tại; với bán kính điểm danh vài
 * chục đến vài trăm mét thì sai số của công thức xấp xỉ này không đáng kể.
 */
const toRadiusHandlePosition = (
  latitude: number,
  longitude: number,
  radius: number,
): L.LatLngTuple => {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.max(Math.cos(latitudeRadians), 0.01);

  return [latitude, longitude + radius / metersPerDegreeLongitude];
};

/** Giữ bản đồ bám theo toạ độ mới nhất (vd sau khi bấm lấy vị trí hiện tại). */
const RecenterMap = ({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude]);
  }, [map, latitude, longitude]);

  return null;
};

type RadiusHandleProps = {
  latitude: number;
  longitude: number;
  radius: number;
  /** Cập nhật vòng tròn ngay khi đang kéo, không ghi vào form. */
  onPreview: (radius: number) => void;
  onCommit: (radius: number) => void;
};

const RadiusHandle = ({
  latitude,
  longitude,
  radius,
  onPreview,
  onCommit,
}: RadiusHandleProps) => {
  const map = useMap();
  const center = L.latLng(latitude, longitude);

  const readRadius = (marker: L.Marker): number =>
    Math.max(MIN_RADIUS, Math.round(map.distance(center, marker.getLatLng())));

  return (
    <Marker
      position={toRadiusHandlePosition(latitude, longitude, radius)}
      draggable
      icon={RADIUS_HANDLE_ICON}
      eventHandlers={{
        drag: (event) => {
          onPreview(readRadius(event.target as L.Marker));
        },
        dragend: (event) => {
          onCommit(readRadius(event.target as L.Marker));
        },
      }}
    />
  );
};

type SessionLocationMapProps = {
  latitude: number;
  longitude: number;
  radius: number;
  onChange: (next: {
    latitude: number;
    longitude: number;
    radius: number;
  }) => void;
};

/**
 * Bản đồ chọn phạm vi điểm danh: kéo marker để đổi tâm, kéo điểm ở rìa vòng
 * tròn để đổi bán kính.
 *
 * Vòng tròn dùng state nội bộ để phản hồi tức thì khi kéo, form chỉ nhận giá
 * trị chốt lại ở `dragend`. Nếu ghi vào form ngay giữa lúc kéo thì `position`
 * của marker bị ghi đè liên tục và marker sẽ giật.
 */
export const SessionLocationMap = ({
  latitude,
  longitude,
  radius,
  onChange,
}: SessionLocationMapProps) => {
  const { t } = useTranslation();
  const [circleCenter, setCircleCenter] = useState<L.LatLngTuple>([
    latitude,
    longitude,
  ]);
  const [circleRadius, setCircleRadius] = useState(radius);

  useEffect(() => {
    setCircleCenter([latitude, longitude]);
  }, [latitude, longitude]);

  useEffect(() => {
    setCircleRadius(radius);
  }, [radius]);

  return (
    <div className="relative z-0 h-[360px] w-full overflow-hidden rounded-xl border border-line">
      <MapContainer
        center={[latitude, longitude]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap latitude={latitude} longitude={longitude} />

        <Circle
          center={circleCenter}
          radius={circleRadius}
          pathOptions={{
            color: '#0284c7',
            fillColor: '#0284c7',
            fillOpacity: 0.15,
          }}
        />

        <Marker
          position={[latitude, longitude]}
          draggable
          icon={CENTER_ICON}
          eventHandlers={{
            drag: (event) => {
              const { lat, lng } = (event.target as L.Marker).getLatLng();
              setCircleCenter([lat, lng]);
            },
            dragend: (event) => {
              const { lat, lng } = (event.target as L.Marker).getLatLng();
              onChange({
                latitude: roundCoordinate(lat),
                longitude: roundCoordinate(lng),
                radius: circleRadius,
              });
            },
          }}
        />

        <RadiusHandle
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          onPreview={setCircleRadius}
          onCommit={(nextRadius) => {
            onChange({ latitude, longitude, radius: nextRadius });
          }}
        />
      </MapContainer>

      <p className="pointer-events-none absolute right-2 bottom-2 left-2 z-[1000] rounded-md bg-surface/90 px-2 py-1 text-[11px] text-muted">
        {t('sessions.form.mapHint')}
      </p>
    </div>
  );
};
