import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export type UserRole = 'administrator' | 'accountant' | 'teacher' | 'student' | 'parent';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  phone_number: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  verifyOtp?: (phone: string, otp: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Supabase client
const supabase: SupabaseClient = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          console.log('AuthContext: Restored user session', new Date().toISOString());
        } else {
          console.log('AuthContext: No saved user session found');
        }
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        // Clear potentially corrupted data
        clearUserSession();
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Helper function to clear user session
  const clearUserSession = (): void => {
    try {
      const itemsToClear = [
        'user',
        'authToken',
        'sessionData',
        'phoneNumber',
        'lastLoginTime',
        'userPreferences'
      ];

      itemsToClear.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          console.warn(`AuthContext: Failed to remove ${item} from localStorage:`, e);
        }
      });

      console.log('AuthContext: User session cleared from localStorage', new Date().toISOString());
    } catch (error) {
      console.error('AuthContext: Error in clearUserSession:', error);
      throw error;
    }
  };

  // Updated logout function with enhanced error handling and cleanup
  const logout = async (): Promise<void> => {
    const logoutStartTime = new Date().toISOString();
    console.log('AuthContext: Starting logout process...', logoutStartTime);
    
    try {
      setAuthLoading(true);
      
      // 1. Clear Supabase session
      try {
        const { error: supabaseError } = await supabase.auth.signOut();
        if (supabaseError) {
          console.warn('AuthContext: Supabase signOut warning:', supabaseError.message);
        }
      } catch (supabaseError) {
        console.warn('AuthContext: Supabase signOut failed:', supabaseError);
      }

      // 2. Clear local storage
      try {
        clearUserSession();
        console.log('AuthContext: Local storage cleared');
      } catch (storageError) {
        console.error('AuthContext: Error clearing local storage:', storageError);
        // Emergency cleanup
        try {
          localStorage.clear();
          console.log('AuthContext: Emergency localStorage cleanup completed');
        } catch (e) {
          console.error('AuthContext: Critical failure - could not clear localStorage:', e);
        }
      }

      // 3. Reset auth states
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      console.log('AuthContext: Auth states reset');

      // 4. Force navigation to login
      console.log('AuthContext: Initiating navigation to login page');
      window.location.href = '/login';
      
    } catch (error) {
      console.error('AuthContext: Critical error during logout:', error);
      // Last resort emergency cleanup
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');
      try {
        localStorage.clear();
      } catch (e) {
        console.error('AuthContext: Failed emergency cleanup:', e);
      }
      window.location.href = '/login';
    } finally {
      setAuthLoading(false);
      console.log('AuthContext: Logout process completed', new Date().toISOString());
    }
  };

  // Login function
  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);
    
    try {
      if (!phoneNumber.trim()) {
        throw new Error('Phone number is required');
      }
      
      if (!code.trim()) {
        throw new Error('Login code is required');
      }

      // Your existing login logic here...
      // This is a placeholder for your actual login implementation
      
      return {
        success: true,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred during login.'
      };
    } finally {
      setAuthLoading(false);
    }
  };

  // Reset session function
  const resetSession = async (): Promise<void> => {
    try {
      if (!user) {
        console.log('AuthContext: No active user session to reset');
        return;
      }

      // Your existing session reset logic here...
      
    } catch (error) {
      console.error('AuthContext: Failed to reset session:', error);
      await logout();
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
    resetSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;