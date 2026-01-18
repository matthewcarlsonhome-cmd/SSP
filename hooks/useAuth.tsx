// Auth hook for Supabase authentication
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, signInWithGoogle as supabaseSignInWithGoogle } from '../lib/supabase';
import {
  handleUserSignIn,
  getCurrentAppUser,
  isAdminEmail,
  checkProfileAdminStatus,
  initializeAdminStatus,
  getAdminEmailsFromSupabase,
} from '../lib/admin';
import type { AppUser } from '../lib/storage/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAppUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(getCurrentAppUser());
  const [loading, setLoading] = useState(true);
  const [adminChecked, setAdminChecked] = useState(false);
  const isConfigured = isSupabaseConfigured();

  // Check if current user is admin (uses state that's updated async)
  const isAdmin = appUser?.isAdmin || (user?.email ? isAdminEmail(user.email) : false);

  // Refresh app user from storage
  const refreshAppUser = () => {
    setAppUser(getCurrentAppUser());
  };

  // Check admin status from Supabase (async) with timeout
  const checkAdminFromSupabase = async (userId: string, email: string): Promise<boolean> => {
    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Admin check timeout')), 5000);
      });

      const adminCheckPromise = (async () => {
        // First check profile's is_admin flag
        const profileIsAdmin = await checkProfileAdminStatus(userId);
        if (profileIsAdmin) {
          return true;
        }

        // Then check admin_emails table and initialize status if needed
        const isAdmin = await initializeAdminStatus(userId, email);
        return isAdmin;
      })();

      return await Promise.race([adminCheckPromise, timeoutPromise]);
    } catch (e) {
      // Don't block on admin check errors - just log and continue
      console.warn('Admin check failed (this is OK if tables not yet created):', e);
      return false;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Pre-fetch admin emails from Supabase to populate cache (non-blocking)
    // This will fail silently if the admin_settings table doesn't exist
    getAdminEmailsFromSupabase().catch((e) => {
      console.warn('Could not fetch admin emails (table may not exist yet):', e);
    });

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Capture email and create/update app user on initial load
      if (session?.user) {
        const capturedUser = handleUserSignIn(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name,
          session.user.user_metadata?.avatar_url
        );

        // Check admin status from Supabase
        const isAdminFromDB = await checkAdminFromSupabase(
          session.user.id,
          session.user.email || ''
        );

        // Update app user with admin status from DB
        if (isAdminFromDB && !capturedUser.isAdmin) {
          capturedUser.isAdmin = true;
          capturedUser.role = 'custom';
        }

        setAppUser(capturedUser);
        setAdminChecked(true);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Capture email on sign-in events
        if (event === 'SIGNED_IN' && session?.user) {
          const capturedUser = handleUserSignIn(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.avatar_url
          );

          // Check admin status from Supabase
          const isAdminFromDB = await checkAdminFromSupabase(
            session.user.id,
            session.user.email || ''
          );

          // Update app user with admin status from DB
          if (isAdminFromDB && !capturedUser.isAdmin) {
            capturedUser.isAdmin = true;
            capturedUser.role = 'custom';
          }

          setAppUser(capturedUser);
          setAdminChecked(true);
        }

        // Clear app user on sign out
        if (event === 'SIGNED_OUT') {
          setAppUser(null);
          setAdminChecked(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Use the validated signInWithGoogle from lib/supabase.ts
    // which includes redirect URL validation to prevent open redirects
    await supabaseSignInWithGoogle();
  };

  const signOut = async () => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        appUser,
        loading,
        isConfigured,
        isAdmin,
        signInWithGoogle,
        signOut,
        refreshAppUser,
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
