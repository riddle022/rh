import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  permissions: Record<string, any> | null;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  permissions: null,
  refreshPermissions: async () => { },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-permissions');
      if (error) throw error;
      setPermissions(data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermissions({});
    }
  };

  useEffect(() => {
    const subscription = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPermissions();
      } else {
        setPermissions(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, permissions, refreshPermissions: fetchPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};
