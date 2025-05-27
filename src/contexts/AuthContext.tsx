import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // <--- Import Supabase client
import { UserRole, User as AppUser } from '../types/user'; // Import your app's User type
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js'; // Import Supabase types

// Extend SupabaseAuthUser with your custom profile fields from public.users
interface AuthenticatedUser extends SupabaseAuthUser {
  role?: UserRole;
  name?: string;
  phone_number?: string;
  email?: string; // Ensure email is available if using it for login
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  // login: (phoneNumber: string) => Promise<{ success: boolean; message: string }>; // Modified to be async
  // verifyOtp: (otp: string) => Promise<boolean>; // Modified to be async
  login: (credentials: { phone?: string; email?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>; // Modified to be async
  authLoading: boolean; // Add authLoading state
  sessionTimeout: number | null; // This might become less relevant if Supabase handles session timeout
  setSessionTimeout: (timeout: number | null) => void;
  resetSession: () => void;
  rememberDevice: boolean;
  setRememberDevice: (remember: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_THRESHOLD = 5 * 60 * 1000; // Example: Show warning 5 minutes before actual token expiry

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // For phone-based login flow
  const [authLoading, setAuthLoading] = useState(true); // Indicates if Supabase auth state is being determined
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null); // For manual session management if needed
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const navigate = useNavigate();

  // Helper to fetch user profile from public.users
  const fetchUserProfile = async (authUserId: string): Promise<AuthenticatedUser | null> => {
    try {
      const { data: publicProfile, error: profileError } = await supabase
        .from('users') // Your public.users table
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
    // Initial session check and listener setup
    const initializeAuth = async () => {
      console.log("AuthContext: Initializing Supabase Auth...");
      setAuthLoading(true);

      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("AuthContext: Error getting initial session:", sessionError.message);
        setUser(null);
        setSessionTimeout(null);
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      if (currentSession) {
        console.log("AuthContext: Initial session found:", currentSession.user.id);
        const publicProfile = await fetchUserProfile(currentSession.user.id);
        
        if (publicProfile) {
          setUser({ ...currentSession.user, ...publicProfile });
          setIsAuthenticated(true);
          // Set session timeout based on JWT expiry (adjust as needed)
          setSessionTimeout((currentSession.expires_at || 0) * 1000 - Date.now()); // Convert to ms
        } else {
          // User authenticated with Supabase but no public profile found
          console.warn("AuthContext: User is authenticated but no public profile found. Logging out.");
          await logout(); // Consider logging them out if no profile
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

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log(`AuthContext: Auth state changed: ${_event}`);
      setAuthLoading(true); // Set loading while we process the change

      if (currentSession) {
        const publicProfile = await fetchUserProfile(currentSession.user.id);
        if (publicProfile) {
          setUser({ ...currentSession.user, ...publicProfile });
          setIsAuthenticated(true);
          setSessionTimeout((currentSession.expires_at || 0) * 1000 - Date.now());
        } else {
          console.warn("AuthContext: Auth change, but no public profile found. Logging out.");
          await logout();
        }
      } else {
        // User logged out
        setUser(null);
        setIsAuthenticated(false);
        setSessionTimeout(null);
        navigate('/login'); // Redirect to login on logout
      }
      setAuthLoading(false);
    });

    return () => {
      console.log("AuthContext: Cleaning up auth state subscription.");
      subscription.unsubscribe();
    };
  }, [navigate]); // navigate is a dependency

  // Manual session timeout check (less critical if Supabase handles JWT expiry)
  // You might still want this for UI warnings or specific app logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAuthenticated && sessionTimeout) {
      // Set a timer to trigger a "session expired" warning or logout
      timer = setTimeout(() => {
        console.log("AuthContext: Session timeout warning/logout triggered.");
        // This could be a gentle warning, or force logout:
        // logout();
        // navigate('/session-expired');
      }, sessionTimeout - SESSION_TIMEOUT_THRESHOLD); // Fire slightly before actual expiry
    }
    return () => clearTimeout(timer);
  }, [isAuthenticated, sessionTimeout, navigate]);


  // Login function using Supabase (for email/password or phone)
  const login = async ({ phone, email, password }: { phone?: string; email?: string; password?: string }) => {
    setAuthLoading(true);
    let authResponse;
    if (phone) {
      authResponse = await supabase.auth.signInWithOtp({ phone });
    } else if (email && password) {
      authResponse = await supabase.auth.signInWithPassword({ email, password });
    } else {
      setAuthLoading(false);
      return { success: false, message: 'Invalid login credentials provided.' };
    }

    const { data, error } = authResponse;

    if (error) {
      console.error("AuthContext: Login error:", error.message);
      setAuthLoading(false);
      return { success: false, message: error.message };
    }

    // If OTP was sent (phone login), the user still needs to verify
    if (phone && !data.session) {
      setPhoneNumber(phone); // Keep phone number for OTP verification step
      setAuthLoading(false);
      return { success: true, message: 'OTP sent successfully. Please verify.' };
    }
    
    // For password-based login or direct phone login that immediately authenticates
    if (data.session) {
      // The onAuthStateChange listener will handle setting user state
      console.log("AuthContext: Login successful. Session established.");
      setAuthLoading(false);
      return { success: true, message: 'Logged in successfully!' };
    }

    setAuthLoading(false);
    return { success: false, message: 'An unexpected login error occurred.' };
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
      // The onAuthStateChange listener will handle setting user state
      console.log("AuthContext: OTP verified. Session established.");
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
    // State will be cleared by onAuthStateChange listener
    console.log("AuthContext: User logged out.");
    setAuthLoading(false);
  };

  const resetSession = () => {
    // This function might need re-evaluation in a Supabase context
    // Supabase handles session refresh automatically.
    // If you're using this for idle logout, ensure it doesn't conflict.
    console.log("AuthContext: resetSession called (Supabase handles JWT refresh).");
    if (isAuthenticated && session?.expires_at) {
        setSessionTimeout(session.expires_at * 1000 - Date.now());
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
    setRememberDevice
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