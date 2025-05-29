// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// --- Type Definitions ---
export type UserRole = 'administrator' | 'accountant' | 'teacher' | 'student' | 'parent' | 'guest';

export interface AuthenticatedUser extends User {
  role?: UserRole;
  name?: string;
  phone_number?: string;
  email?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  login: (code: string) => Promise<{ success: boolean; message: string; data?: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const isMounted = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      isMounted.current = false;
      console.log("AuthContext: Component unmounted cleanup.");
    };
  }, []);

  // Fetch user profile from public.users table
  const fetchUserProfile = useCallback(async (loginCode: string): Promise<AuthenticatedUser | null> => {
    try {
      console.log(`AuthContext: Fetching public profile for login code: ${loginCode}`);
      
      const { data: publicProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('login_code', loginCode)
        .eq('is_active', true)
        .single();

      if (profileError) {
        console.error("AuthContext: Error fetching public profile:", profileError);
        return null;
      }
      console.log("AuthContext: Public profile fetched successfully:", publicProfile);
      return publicProfile as AuthenticatedUser;
    } catch (err) {
      console.error("AuthContext: Exception fetching public profile:", err);
      return null;
    }
  });

  // Effect to listen for Supabase authentication state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) {
        console.log(`AuthContext: onAuthStateChange - Component unmounted during ${event} event, aborting.`);
        return;
      }

      console.log('Auth state changed:', event, session);
      setAuthLoading(true);

      try {
        if (session?.user) {
          // If a user session exists, fetch their custom role from the public.users table
          const { data: publicProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) throw profileError;

          if (!isMounted.current) return;

          if (publicProfile) {
            setUser({ ...session.user, ...publicProfile, role: publicProfile.role });
            setIsAuthenticated(true);
            navigate('/');
          } else {
            console.warn(`AuthContext: User authenticated but no public profile found during ${event}.`);
            // If no profile found, sign out as this shouldn't happen for pre-defined users
            await supabase.auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
            navigate('/login');
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          if (event !== 'INITIAL') {
            navigate('/login');
          }
          console.log(`AuthContext: No active session for ${event}.`);
        }
      } catch (err: any) {
        console.error(`AuthContext: Uncaught error during ${event} session handling:`, err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (isMounted.current) {
          setAuthLoading(false);
          console.log(`AuthContext: Setting authLoading to false for ${event}.`);
        }
      }
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Function to login with code
  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-with-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          login_code: code,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }

      // Sign in with the magic link token
      const { error: signInError } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        token: data.session.token,
      });

      if (signInError) {
        throw signInError;
      }
      
      return { success: true, message: 'Login successful!' };
      
    } catch (err: any) {
      console.error("AuthContext: Exception during login:", err);
      return { success: false, message: err.message || 'An unexpected error occurred during login.' };
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  // Function to log out the user
  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    try {
      console.log("AuthContext: Attempting to log out.");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Logout error:", error.message);
      }
      console.log("AuthContext: User logged out successfully (or error handled).");
    } catch (err: any) {
      console.error("AuthContext: Exception during logout:", err);
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
//        setLoginCode(null);
      }
    }
  };

  const value = {
    user,
    isAuthenticated,
    authLoading,
    phoneNumber,
    setPhoneNumber,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};