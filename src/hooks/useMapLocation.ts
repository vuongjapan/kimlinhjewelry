import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MapLocation {
  lat: number;
  lng: number;
  zoom: number;
}

const DEFAULT_LOCATION: MapLocation = { lat: 19.7583, lng: 105.9020, zoom: 16 };

export const useMapLocation = () => {
  return useQuery({
    queryKey: ['map-location'],
    queryFn: async (): Promise<MapLocation> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'map_location')
        .single();
      if (error || !data) return DEFAULT_LOCATION;
      return data.value as unknown as MapLocation;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateMapLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (location: MapLocation) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: location as any, updated_at: new Date().toISOString() })
        .eq('key', 'map_location');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-location'] });
    },
  });
};
