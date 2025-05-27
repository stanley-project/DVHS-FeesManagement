import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserRole, User as AppUser } from '../types/user';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

interface AuthenticatedUser extends SupabaseAuthUser {
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
  phoneNumber: string; // For the login form state
  setPhoneNumber: (phoneNumber: string) => void;
  login: (phone: string) => Promise<{ success: boolean; message: string }>; // Sends OTP
  verifyOtp: (phone: string, otp: string) => Promise<boolean>; // Verifies OTP
  logout: () => Promise<void>;
  authLoading: boolean;
  sessionTimeout: number | null;
  setSessionTimeout: (timeout: number | null) => void; // Keep for display
  resetSession: () => void;
  rememberDevice: boolean;
  setRememberDevice: (remember: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const navigate = useNavigate();
  const isMounted = useRef(true); // To handle unmounted component updates

  useEffect(() => {
      return () => {
          isMounted.current = false; // Mark component as unmounted
      };
  }, []);

  const fetchUserProfile = async (authUserId: string): Promise<AuthenticatedUser | null> => {
    try {
      const { data: publicProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('id', authUserId)
        .single();

      if (profileError) {
        console.error("AuthContext: Error fetching public profile:", profileError);
        return null;
      }
      return publicProfile as AuthenticatedUser;
    } catch (err) {
      console.error("AuthContext: Exception fetching public profile:", err);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isMounted.current) return;
      console.log("AuthContext: Initializing Supabase Auth...");
      setAuthLoading(true);

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted.current) return;

      if (sessionError) {
        console.error("AuthContext: Error getting initial session:", sessionError.message);
        setUser(null);
        setSessionTimeout(null);
        setIsAuthenticated(false);
      } else if (currentSession) {
        console.log("AuthContext: Initial session found. User ID:", currentSession.user.id);
        const publicProfile = await fetchUserProfile(currentSession.user.id);
        if (!isMounted.current) return;
        
        if (publicProfile) {
          setUser({ ...currentSession.user, ...publicProfile });
          setIsAuthenticated(true);
          setSessionTimeout((currentSession.expires_at || 0) * 1000); // Expiry time in ms
        } else {
          console.warn("AuthContext: User is authenticated but no public profile found. Logging out.");
          await logout(); // Force logout if no profile
        }
      } else {
        console.log("AuthContext: No active Supabase session.");
        setUser(null);
        setIsAuthenticated(false);
        setSessionTimeout(null);
      }
      setAuthLoading(false);
      console.log("AuthContext: Auth initialization complete.");
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted.current) return;
      console.log(`AuthContext: Auth state changed: ${_event}`);
      setAuthLoading(true); // Set loading while we process the change

      if (currentSession) {
        const publicProfile = await fetchUserProfile(currentSession.user.id);
        if (!isMounted.current) return;
        if (publicProfile) {
          setUser({ ...currentSession.user, ...publicProfile });
          setIsAuthenticated(true);
          setSessionTimeout((currentSession.expires_at || 0) * 1000);
        } else {
          console.warn("AuthContext: Auth change, but no public profile found. Logging out.");
          await logout();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSessionTimeout(null);
        navigate('/login'); // Redirect to login on logout
      }
      setAuthLoading(false);
    });

    return () => {
      if (subscription) {
        console.log("AuthContext: Cleaning up auth state subscription.");
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  // Login function (sends OTP)
  const login = async (phone: string) => {
    setAuthLoading(true);
    // Important: Ensure phone number is in E.164 format (e.g., +12345678900)
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      console.error("AuthContext: OTP send error:", error.message);
      setAuthLoading(false);
      return { success: false, message: error.message };
    }
    
    console.log("AuthContext: OTP sent successfully.");
    setPhoneNumber(phone); // Store phone number for verification step
    setAuthLoading(false);
    return { success: true, message: 'OTP sent successfully. Please verify.' };
  };

  // Verify OTP function
  const verifyOtp = async (phone: string, otp: string) => {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });

    if (error) {
      console.error("AuthContext: OTP verification error:", error.message);
      setAuthLoading(false);
      return false;
    }

    if (data.session) {
      console.log("AuthContext: OTP verified. Session established.");
      // The onAuthStateChange listener will handle setting user state
      setPhoneNumber(''); // Clear phone number after successful verification
      setAuthLoading(false);
      return true;
    }

    setAuthLoading(false);
    return false;
  };

  const logout = async () => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthContext: Logout error:", error.message);
      setAuthLoading(false);
      return;
    }
    console.log("AuthContext: User logged out.");
    // State will be cleared by onAuthStateChange listener
  };

  const resetSession = () => {
    // This is primarily for maintaining activity if needed, Supabase handles JWT refresh.
    console.log("AuthContext: resetSession called (Supabase handles JWT refresh).");
    if (user && sessionTimeout) {
        // Re-calculate sessionTimeout to the full expiry if current user is active.
        // This might involve re-fetching the session from Supabase to get latest expiry.
        // For simple use, relying on Supabase's automatic refresh might be enough.
    }
  };

  const value = {
    user,
    isAuthenticated,
    phoneNumber,
    setPhoneNumber,
    login,
    verifyOtp,
    logout,
    authLoading,
    sessionTimeout,
    setSessionTimeout,
    resetSession,
    rememberDevice,
    setRememberDevice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};