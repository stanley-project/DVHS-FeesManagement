import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// --- Type Definitions ---
type UserRole = 'administrator' | 'accountant' | 'teacher';

interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  phone_number: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  login: (code: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  resetSession: () => Promise<void>;
  handleError: (error: any) => void;
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
  const navigate = useNavigate();

  // Network error detection
  const isNetworkOrResourceError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorName = error?.name || '';
    return (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('net::ERR_') ||
      errorMessage.toLowerCase().includes('network') ||
      errorName === 'TypeError' && errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('AbortError') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('cors')
    );
  };

  const isAuthError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code;
    return (
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.toLowerCase().includes('invalid token') ||
      errorMessage.toLowerCase().includes('session invalid') ||
      errorMessage.toLowerCase().includes('not authenticated') ||
      errorMessage.toLowerCase().includes('session expired') ||
      errorMessage.toLowerCase().includes('user not found or inactive')
    );
  };

  // Fetch user profile
  const fetchUserData = async (userId: string): Promise<AuthenticatedUser | null> => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();
      if (error || !userData) return null;
      return {
        id: userData.id,
        name: userData.name,
        role: userData.role as UserRole,
        phone_number: userData.phone_number,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };
    } catch {
      return null;
    }
  };

  // Supabase auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
      setAuthLoading(false);
    });

    // Initial session check
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
      setAuthLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleError = useCallback((error: any) => {
    if (isAuthError(error)) {
      toast.error('Your session has expired. Please log in again.');
      logout();
    } else if (isNetworkOrResourceError(error)) {
      toast.error('Network connection issue. Please check your internet connection.');
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }
  }, []);

  // Updated login method (phone → Edge Function → dummy email → Supabase sign-in)
  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!phoneNumber.trim() || !code.trim()) throw new Error('Phone number and login code are required');

      // 1. Get dummy email from Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-email-for-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();
      if (!response.ok || !data.email) throw new Error(data.error || 'Failed to look up account.');

      // 2. Sign in with Supabase from client
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: code,
      });
      if (signInErr) throw new Error('Invalid phone number or login code');

      setPhoneNumber('');
      return { success: true, message: 'Login successful! Redirecting...' };
    } catch (error: any) {
      if (isNetworkOrResourceError(error)) {
        return { success: false, message: 'Network connection issue. Please check your internet connection.' };
      }
      return { success: false, message: error.message || 'Authentication failed' };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setPhoneNumber('');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  const resetSession = useCallback(async (): Promise<void> => {
    if (!user) return;
    const { error } = await supabase.auth.refreshSession();
    if (error && isAuthError(error)) await logout();
  }, [user, logout]);

  // Auto refresh every 15 min
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const intervalId = setInterval(resetSession, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user, isAuthenticated, resetSession]);

  useEffect(() => {
    if (user && isAuthenticated && !authLoading) navigate('/', { replace: true });
  }, [user, isAuthenticated, authLoading, navigate]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    authLoading,
    phoneNumber,
    setPhoneNumber,
    login,
    logout,
    resetSession,
    handleError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};