import { useState, useEffect, useCallback } from 'react';
import { useMapLocation, useUpdateMapLocation, type MapLocation } from '@/hooks/useMapLocation';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const AdminMapEditor = () => {
  const { data: location } = useMapLocation();
  const updateLocation = useUpdateMapLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<MapLocation>({ lat: 19.7583, lng: 105.9020, zoom: 16 });

  useEffect(() => {
    if (location) setForm(location);
  }, [location]);

  const handleClick = useCallback((lat: number, lng: number) => {
    setForm(prev => ({ ...prev, lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 }));
  }, []);

  const handleSave = async () => {
    try {
      await updateLocation.mutateAsync(form);
      toast({ title: 'Đã cập nhật vị trí bản đồ' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5" /> Vị trí bản đồ
      </h2>
      <p className="text-sm text-muted-foreground font-body">Click trên bản đồ để chọn vị trí mới hoặc nhập tọa độ.</p>

      <div className="w-full h-[350px] rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={[form.lat, form.lng]}
          zoom={form.zoom}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[form.lat, form.lng]} />
          <ClickHandler onClick={handleClick} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="font-body text-xs">Vĩ độ (Lat)</Label>
          <Input type="number" step="0.0001" value={form.lat}
            onChange={(e) => setForm(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          <Label className="font-body text-xs">Kinh độ (Lng)</Label>
          <Input type="number" step="0.0001" value={form.lng}
            onChange={(e) => setForm(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          <Label className="font-body text-xs">Zoom</Label>
          <Input type="number" min={1} max={20} value={form.zoom}
            onChange={(e) => setForm(prev => ({ ...prev, zoom: parseInt(e.target.value) || 16 }))} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateLocation.isPending}>Lưu vị trí</Button>
      </div>
    </div>
  );
};

export default AdminMapEditor;
