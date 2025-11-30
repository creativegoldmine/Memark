import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, User as DBUser } from '@/lib/supabase';
import { Session, User as AuthUser } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  dbUser: DBUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phoneNumber: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (userId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setDbUser(data);
        return;
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchDbUser(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDbUser(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchDbUser(session.user.id);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    }));

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, phoneNumber: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone_number: phoneNumber,
        },
      },
    });

    if (authError) {
      return { error: authError };
    }

    if (authData.user) {
      await fetchDbUser(authData.user.id);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setDbUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        dbUser,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
