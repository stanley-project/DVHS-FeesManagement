// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// --- Supabase Client Setup ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key must be set in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  loginCode: string | null;
  setLoginCode: (code: string | null) => void;
  login: (code: string) => Promise<{ success: boolean; message: string }>;
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
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      console.log("AuthContext: Component unmounted cleanup.");
    };
  }, []);

  // Check if login code exists and is valid
  const checkLoginCode = useCallback(async (code: string): Promise<{ exists: boolean; userData?: any }> => {
    try {
      console.log(`AuthContext: Checking login code: ${code}`);
      
      // Search for user with this login code
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('login_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error("AuthContext: Error checking login code:", error);
        return { exists: false };
      }

      if (userData) {
        console.log("AuthContext: Valid login code found:", userData);
        return { exists: true, userData };
      }

      console.log("AuthContext: Invalid or expired login code");
      return { exists: false };
    } catch (err) {
      console.error("AuthContext: Exception checking login code:", err);
      return { exists: false };
    }
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
  }, []);

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
        if (session?.user && session.user.phone) {
          // If a user session exists, fetch their custom role from the public.users table
          const publicProfile = await fetchUserProfile(session.user.phone);

          if (!isMounted.current) return;

          if (publicProfile) {
            setUser({ ...session.user, ...publicProfile, role: publicProfile.role });
            setIsAuthenticated(true);
            console.log(`AuthContext: User and session set for ${event}. User Role: ${publicProfile.role}`);
          } else {
            console.warn(`AuthContext: User authenticated but no public profile found during ${event}.`);
            // If no profile found, sign out as this shouldn't happen for pre-defined users
            await supabase.auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
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

  // Function to verify login code
  const login = async (code: string): Promise<{ success: boolean; message: string }> => {
    setAuthLoading(true);
    try {
      console.log(`AuthContext: Attempting to verify login code: ${code}`);
      
      // Check if login code is valid
      const { exists, userData } = await checkLoginCode(code);
      
      if (!exists) {
        console.log("AuthContext: Invalid login code");
        return { 
          success: false, 
          message: 'Invalid login code. Please try again.' 
        };
      }

      // Sign in with email/password using the login code as password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: code,
      });

      if (error) {
        console.error("AuthContext: Login error:", error.message);
        return { success: false, message: error.message };
      }
      
      console.log("AuthContext: Login successful");
      setLoginCode(code);
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
        setLoginCode(null);
      }
    }
  };

  const value = {
    user,
    isAuthenticated,
    authLoading,
    loginCode,
    setLoginCode,
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