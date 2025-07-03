import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: Initializing authentication state...');
      
      const localSession = getUserSession();
      
      if (localSession?.user) {
        try {
          // Test Supabase connection first
          const { error: connectionError } = await supabase
            .from('users')
            .select('count')
            .limit(1);

          if (connectionError) {
            // Check if this is a network or resource error
            if (isNetworkOrResourceError(connectionError)) {
              console.warn('AuthContext: Network or resource error during initialization:', connectionError);
              toast.error('Network connection issue. Please check your internet connection.');
              // Don't clear session for network errors
              setUser(localSession.user);
              setIsAuthenticated(true);
              setAuthLoading(false);
              return;
            }
            
            console.error('AuthContext: Supabase connection failed:', connectionError);
            throw new Error('Database connection failed');
          }

          // Verify user is still active in database
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', localSession.user.id)
            .eq('is_active', true)
            .single();

          if (dbError) {
            // Check if this is a network or resource error
            if (isNetworkOrResourceError(dbError)) {
              console.warn('AuthContext: Network or resource error during user verification:', dbError);
              toast.error('Network connection issue. Please check your internet connection.');
              // Don't clear session for network errors
              setUser(localSession.user);
              setIsAuthenticated(true);
              setAuthLoading(false);
              return;
            }
            
            console.error('AuthContext: User verification failed:', dbError);
            throw new Error('User session invalid');
          }

          if (!userData) {
            throw new Error('User not found or inactive');
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
          
          // Only clear session for auth errors, not network errors
          if (!isNetworkOrResourceError(error)) {
            clearUserSession();
            toast.error('Your session has expired. Please log in again.');
          } else {
            // For network errors, keep the session but show a warning
            setUser(localSession.user);
            setIsAuthenticated(true);
            toast.error('Network connection issue. Some features may be limited.');
          }
        }
      } else {
        console.log('AuthContext: No saved user session found');
      }
      
      setAuthLoading(false);
    };

    initializeAuth();
  }, []);

  const isNetworkOrResourceError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    
    // Check for common network and resource error patterns
    return (
      errorMessage.includes('net::ERR_') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('AbortError') ||
      errorMessage.includes('Database connection failed') ||
      errorMessage.includes('database connection')
    );
  };

  const isAuthError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code;
    
    // Check for common auth error patterns
    return (
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('session invalid') ||
      errorMessage.includes('not authenticated') ||
      errorMessage.includes('auth/') ||
      errorMessage.includes('User session invalid') ||
      errorMessage.includes('Session expired') ||
      errorMessage.includes('User not found or inactive')
    );
  };

  const handleError = (error: any) => {
    console.error('AuthContext: Error handler called:', error);
    
    if (isAuthError(error)) {
      console.log('AuthContext: Auth error detected, logging out user');
      toast.error('Your session has expired. Please log in again.');
      logout();
    } else if (isNetworkOrResourceError(error)) {
      console.log('AuthContext: Network or resource error detected');
      toast.error('Network connection issue. Please check your internet connection and try again.');
    } else {
      console.log('AuthContext: General error detected');
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);
    
    try {
      if (!phoneNumber.trim() || !code.trim()) {
        throw new Error('Phone number and login code are required');
      }

      console.log('AuthContext: Verifying credentials...');

      // Test connection first
      const { error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (connectionError) {
        if (isNetworkOrResourceError(connectionError)) {
          console.error('AuthContext: Network connection failed:', connectionError);
          throw new Error('Unable to connect to server. Please check your internet connection and try again.');
        }
        
        console.error('AuthContext: Database connection failed:', connectionError);
        throw new Error('Unable to connect to database. Please try again later.');
      }

      // Verify the user credentials in your custom users table
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('login_code', code)
        .eq('is_active', true)
        .single();

      if (dbError) {
        if (isNetworkOrResourceError(dbError)) {
          console.error('AuthContext: Network error during login:', dbError);
          throw new Error('Network connection issue. Please check your internet connection and try again.');
        }
        
        console.error('AuthContext: Invalid credentials:', dbError);
        throw new Error('Invalid phone number or login code');
      }

      if (!userData) {
        throw new Error('Invalid phone number or login code');
      }

      if (!['administrator', 'accountant', 'teacher'].includes(userData.role)) {
        throw new Error('Invalid user role');
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

      // Save session and set authenticated state
      saveUserSession(authenticatedUser);
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setPhoneNumber('');

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
    console.log('AuthContext: Starting logout process...');
    
    try {
      // Prevent multiple logout calls
      if (authLoading) {
        console.log('AuthContext: Logout already in progress, skipping...');
        return;
      }

      setAuthLoading(true);

      // Clear user state immediately
      setUser(null);
      setIsAuthenticated(false);
      setPhoneNumber('');

      // Clear session storage
      clearUserSession();

      console.log('AuthContext: Logout completed, navigating to login...');
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      // Even if there's an error, ensure we clear everything and redirect
      setUser(null);
      setIsAuthenticated(false);
      clearUserSession();
      navigate('/login', { replace: true });
    } finally {
      setAuthLoading(false);
    }
  };

  const resetSession = async (): Promise<void> => {
    if (!user) return;

    try {
      // Test connection first
      const { error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (connectionError) {
        if (isNetworkOrResourceError(connectionError)) {
          console.warn('AuthContext: Network error during session reset:', connectionError);
          toast.error('Network connection issue. Session refresh delayed.');
          return; // Don't reset session for network errors
        }
        
        console.error('AuthContext: Database connection failed during reset:', connectionError);
        throw new Error('Database connection failed');
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (isNetworkOrResourceError(error)) {
          console.warn('AuthContext: Network error during user verification in reset:', error);
          toast.error('Network connection issue. Session refresh delayed.');
          return; // Don't reset session for network errors
        }
        
        console.error('AuthContext: User verification failed during reset:', error);
        throw new Error('User session invalid');
      }

      if (!userData) {
        throw new Error('User not found or inactive');
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
      
      // Only logout for auth errors, not network errors
      if (!isNetworkOrResourceError(error)) {
        await logout();
      } else {
        // For network errors, show a warning but don't logout
        toast.error('Network connection issue. Some features may be limited.');
      }
    }
  };

  const getRedirectPath = (role: UserRole): string => {
    switch (role) {
      case 'administrator':
        return '/';
      case 'accountant':
        return '/';
      case 'teacher':
        return '/';
      default:
        return '/';
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
    handleError
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

const useRequireAuth = (requiredRoles?: UserRole[]) => {
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

const hasRole = (userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean => {
  return userRole ? allowedRoles.includes(userRole) : false;
};