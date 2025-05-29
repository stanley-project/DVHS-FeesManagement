
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

// --- Supabase Client Setup ---
// IMPORTANT: Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file
// For example:
// VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
// VITE_SUPABASE_ANON_KEY="your-anon-public-key"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check for environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL and Anon Key must be set in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
  // In a production app, you might want to stop execution or show a critical error message
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Type Definitions ---
// Define the structure of a user's role
export type UserRole = 'administrator' | 'accountant' | 'teacher' | 'student' | 'parent' | 'guest';

// Extend Supabase's User type to include our custom 'role' property
// This assumes your public.users table has 'id' and 'role'
export interface AuthenticatedUser extends User {
  role?: UserRole; // The role fetched from public.users table
  // Add other public profile fields if you fetch them
  name?: string;
  phone_number?: string;
  email?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Define the shape of the AuthContext's value
interface AuthContextType {
  user: AuthenticatedUser | null; // The authenticated user object with role
  isAuthenticated: boolean; // True if a user is currently authenticated
  authLoading: boolean; // True while authentication state is being determined or an auth operation is in progress
  phoneNumber: string | null; // Temporarily stores the phone number during the OTP flow
  setPhoneNumber: (phone: string | null) => void; // Function to set the phone number
  login: (phone: string) => Promise<{ success: boolean; message: string }>; // Function to send OTP
  verifyOtp: (phone: string, otp: string) => Promise<boolean>; // Function to verify OTP
  logout: () => Promise<void>; // Function to log out the user
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
interface AuthProviderProps {
  children: ReactNode; // React children to be rendered within the provider's scope
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true); // Initial loading state
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null); // State to hold phone number during OTP flow
  const isMounted = useRef(true); // To prevent state updates on unmounted component

  useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      isMounted.current = false;
      console.log("AuthContext: Component unmounted cleanup.");
    };
  }, []);

  // Callback to fetch user profile from public.users table
  const fetchUserProfile = useCallback(async (authUserId: string): Promise<AuthenticatedUser | null> => {
    try {
      console.log(`AuthContext: Fetching public profile for user ID: ${authUserId}`);
      const { data: publicProfile, error: profileError } = await supabase
        .from('users') // Assumes your public table for user roles is named 'users'
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at') // Select all relevant fields
        .eq('id', authUserId)
        .single(); // Expecting a single user record

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
  }, []); // No dependencies needed as supabase is a constant

  // Effect to listen for Supabase authentication state changes
  useEffect(() => {
    // onAuthStateChange is a real-time listener for auth events (SIGN_IN, SIGN_OUT, TOKEN_REFRESH, USER_UPDATED)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) {
        console.log(`AuthContext: onAuthStateChange - Component unmounted during ${event} event, aborting.`);
        return;
      }

      console.log('Auth state changed:', event, session);
      setAuthLoading(true); // Set loading at the start of handling any auth event

      try {
        if (session?.user) {
          // If a user session exists, fetch their custom role from the public.users table
          const publicProfile = await fetchUserProfile(session.user.id);

          if (!isMounted.current) return; // Check mount status again after async operation

          if (publicProfile) {
            // Combine Supabase auth user data with public profile data
            setUser({ ...session.user, ...publicProfile, role: publicProfile.role });
            setIsAuthenticated(true);
            console.log(`AuthContext: User and session set for ${event}. User Role: ${publicProfile.role}`);
          } else {
            console.warn(`AuthContext: User authenticated but no public profile found during ${event}.`);
            // If no public profile, we might consider them not fully authenticated for our app's purposes,
            // or assign a default 'guest' role if appropriate. For now, we'll set user but without role.
            setUser({ ...session.user, role: undefined });
            setIsAuthenticated(true);
          }
        } else {
          // If no session (user logged out or not authenticated), clear user state
          setUser(null);
          setIsAuthenticated(false);
          console.log(`AuthContext: No active session for ${event}.`);
        }
      } catch (err: any) {
        console.error(`AuthContext: Uncaught error during ${event} session handling:`, err);
      } finally {
        if (isMounted.current) {
          setAuthLoading(false); // Authentication state check is complete
          console.log(`AuthContext: Setting authLoading to false for ${event}.`);
        }
      }
    });

    // Cleanup function for the auth listener
    return () => {
      authListener.unsubscribe();
    };
  }, [fetchUserProfile]); // Dependency on fetchUserProfile

  // Function to send OTP (used by LoginPage)
  const login = async (phone: string) => {
    setAuthLoading(true); // Set loading state
    try {
      console.log(`AuthContext: Attempting to send OTP to ${phone}`);
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms', // Explicitly specify SMS channel for phone authentication
          shouldCreateUser: false, // <--- IMPORTANT: Prevents new user sign-ups
        },
      });

      if (error) {
        console.error("AuthContext: OTP send error:", error.message);
        return { success: false, message: error.message };
      }
      console.log("AuthContext: OTP sent successfully.");
      setPhoneNumber(phone); // Store the phone number temporarily
      return { success: true, message: 'OTP sent successfully! Please check your phone.' };
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP send:", err);
      return { success: false, message: err.message || 'An unexpected error occurred during OTP send.' };
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  // Function to verify OTP (used by OtpVerificationPage)
  const verifyOtp = async (phone: string, otp: string) => {
    setAuthLoading(true); // Set loading state
    try {
      console.log(`AuthContext: Attempting to verify OTP for ${phone} with code ${otp}`);
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms', // Explicitly specify SMS type for verification
      });

      if (error) {
        console.error("AuthContext: OTP verification error:", error.message);
        return false; // Indicate verification failed
      }
      if (data.session) {
        console.log("AuthContext: OTP verified. Session established.");
        setPhoneNumber(null); // Clear the phone number after successful verification
        return true; // Indicate verification succeeded
      }
      console.log("AuthContext: OTP verification failed, but no specific error from Supabase.");
      return false; // Should ideally not reach here if data.session is null and no error
    } catch (err: any) {
      console.error("AuthContext: Exception during OTP verification:", err);
      return false;
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  // Function to log out the user
  const logout = async () => {
    setAuthLoading(true); // Set loading state
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

  // The value provided by the AuthContext to its consumers
  const value = {
    user,
    isAuthenticated,
    authLoading,
    phoneNumber,
    setPhoneNumber,
    login,
    verifyOtp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook to Consume AuthContext ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error will be thrown if useAuth is called outside of an AuthProvider
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
