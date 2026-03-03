import { useMapLocation } from '@/hooks/useMapLocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const StoreMap = () => {
  const { data: location } = useMapLocation();

  if (!location) return null;

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={location.zoom}
        className="w-full h-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.lat, location.lng]}>
          <Popup>
            <strong>Vàng Bạc Kim Linh</strong><br />
            50 Nguyễn Thị Minh Khai, Sầm Sơn
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default StoreMap;
