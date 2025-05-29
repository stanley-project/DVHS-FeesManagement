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

  // Improved phone number normalization for Indian numbers
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log(`AuthContext: Normalizing phone: ${phone} -> cleaned: ${cleanPhone}`);
    
    // Handle Indian numbers specifically
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      // Valid 10-digit Indian mobile number (starts with 6,7,8,9)
      const normalized = `+91${cleanPhone}`;
      console.log(`AuthContext: 10-digit number normalized to: ${normalized}`);
      return normalized;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91') && /^91[6-9]/.test(cleanPhone)) {
      // 12-digit number starting with 91
      const normalized = `+${cleanPhone}`;
      console.log(`AuthContext: 12-digit number normalized to: ${normalized}`);
      return normalized;
    } else if (phone.startsWith('+91') && cleanPhone.length === 12) {
      // Already in correct format
      console.log(`AuthContext: Number already in E.164 format: ${phone}`);
      return phone;
    }
    
    throw new Error(`Invalid Indian phone number format: ${phone}. Expected 10-digit mobile number.`);
  };

  // Check if phone number exists in pre-defined users
  const checkUserExists = useCallback(async (phone: string): Promise<{ exists: boolean; userData?: any }> => {
    try {
      console.log(`AuthContext: Checking if user exists for phone: ${phone}`);
      
      // Normalize the phone number first
      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhoneNumber(phone);
      } catch (error) {
        console.error("AuthContext: Phone normalization failed:", error);
        return { exists: false };
      }
      
      // Extract just the 10-digit number for database comparison
      const tenDigitPhone = normalizedPhone.replace('+91', '');
      console.log(`AuthContext: Searching for 10-digit phone: ${tenDigitPhone}`);
      
      // Search in your users table using the 10-digit format
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', tenDigitPhone)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error("AuthContext: Error checking user existence:", error);
        return { exists: false };
      }

      if (userData) {
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

  // Create auth user if they don't exist (for pre-defined users only)
  const ensureAuthUserExists = async (phone: string): Promise<boolean> => {
    try {
      console.log(`AuthContext: Ensuring auth user exists for ${phone}`);
      
      // Try to sign up with a dummy password (won't be used for OTP)
      const { data, error } = await supabase.auth.signUp({
        phone: phone,
        password: Math.random().toString(36), // Random password, won't be used
      });

      if (error) {
        // User might already exist, which is fine
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          console.log("AuthContext: Auth user already exists");
          return true;
        }
        console.error("AuthContext: Error creating auth user:", error);
        return false;
      }
      
      console.log("AuthContext: Auth user created or already exists");
      return true;
    } catch (err) {
      console.error("AuthContext: Exception creating auth user:", err);
      return false;
    }
  };

  // Fetch user profile from public.users table
  const fetchUserProfile = useCallback(async (phoneNumber: string): Promise<AuthenticatedUser | null> => {
    try {
      console.log(`AuthContext: Fetching public profile for phone: ${phoneNumber}`);
      
      // Extract 10-digit phone for database lookup
      const tenDigitPhone = phoneNumber.replace('+91', '').replace(/\D/g, '');
      
      const { data: publicProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, role, phone_number, email, is_active, created_at, updated_at')
        .eq('phone_number', tenDigitPhone)
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

  // Function to send OTP (only for pre-defined users)
  const login = async (phone: string): Promise<{ success: boolean; message: string }> => {
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

      // Normalize phone number for Twilio/Supabase
      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhoneNumber(phone);
      } catch (error: any) {
        console.error("AuthContext: Phone normalization failed:", error);
        return { success: false, message: error.message };
      }
      
      console.log(`AuthContext: Normalized phone number for OTP: ${normalizedPhone}`);

      // Ensure the user exists in auth.users table first
      const authUserExists = await ensureAuthUserExists(normalizedPhone);
      if (!authUserExists) {
        return { success: false, message: 'Failed to prepare user for authentication' };
      }

      // Send OTP using Supabase Auth
      // CRITICAL FIX: Remove shouldCreateUser option - let Supabase handle it
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          channel: 'sms',
          // Removed shouldCreateUser: true - this was causing issues
        },
      });

      if (error) {
        console.error("AuthContext: OTP send error:", error.message);
        
        // Handle specific Twilio errors
        if (error.message.includes('60200') || error.message.includes('Invalid parameter')) {
          return { 
            success: false, 
            message: 'Invalid phone number format. Please check your phone number.' 
          };
        }
        
        if (error.message.includes('21211') || error.message.includes('invalid phone number')) {
          return { 
            success: false, 
            message: 'Phone number is not valid for SMS delivery.' 
          };
        }
        
        if (error.message.includes('trial')) {
          return { 
            success: false, 
            message: 'Trial account limitation. Please verify your phone number with Twilio first.' 
          };
        }
        
        return { success: false, message: error.message };
      }
      
      console.log("AuthContext: OTP sent successfully to pre-defined user.");
      setPhoneNumber(normalizedPhone);
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
  const verifyOtp = async (phone: string, otp: string): Promise<boolean> => {
    setAuthLoading(true);
    try {
      // Use the stored normalized phone number, or normalize the provided one
      const phoneToVerify = phoneNumber || normalizePhoneNumber(phone);
      console.log(`AuthContext: Attempting to verify OTP for ${phoneToVerify} with code ${otp}`);
      
      // Verify the OTP with Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneToVerify,
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