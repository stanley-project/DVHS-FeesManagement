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
  phoneNumber: string | null;
  setPhoneNumber: (phone: string | null) => void;
  login: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      console.log("AuthContext: Component unmounted cleanup.");
    };
  }, []);

  // Check if phone number exists in pre-defined users
  const checkUserExists = useCallback(async (phone: string): Promise<{ exists: boolean; userData?: any }> => {
    try {
      console.log(`AuthContext: Checking if user exists for phone: ${phone}`);
      
      // Clean phone number (remove all non-digits)
      const cleanPhone = phone.replace(/\D/g, '');
      console.log(`AuthContext: Cleaned phone number: ${cleanPhone}`);
      
      // For Indian numbers, remove country code if present
      let phoneToMatch = cleanPhone;
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        // Remove +91 country code for Indian numbers
        phoneToMatch = cleanPhone.substring(2);
        console.log(`AuthContext: Removed country code, searching for: ${phoneToMatch}`);
      }
      
      // Try multiple variations of the phone number
      const phoneVariations = [
        phone,                    // Original format (+918978469095)
        cleanPhone,              // All digits (918978469095)
        phoneToMatch,            // Without country code (8978469095)
        `+91${phoneToMatch}`,    // With +91 prefix
        `91${phoneToMatch}`      // With 91 prefix
      ];
      
      console.log(`AuthContext: Trying phone variations:`, phoneVariations);
      
      // Create OR condition for all phone variations
      const orConditions = phoneVariations.map(p => `phone_number.eq.${p}`).join(',');
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .or(orConditions)
        .maybeSingle();

      if (error) {
        console.error("AuthContext: Error checking user existence:", error);
        return { exists: false };
      }

      if (userData && userData.is_active !== false) {
        console.log("AuthContext: Pre-defined user found:", userData);
        return { exists: true, userData };
      }

      console.log("AuthContext: No active pre-defined user found for this phone number");
      return { exists: false };
    } catch (err) {
      console.error("AuthContext: Exception checking user existence:", err);
      return { exists: false };
    }
  }, []);

  // Fetch user profile from public.users table
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
        if (session?.user) {
          // If a user session exists, fetch their custom role from the public.users table
          const publicProfile = await fetchUserProfile(session.user.id);

          if (!isMounted.current) return;

          if (publicProfile) {
            setUser({ ...session.user, ...publicProfile, role: publicProfile.role });
            setIsAuthenticated(true);
            console.log(`AuthContext: User and session set for ${event}. User Role: ${publicProfile.role}`);
          } else {
            console.warn(`AuthContext: User authenticated but no public profile found during ${event}.`);
            setUser({ ...session.user, role: undefined });
            setIsAuthenticated(true);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          console.log(`AuthContext: No active session for ${event}.`);
        }
      } catch (err: any) {
        console.error(`AuthContext: Uncaught error during ${event} session handling:`, err);
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

  // Function to send OTP (only for pre-defined users)
  const login = async (phone: string) => {
    setAuthLoading(true);
    try {
      console.log(`AuthContext: Attempting to send OTP to ${phone}`);
      
      // First, check if this phone number exists in our pre-defined users
      const { exists, userData } = await checkUserExists(phone);
      
      if (!exists) {
        console.log("AuthContext: Phone number not found in pre-defined users");
        return { 
          success: false, 
          message: 'Phone number not registered. Please contact administrator.' 
        };
      }

      // If user exists in our table, proceed with OTP
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: 'sms',
          shouldCreateUser: true, // We need this to be true for phone auth to work
        },
      });

      if (error) {
        console.error("AuthContext: OTP send error:", error.message);
        return { success: false, message: error.message };
      }
      
      console.log("AuthContext: OTP sent successfully to pre-defined user.");
      setPhoneNumber(phone);
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

  // Function to verify OTP
  const verifyOtp = async (phone: string, otp: string) => {
    setAuthLoading(true);
    try {
      console.log(`AuthContext: Attempting to verify OTP for ${phone} with code ${otp}`);
      
      // Verify the OTP with Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error("AuthContext: OTP verification error:", error.message);
        return false;
      }

      if (data.session) {
        console.log("AuthContext: OTP verified. Session established.");
        
        // Double-check that this user still exists in our pre-defined users
        const { exists } = await checkUserExists(phone);
        if (!exists) {
          console.error("AuthContext: User no longer exists in pre-defined users, logging out");
          await supabase.auth.signOut();
          return false;
        }

        setPhoneNumber(null);
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

  // Function to log out the user
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};