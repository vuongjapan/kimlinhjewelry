import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type CustomerTier = 'thuong' | 'vip' | 'sieu_vip';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  purchase_count: number;
  tier: CustomerTier;
}

export const getTierLabel = (tier: CustomerTier) => {
  switch (tier) {
    case 'sieu_vip': return 'Siêu VIP';
    case 'vip': return 'VIP';
    default: return 'Thành viên';
  }
};

export const getTierColor = (tier: CustomerTier) => {
  switch (tier) {
    case 'sieu_vip': return 'bg-yellow-500 text-yellow-950';
    case 'vip': return 'bg-primary text-primary-foreground';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return { user, profile, loading, signOut };
};
