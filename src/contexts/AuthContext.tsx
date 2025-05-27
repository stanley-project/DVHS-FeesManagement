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
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  login: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  authLoading: boolean;
  sessionTimeout: number | null;
  setSessionTimeout: (timeout: number | null) => void;
  resetSession: () => void;
  rememberDevice: boolean;
  setRememberDevice: (remember: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true); // Initial loading state
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  // Ref to track if initial auth check has completed
  const initialAuthCheckDone = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchUserProfile = async (authUserId: string): Promise<AuthenticatedUser | null> => {
    try {
      console.log(`AuthContext: Fetching public profile for user ID: ${authUserId}`);
      const { data: publicProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('id', authUserId)
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
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isMounted.current) {
        console.log("AuthContext: initializeAuth - Component unmounted, aborting.");
        return;
      }
      if (initialAuthCheckDone.current) {
        console.log("AuthContext: initializeAuth - Initial check already done, skipping.");
        return;
      }

      console.log("AuthContext: initializeAuth - Setting authLoading to true.");
      setAuthLoading(true);

      try {
        console.log("AuthContext: initializeAuth - Calling supabase.auth.getSession()...");
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted.current) {
          console.log("AuthContext: initializeAuth - Component unmounted after getSession, aborting.");
          return;
        }

        if (sessionError) {
          console.error("AuthContext: initializeAuth - Error getting session:", sessionError.message);
          setUser(null);
          setSessionTimeout(null);
          setIsAuthenticated(false);
        } else if (currentSession) {
          console.log("AuthContext: initializeAuth - Session found. User ID:", currentSession.user.id);
          const publicProfile = await fetchUserProfile(currentSession.user.id);
          if (!isMounted.current) {
            console.log("AuthContext: initializeAuth - Component unmounted after fetchUserProfile, aborting.");
            return;
          }

          if (publicProfile) {
            setUser({ ...currentSession.user, ...publicProfile });
            setIsAuthenticated(true);
            setSessionTimeout((currentSession.expires_at || 0) * 1000);
            console.log("AuthContext: initializeAuth - User and session set from initial session.");
          } else {
            console.warn("AuthContext: initializeAuth - User authenticated but no public profile found. Logging out.");
            await logout(); // Force logout if no profile
          }
        } else {
          console.log("AuthContext: initializeAuth - No active Supabase session.");
          setUser(null);
          setIsAuthenticated(false);
          setSessionTimeout(null);
        }
      } catch (err: any) {
        console.error("AuthContext: initializeAuth - Uncaught error during initialization:", err);
        setError(err.message || "An unexpected error occurred during auth initialization."); // Add an error state if you have one in AuthContext
      } finally {
        if (isMounted.current) {
          setAuthLoading(false);
          initialAuthCheckDone.current = true; // Mark as done only if mounted
          console.log("AuthContext: initializeAuth - Setting authLoading to false. Initial check complete.");
        }
      }
    };

    initializeAuth();

    console.log("AuthContext: Setting up onAuthStateChange listener.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted.current) {
        console.log("AuthContext: onAuthStateChange - Component unmounted, aborting.");
        return;
      }
      
      console.log(`AuthContext: onAuthStateChange - Event: ${_event}. Current session: ${currentSession ? 'Active' : 'Null'}`);
      setAuthLoading(true); // Set loading while we process the change

      try {
        if (currentSession) {
          const publicProfile = await fetchUserProfile(currentSession.user.id);
          if (!isMounted.current) {
            console.log("AuthContext: onAuthStateChange - Component unmounted after fetchUserProfile, aborting.");
            return;
          }
          if (publicProfile) {
            setUser({ ...currentSession.user, ...publicProfile });
            setIsAuthenticated(true);
            setSessionTimeout((currentSession.expires_at || 0) * 1000);
            console.log("AuthContext: onAuthStateChange - User and session updated.");
          } else {
            console.warn("AuthContext: onAuthStateChange - Auth change, but no public profile found. Logging out.");
            await logout();
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setSessionTimeout(null);
          console.log("AuthContext: onAuthStateChange - User logged out or no session.");
          navigate('/login'); // Redirect to login on logout
        }
      } catch (err: any) {
        console.error("AuthContext: onAuthStateChange - Uncaught error during state change:", err);
        setError(err.message || "An unexpected error occurred during auth state change.");
      } finally {
        if (isMounted.current) {
          setAuthLoading(false);
          console.log("AuthContext: onAuthStateChange - Setting authLoading to false.");
        }
      }
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
    setAuthLoading(true); // Ensure loading is true before API call
    try {
      console.log(`AuthContext: Attempting to send OTP to ${phone}`);
      const { error } = await supabase.auth.signInWithOtp({ phone });

      if (error) {
        console.error("AuthContext: OTP send error:", error.message);
        return { success: false, message: error.message };
      }
      
      console.log("AuthContext: OTP sent successfully.");
      setPhoneNumber(phone); // Store phone number for verification step
      return { success: true, message: 'OTP sent successfully. Please verify.' };
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP send:", err);
      return { success: false, message: err.message || 'An unexpected error occurred during OTP send.' };
    } finally {
      if (isMounted.current) {
        setAuthLoading(false); // Always set loading to false in finally
      }
    }
  };

  // Verify OTP function
  const verifyOtp = async (phone: string, otp: string) => {
    setAuthLoading(true); // Ensure loading is true before API call
    try {
      console.log(`AuthContext: Attempting to verify OTP for ${phone} with code ${otp}`);
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });

      if (error) {
        console.error("AuthContext: OTP verification error:", error.message);
        return false;
      }

      if (data.session) {
        console.log("AuthContext: OTP verified. Session established.");
        // The onAuthStateChange listener will handle setting user state
        setPhoneNumber(''); // Clear phone number after successful verification
        return true;
      }

      console.log("AuthContext: OTP verification failed, but no specific error from Supabase.");
      return false; // Should not reach here if session is not set but no error
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP verification:", err);
      return false;
    } finally {
      if (isMounted.current) {
        setAuthLoading(false); // Always set loading to false in finally
      }
    }
  };

  const logout = async () => {
    setAuthLoading(true); // Ensure loading is true before API call
    try {
      console.log("AuthContext: Attempting to log out.");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Logout error:", error.message);
      }
      console.log("AuthContext: User logged out successfully (or error handled).");
      // State will be cleared by onAuthStateChange listener
    } catch (err: any) {
      console.error("AuthContext: Exception during logout:", err);
    } finally {
      if (isMounted.current) {
        setAuthLoading(false); // Always set loading to false in finally
      }
    }
  };

  const resetSession = () => {
    console.log("AuthContext: resetSession called (Supabase handles JWT refresh).");
    if (user && sessionTimeout) {
        // Your existing logic for sessionTimeout was more about UI/idle timeout.
        // If you still need this, ensure it's compatible with Supabase's auto-refresh.
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