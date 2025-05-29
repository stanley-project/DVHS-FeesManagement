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

// --- Session Management ---
const SESSION_KEY = 'school_app_session';

const saveUserSession = (user: AuthenticatedUser): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user session:', error);
  }
};

const getUserSession = (): AuthenticatedUser | null => {
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
  const navigate = useNavigate();

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      console.log('AuthContext: Initializing authentication state...');
      const savedUser = getUserSession();
      
      if (savedUser) {
        console.log('AuthContext: Found saved user session:', savedUser.name);
        setUser(savedUser);
        setIsAuthenticated(true);
      } else {
        console.log('AuthContext: No saved user session found');
      }
      
      setAuthLoading(false);
    };

    initializeAuth();
  }, []);

  // Reset session function
  const resetSession = async (): Promise<void> => {
    try {
      console.log('AuthContext: Resetting session...');
      
      if (!user) {
        console.log('AuthContext: No active user session to reset');
        return;
      }

      // Query the users table to verify the user is still active
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('AuthContext: Session reset error:', error);
        throw error;
      }

      if (!userData) {
        console.log('AuthContext: User no longer active, logging out');
        await logout();
        return;
      }

      // Update the session with fresh user data
      const updatedUser: AuthenticatedUser = {
        id: userData.id,
        name: userData.name,
        role: userData.role as UserRole,
        phone_number: userData.phone_number,
        email: userData.email,
        is_active: userData.is_active,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      };

      saveUserSession(updatedUser);
      setUser(updatedUser);
      setIsAuthenticated(true);
      
      console.log('AuthContext: Session reset successful');
    } catch (error) {
      console.error('AuthContext: Failed to reset session:', error);
      await logout();
    }
  };

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

      // Query the users table directly
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('phone_number', phoneNumber)
        .eq('login_code', code)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('AuthContext: Database query error:', error);
        
        if (error.code === 'PGRST116') {
          throw new Error('Invalid phone number or login code');
        }
        
        throw new Error('Authentication failed. Please try again.');
      }

      if (!userData) {
        throw new Error('Invalid phone number or login code');
      }

      console.log('AuthContext: Login successful for user:', userData.name);

      // Create authenticated user object
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

      // Save session and update state
      saveUserSession(authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      
      // Clear the phone number after successful login
      setPhoneNumber('');

      // Navigate based on role
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
        message: error.message || 'An unexpected error occurred during login.' 
      };
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    
    try {
      console.log('AuthContext: Logging out user...');
      
      // Clear session and state
      clearUserSession();
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      
      // Navigate to login page
      navigate('/login');
      
      console.log('AuthContext: Logout successful');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    } finally {
      setAuthLoading(false);
    }
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
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      if (requiredRoles && user && !requiredRoles.includes(user.role)) {
        navigate('/unauthorized');
        return;
      }
    }
  }, [user, isAuthenticated, authLoading, requiredRoles, navigate]);

  return { user, isAuthenticated, authLoading };
};

// --- Role Check Utility ---
export const hasRole = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};