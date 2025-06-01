// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// --- Type Definitions ---
export type UserRole = 'administrator' | 'accountant' | 'teacher' | 'student' | 'parent' | 'guest';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  phone_number: string;
  email?: string;
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

  const getSupabaseSessionAndUser = async () => {
    const {
      data: { session },
      error: getSessionError,
    } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("Error getting Supabase session:", getSessionError);
      setAuthLoading(false);
      return;
    }

    if (session) {
      const { data: userData, error: getUserDataError } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('id', session.user.id)
        .single();

      if (getUserDataError) {
        console.error("Error getting user data:", getUserDataError);
        setAuthLoading(false);
        return;
      }

      const authenticatedUser: AuthenticatedUser = {
        id: userData.id,
        name: userData.name,
        role: userData.role as UserRole,
        phone_number: userData.phone_number,
        email: userData.email,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      };
      setUser(authenticatedUser);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getSupabaseSessionAndUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
      }
    });

    getSupabaseSessionAndUser();

    return () => subscription.unsubscribe();

  }, [navigate]);


  // Login function with pre-defined code
  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);

    try {
      // Validate inputs
      if (!phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }

      if (!code.trim()) {
        throw new Error('Login code is required');
      }

      console.log(`AuthContext: Attempting login for phone: ${phoneNumber}, code: ${code}`);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-with-code`;
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          login_code: code
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const { session, user: userData } = await res.json();

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      console.log('AuthContext: Login successful for user:', userData.name);

      // Navigate based on role
      const redirectPath = getRedirectPath(userData.role as UserRole);
      navigate(redirectPath);

      return {
        success: true,
        message: `Welcome back, ${userData.name}!`,
      };

    } catch (error: any) {
      console.error('AuthContext: Login error:', error);

      return {
        success: false,
        message: error.message || 'An unexpected error occurred during login.',
      };
    } finally {
      setAuthLoading(false);
    }
  };

  // --- MODIFIED LOGOUT FUNCTION ---
  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    console.log('AuthContext: Logging out user...');
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('AuthContext: Error signing out from Supabase:', error);
    } finally {
      setAuthLoading(false);
      console.log('AuthContext: Logout process finished.');
    }
  };
  // --- END OF MODIFIED LOGOUT FUNCTION ---

  const resetSession = async (): Promise<void> => {
    await getSupabaseSessionAndUser();
  };


  // Helper function to get redirect path based on role
  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case 'administrator':
        return '/admin/dashboard';
      case 'accountant':
        return '/accountant/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'parent':
        return '/parent/dashboard';
      default:
        return '/dashboard'; // A generic dashboard if role doesn't match
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    authLoading,
    phoneNumber,
    setPhoneNumber,
    login,
    logout,
    resetSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Role-based Access Control Hook ---
export const useRequireAuth = (requiredRoles?: UserRole[]) => {
  const { user, isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) { // Wait until auth state is determined
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true }); // Use replace to avoid login page in history
      return;
    }

    if (user && requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      navigate('/unauthorized', { replace: true }); // Use replace
      return;
    }
  }, [user, isAuthenticated, authLoading, requiredRoles, navigate]);

  return { user, isAuthenticated, authLoading }; // Return values for potential use in component
};

// --- Role Check Utility ---
export const hasRole = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};