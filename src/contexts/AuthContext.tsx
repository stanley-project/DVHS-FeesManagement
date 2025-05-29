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
        await logout(); // Make sure this logout call uses the fixed version
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
      await logout(); // Make sure this logout call uses the fixed version
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
        
        if (error.code === 'PGRST116') { // PGRST116: "Query result returned no rows"
          throw new Error('Invalid phone number or login code');
        }
        
        throw new Error('Authentication failed. Please try again.');
      }

      if (!userData) {
        // This case should ideally be caught by PGRST116, but as a fallback:
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

  // --- MODIFIED LOGOUT FUNCTION ---
  const logout = async (): Promise<void> => {
    setAuthLoading(true);
    console.log('AuthContext: Logging out user...');

    // Attempt to sign out from Supabase (best effort).
    // Since your login is custom and doesn't use supabase.auth.signIn,
    // a Supabase session might not exist or be relevant.
    // This step is to clear any potential Supabase session if one was somehow set.
    try {
      const { error: supabaseSignOutError } = await supabase.auth.signOut();
      if (supabaseSignOutError) {
        // Log the error but do not throw, as local logout is paramount.
        console.warn('AuthContext: Supabase signOut reported an error (proceeding with local logout):', supabaseSignOutError.message);
      }
    } catch (e) {
      // Catch any unexpected synchronous errors from supabase.auth.signOut() itself
      console.warn('AuthContext: Exception during Supabase signOut (proceeding with local logout):', e);
    }

    // Always perform local logout operations (clear session, update state)
    try {
      clearUserSession(); // Clear from localStorage
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber(''); // Clear phone number state

      console.log('AuthContext: Local session cleared. Navigating to /login.');
      navigate('/login'); // Navigate to the login page
      // Note: console.log after navigate might not always execute if navigation unmounts this component immediately.
    } catch (error) {
      console.error('AuthContext: Error during local logout operations (clearing session, updating state, or navigation):', error);
      // If local operations fail, the user might be in an inconsistent state,
      // but we ensure authLoading is reset in the finally block.
    } finally {
      setAuthLoading(false);
      // Moved console.log here to ensure it's seen even if navigation is very fast.
      console.log('AuthContext: Logout process finished.');
    }
  };
  // --- END OF MODIFIED LOGOUT FUNCTION ---


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