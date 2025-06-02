import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

// --- Type Definitions ---
export type UserRole = 'administrator' | 'accountant' | 'teacher';

export interface AuthenticatedUser {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Session Management ---
const SESSION_KEY = 'school_app_session';

interface StoredSession {
  user: AuthenticatedUser;
  timestamp: number;
}

const saveUserSession = (user: AuthenticatedUser): void => {
  try {
    const session: StoredSession = {
      user,
      timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save user session:', error);
  }
};

const getUserSession = (): StoredSession | null => {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Failed to retrieve user session:', error);
    return null;
  }
};

const clearUserSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear user session:', error);
  }
};

// --- AuthProvider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  // Initialize auth state and listen for Supabase auth changes
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing authentication state...');
      
      // Get initial Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('AuthContext: Error getting session:', error);
      }
      
      setSupabaseSession(session);

      // Check localStorage for user data
      const localSession = getUserSession();
      
      if (session && localSession?.user) {
        try {
          // Verify user is still active in database
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', localSession.user.id)
            .eq('is_active', true)
            .single();

          if (dbError || !userData) {
            throw new Error('User session invalid');
          }

          // Check if session is not expired (24 hours)
          const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          if (Date.now() - localSession.timestamp > SESSION_EXPIRY) {
            throw new Error('Session expired');
          }

          console.log('AuthContext: Found valid session for user:', localSession.user.name);
          setUser(localSession.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('AuthContext: Session verification failed:', error);
          clearUserSession();
          await supabase.auth.signOut();
        }
      } else if (session && !localSession) {
        // Supabase session exists but no local user data - sign out
        console.log('AuthContext: Supabase session exists but no local user data - signing out');
        await supabase.auth.signOut();
      } else if (!session && localSession) {
        // Local session exists but no Supabase session - clear local
        console.log('AuthContext: Local session exists but no Supabase session - clearing local');
        clearUserSession();
      } else {
        console.log('AuthContext: No saved user session found');
      }
      
      setAuthLoading(false);
    };

    initializeAuth();

    // Listen for Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Supabase auth state changed:', event, session?.user?.id);
      setSupabaseSession(session);
      
      if (event === 'SIGNED_OUT' || !session) {
        // Clear everything when signed out
        clearUserSession();
        setUser(null);
        setIsAuthenticated(false);
        setPhoneNumber('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);
    
    try {
      if (!phoneNumber.trim() || !code.trim()) {
        throw new Error('Phone number and login code are required');
      }

      console.log('AuthContext: Verifying credentials...');

      // First, verify the user credentials in your custom users table
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('login_code', code)
        .eq('is_active', true)
        .single();

      if (dbError || !userData) {
        console.error('AuthContext: Invalid credentials:', dbError);
        throw new Error('Invalid phone number or login code');
      }

      if (!['administrator', 'accountant', 'teacher'].includes(userData.role)) {
        throw new Error('Invalid user role');
      }

      // Sign in to Supabase using the user's email (create a dummy password or use signInAnonymously)
      // We need to ensure this user exists in auth.users
      let authUser;
      
      try {
        // Try to sign in with a dummy password (you'll need to set this up)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: userData.email || `${userData.phone_number}@school.local`,
          password: 'dummy_password_' + userData.id // Use a consistent dummy password
        });

        if (authError) {
          // If sign in fails, try to sign up the user first
          console.log('AuthContext: User not in auth.users, creating...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userData.email || `${userData.phone_number}@school.local`,
            password: 'dummy_password_' + userData.id,
            options: {
              data: {
                user_id: userData.id,
                role: userData.role,
                phone_number: userData.phone_number
              }
            }
          });

          if (signUpError) {
            throw new Error('Failed to create auth user: ' + signUpError.message);
          }

          authUser = signUpData.user;
        } else {
          authUser = authData.user;
        }
      } catch (authError) {
        console.error('AuthContext: Supabase auth error:', authError);
        // If Supabase auth fails, we can still proceed with custom auth
        // but RLS policies won't work properly
        console.warn('AuthContext: Proceeding without Supabase auth - RLS may not work');
      }

      const authenticatedUser: AuthenticatedUser = {
        id: userData.id,
        name: userData.name,
        role: userData.role as UserRole,
        phone_number: userData.phone_number,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };

      saveUserSession(authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setPhoneNumber('');

      // Add custom headers for additional context
      supabase.rest.headers = {
        ...supabase.rest.headers,
        'x-user-id': authenticatedUser.id,
        'x-user-role': authenticatedUser.role
      };

      const redirectPath = getRedirectPath(authenticatedUser.role);
      navigate(redirectPath);

      return { 
        success: true, 
        message: `Welcome back, ${authenticatedUser.name}!` 
      };

    } catch (error: any) {
      console.error('AuthContext: Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Authentication failed' 
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    console.log('AuthContext: Logging out user...');

    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Remove custom headers
      const { 'x-user-id': _, 'x-user-role': __, ...restHeaders } = supabase.rest.headers;
      supabase.rest.headers = restHeaders;

      clearUserSession();
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      setSupabaseSession(null);
      
      navigate('/login');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetSession = async (): Promise<void> => {
    if (!user) return;

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        throw new Error('User session invalid');
      }

      const authenticatedUser: AuthenticatedUser = {
        id: userData.id,
        name: userData.name,
        role: userData.role as UserRole,
        phone_number: userData.phone_number,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      };

      saveUserSession(authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('AuthContext: Session reset failed:', error);
      await logout();
    }
  };

  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case 'administrator':
        return '/dashboard';
      case 'accountant':
        return '/dashboard';
      case 'teacher':
        return '/dashboard';
      default:
        return '/dashboard';
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

// --- Custom Hooks ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useRequireAuth = (requiredRoles?: UserRole[]) => {
  const { user, isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [user, isAuthenticated, authLoading, requiredRoles, navigate]);

  return { user, isAuthenticated, authLoading };
};

export const hasRole = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};