import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserRole, User as AppUser } from '../types/user';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

// ... (interfaces remain the same) ...

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

  // Use a ref to track if the initial full authentication check has completed successfully or with an error
  const initialAuthProcessCompleted = useRef(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      console.log("AuthContext: Component unmounted cleanup.");
    };
  }, []);

  const fetchUserProfile = useCallback(async (authUserId: string): Promise<AuthenticatedUser | null> => {
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
  }, []); // No dependencies, as it only uses supabase client

  const handleSession = useCallback(async (currentSession: Session | null, event: string) => {
    if (!isMounted.current) {
      console.log(`AuthContext: handleSession - Component unmounted during ${event} event, aborting.`);
      return;
    }
    
    setAuthLoading(true); // Always set loading at the start of handling a session
    console.log(`AuthContext: handleSession - Handling event: ${event}. Current session: ${currentSession ? 'Active' : 'Null'}`);

    try {
      if (currentSession) {
        const publicProfile = await fetchUserProfile(currentSession.user.id);
        if (!isMounted.current) {
          console.log(`AuthContext: handleSession - Component unmounted after fetchUserProfile during ${event}, aborting.`);
          return;
        }

        if (publicProfile) {
          setUser({ ...currentSession.user, ...publicProfile });
          setIsAuthenticated(true);
          setSessionTimeout((currentSession.expires_at || 0) * 1000);
          console.log(`AuthContext: handleSession - User and session set for ${event}.`);
        } else {
          console.warn(`AuthContext: handleSession - User authenticated but no public profile found during ${event}. Logging out.`);
          await logout(); // Force logout if no profile
        }
      } else {
        // User logged out or no session
        setUser(null);
        setIsAuthenticated(false);
        setSessionTimeout(null);
        console.log(`AuthContext: handleSession - No active session for ${event}.`);
        // Only navigate to login if not already there, and if it's a SIGNED_OUT event or initial null
        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !isAuthenticated)) {
            navigate('/login');
        }
      }
    } catch (err: any) {
      console.error(`AuthContext: handleSession - Uncaught error during ${event} session handling:`, err);
      // You could set an error state here if AuthContext has one
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
        console.log(`AuthContext: handleSession - Setting authLoading to false for ${event}.`);
      }
    }
  }, [fetchUserProfile, navigate]); // Added navigate to dependencies

  useEffect(() => {
    // Only run initial check if it hasn't completed
    if (initialAuthProcessCompleted.current) {
      console.log("AuthContext: useEffect - Initial auth process already completed, skipping first getSession.");
      return;
    }

    const checkInitialSession = async () => {
      console.log("AuthContext: useEffect - Starting initial session check via getSession()...");
      setAuthLoading(true); // Ensure loading is true right at the start
      
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("AuthContext: useEffect - Error from getSession():", sessionError.message);
          // Handle error, but ensure authLoading is set to false
          if (isMounted.current) {
            setUser(null);
            setIsAuthenticated(false);
            setSessionTimeout(null);
          }
        } else {
          // Pass the session and event type to the common handler
          await handleSession(currentSession, 'INITIAL_SESSION');
        }
      } catch (err: any) {
        console.error("AuthContext: useEffect - Uncaught error during initial getSession:", err);
      } finally {
        if (isMounted.current) {
          setAuthLoading(false);
          initialAuthProcessCompleted.current = true; // Mark as completed
          console.log("AuthContext: useEffect - Initial getSession process finished. authLoading set to false.");
        }
      }
    };

    checkInitialSession();

    console.log("AuthContext: Setting up onAuthStateChange listener.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      // Use the common handler for all auth state changes
      await handleSession(currentSession, _event);
    });

    return () => {
      if (subscription) {
        console.log("AuthContext: Cleaning up auth state subscription.");
        subscription.unsubscribe();
      }
    };
  }, [handleSession]); // Dependency on handleSession

  // Login function (sends OTP) - No changes here, it already ensures loading is handled by finally
  const login = async (phone: string) => {
    setAuthLoading(true);
    try {
      console.log(`AuthContext: Attempting to send OTP to ${phone}`);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        console.error("AuthContext: OTP send error:", error.message);
        return { success: false, message: error.message };
      }
      console.log("AuthContext: OTP sent successfully.");
      setPhoneNumber(phone);
      return { success: true, message: 'OTP sent successfully. Please verify.' };
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP send:", err);
      return { success: false, message: err.message || 'An unexpected error occurred during OTP send.' };
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  // Verify OTP function - No changes here, it already ensures loading is handled by finally
  const verifyOtp = async (phone: string, otp: string) => {
    setAuthLoading(true);
    try {
      console.log(`AuthContext: Attempting to verify OTP for ${phone} with code ${otp}`);
      const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (error) {
        console.error("AuthContext: OTP verification error:", error.message);
        return false;
      }
      if (data.session) {
        console.log("AuthContext: OTP verified. Session established.");
        setPhoneNumber('');
        return true;
      }
      console.log("AuthContext: OTP verification failed, but no specific error from Supabase.");
      return false;
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP verification:", err);
      return false;
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  // Logout function - No changes here, it already ensures loading is handled by finally
  const logout = async () => {
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
      }
    }
  };

  const resetSession = () => {
    console.log("AuthContext: resetSession called (Supabase handles JWT refresh).");
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