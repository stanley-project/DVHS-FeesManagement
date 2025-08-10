import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';

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
  const [lastSessionReset, setLastSessionReset] = useState<number>(0);
  const [lastNetworkError, setLastNetworkError] = useState<number>(0);
  const navigate = useNavigate();

  // Enhanced network error detection
  const isNetworkOrResourceError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorName = error?.name || '';
    
    return (
      // Network errors
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('fetch') ||
      errorName === 'TypeError' && errorMessage.includes('fetch') ||
      errorMessage.includes('net::ERR_') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('Network request failed') ||
      errorMessage.includes('ERR_INSUFFICIENT_RESOURCES') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('AbortError') ||
      errorMessage.includes('Database connection failed') ||
      errorMessage.includes('database connection') ||
      // Connection issues
      errorMessage.includes('ERR_NETWORK') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('ERR_CONNECTION_REFUSED') ||
      errorMessage.includes('ERR_CONNECTION_RESET') ||
      errorMessage.includes('ERR_CONNECTION_TIMED_OUT') ||
      // CORS and other fetch-related errors
      errorMessage.includes('CORS') ||
      errorMessage.includes('cors') ||
      errorMessage.includes('Cross-Origin') ||
      // Server unreachable
      errorMessage.includes('Server not reachable') ||
      errorMessage.includes('Unable to connect') ||
      errorMessage.includes('Connection failed')
    );
  };

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

  // Debounced network error handler to prevent multiple toasts
  const handleNetworkError = useCallback(
    debounce((error: any) => {
      const now = Date.now();
      // Only show network error toast once every 10 seconds
      if (now - lastNetworkError > 10000) {
        setLastNetworkError(now);
        console.log('AuthContext: Network or resource error detected');
        toast.error('Network connection issue. Please check your internet connection and try again.');
      }
    }, 500),
    [lastNetworkError]
  );

  const handleError = useCallback((error: any) => {
    console.error('AuthContext: Error handler called:', error);
    
    if (isAuthError(error)) {
      console.log('AuthContext: Auth error detected, logging out user');
      toast.error('Your session has expired. Please log in again.');
      logout();
    } else if (isNetworkOrResourceError(error)) {
      handleNetworkError(error);
    } else {
      console.log('AuthContext: General error detected');
      toast.error('An unexpected error occurred. Please try again.');
    }
  }, []);

const login = async (code: string): Promise<{ success: boolean; message: string }> => {
  setAuthLoading(true);
  
  try {
    if (!phoneNumber.trim() || !code.trim()) {
      throw new Error('Phone number and login code are required');
    }

    console.log('AuthContext: Verifying credentials...');

    // Validate credentials directly against users table
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
      console.error('AuthContext: DB profile lookup failed:', dbError);
      return { success: false, message: 'Invalid phone number or login code' };
    }

    if (!userData) {
      return { success: false, message: 'Invalid phone number or login code' };
    }

    if (!['administrator', 'accountant', 'teacher'].includes(userData.role)) {
      return { success: false, message: 'Invalid user role' };
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

  const resetSession = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      const now = Date.now();
      
      // Throttle session resets to once every 5 minutes
      if (now - lastSessionReset < 5 * 60 * 1000) {
        console.log('AuthContext: Session reset throttled - last reset was less than 5 minutes ago');
        return;
      }
      
      console.log('AuthContext: Starting session reset...');
      setLastSessionReset(now);
      
      // Test connection first with enhanced error handling
      const { error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (connectionError) {
        console.warn('AuthContext: Connection error during session reset:', connectionError);
        
        if (isNetworkOrResourceError(connectionError)) {
          console.warn('AuthContext: Network error during session reset - keeping session active');
          // Don't show toast for network errors during routine session reset
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
        console.warn('AuthContext: Error during user verification in reset:', error);
        
        if (isNetworkOrResourceError(error)) {
          console.warn('AuthContext: Network error during user verification - keeping session active');
          // Don't show toast for network errors during routine session reset
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
      
      console.log('AuthContext: Session reset completed successfully');
      
    } catch (error) {
      console.error('AuthContext: Session reset failed:', error);
      
      // Only logout for auth errors, not network errors
      if (!isNetworkOrResourceError(error)) {
        console.log('AuthContext: Auth error during reset - logging out');
        await logout();
      } else {
        // For network errors, show a warning but don't logout
        console.log('AuthContext: Network error during reset - keeping session active');
        // Don't show toast for network errors during routine session reset
      }
    }
  }, [user, lastSessionReset, logout]);

  // Set up a periodic session refresh (every 15 minutes)
  useEffect(() => {
    if (!user) return;
    
    const intervalId = setInterval(() => {
      console.log('AuthContext: Running scheduled session refresh');
      resetSession();
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(intervalId);
  }, [user, resetSession]);

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
