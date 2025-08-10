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

  // Enhanced network error detection
  const isNetworkOrResourceError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorName = error?.name || '';
    
    return (
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
      errorMessage.includes('ERR_NETWORK') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('ERR_CONNECTION_REFUSED') ||
      errorMessage.includes('ERR_CONNECTION_RESET') ||
      errorMessage.includes('ERR_CONNECTION_TIMED_OUT') ||
      errorMessage.includes('CORS') ||
      errorMessage.includes('cors') ||
      errorMessage.includes('Cross-Origin') ||
      errorMessage.includes('Server not reachable') ||
      errorMessage.includes('Unable to connect') ||
      errorMessage.includes('Connection failed')
    );
  };

  const isAuthError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code;
    
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

  // Fetch user data from public.users table
  const fetchUserData = async (userId: string): Promise<AuthenticatedUser | null> => {
    try {
      console.log('AuthContext: Fetching user data for ID:', userId);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('AuthContext: Error fetching user data:', error);
        return null;
      }

      if (!userData) {
        console.error('AuthContext: No user data found for ID:', userId);
        return null;
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

      console.log('AuthContext: Successfully fetched user data:', authenticatedUser.name, authenticatedUser.role);
      return authenticatedUser;
    } catch (error) {
      console.error('AuthContext: Exception fetching user data:', error);
      return null;
    }
  };

  // Set up Supabase auth state listener
  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state change event:', event, 'Session exists:', !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('AuthContext: User signed in, fetching user data...');
        const userData = await fetchUserData(session.user.id);
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          console.log('AuthContext: Authentication successful for:', userData.name);
        } else {
          console.error('AuthContext: Failed to fetch user data after sign in');
          setUser(null);
          setIsAuthenticated(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        setUser(null);
        setIsAuthenticated(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('AuthContext: Token refreshed, updating user data...');
        const userData = await fetchUserData(session.user.id);
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
      
      setAuthLoading(false);
    });

    // Check initial session
    const checkInitialSession = async () => {
      try {
        console.log('AuthContext: Checking initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Error getting initial session:', error);
          setAuthLoading(false);
          return;
        }

        if (session?.user) {
          console.log('AuthContext: Found existing session for user:', session.user.id);
          const userData = await fetchUserData(session.user.id);
          
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            console.log('AuthContext: Initial session restored for:', userData.name);
          }
        } else {
          console.log('AuthContext: No existing session found');
        }
      } catch (error) {
        console.error('AuthContext: Exception checking initial session:', error);
      }
      
      setAuthLoading(false);
    };

    checkInitialSession();

    return () => {
      console.log('AuthContext: Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('AuthContext: Error handler called:', error);
    
    if (isAuthError(error)) {
      console.log('AuthContext: Auth error detected, logging out user');
      toast.error('Your session has expired. Please log in again.');
      logout();
    } else if (isNetworkOrResourceError(error)) {
      console.log('AuthContext: Network error detected');
      toast.error('Network connection issue. Please check your internet connection and try again.');
    } else {
      console.log('AuthContext: General error detected');
      toast.error('An unexpected error occurred. Please try again.');
    }
  }, []);

  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!phoneNumber.trim() || !code.trim()) {
        throw new Error('Phone number and login code are required');
      }

      console.log('AuthContext: Starting custom login with phone:', phoneNumber);

      // Call the custom login Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/custom-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            login_code: code,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AuthContext: Edge Function error:', errorData);
        throw new Error(errorData.error || 'Authentication failed.');
      }

      const { session, user: authUser } = await response.json();
      console.log('AuthContext: Edge Function returned session:', !!session, 'Auth User:', !!authUser);

      if (!session || !authUser) {
        throw new Error('No session or user data returned from server');
      }

      // Set the session in Supabase Auth
      console.log('AuthContext: Setting session in Supabase Auth...');
      const { data, error: sessionError } = await supabase.auth.setSession(session);
      
      if (sessionError) {
        throw new Error('Failed to establish session');
      }

      console.log('AuthContext: Session set successfully:', !!data.session, 'User ID:', data.user?.id);

      // Clear the phone number
      setPhoneNumber('');

      // The onAuthStateChange listener will handle updating the user state
      return { 
        success: true, 
        message: 'Login successful! Redirecting...' 
      };

    } catch (error: any) {
      console.error('AuthContext: Login error:', error);
      
      if (isNetworkOrResourceError(error)) {
        return { 
          success: false, 
          message: 'Network connection issue. Please check your internet connection and try again.' 
        };
      }
      
      return { 
        success: false, 
        message: error.message || 'Authentication failed' 
      };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('AuthContext: Starting logout process...');
    
    try {
      // Sign out from Supabase Auth
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: Error during Supabase signOut:', error);
      }

      // Clear phone number
      setPhoneNumber('');

      console.log('AuthContext: Logout completed, navigating to login...');
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      // Even if there's an error, ensure we clear everything and redirect
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    }
  };

  const resetSession = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('AuthContext: Refreshing session...');
      
      // Refresh the current session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('AuthContext: Error refreshing session:', error);
        
        if (isAuthError(error)) {
          console.log('AuthContext: Auth error during refresh - logging out');
          await logout();
        }
        return;
      }

      if (data.session) {
        console.log('AuthContext: Session refreshed successfully');
        // The onAuthStateChange listener will handle updating the user state
      }
      
    } catch (error) {
      console.error('AuthContext: Session refresh failed:', error);
      
      if (isAuthError(error)) {
        console.log('AuthContext: Auth error during refresh - logging out');
        await logout();
      }
    }
  }, [user, logout]);

  // Set up periodic session refresh (every 15 minutes)
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      console.log('AuthContext: Running scheduled session refresh');
      resetSession();
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(intervalId);
  }, [user, isAuthenticated, resetSession]);

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

  // Navigate after successful authentication
  useEffect(() => {
    if (user && isAuthenticated && !authLoading) {
      const redirectPath = getRedirectPath(user.role);
      console.log('AuthContext: Navigating to:', redirectPath, 'for role:', user.role);
      navigate(redirectPath);
    }
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

// --- Custom Hooks ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};