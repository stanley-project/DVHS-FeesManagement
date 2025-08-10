export type UserRole = 'administrator' | 'accountant' | 'teacher';

export interface User {
  id: string;
  name: string;
  phone_number: string; // Updated: Changed from phoneNumber to phone_number to match DB/API
  email: string;
  role: UserRole;
  is_active: boolean;    // Added: Reflects the 'is_active' column from public.users
  created_at: string;    // Added: Reflects the 'created_at' column from public.users
  updated_at: string;    // Added: Reflects the 'updated_at' column from public.users
  lastLogin?: string;    // Added: Derived from auth.users.last_sign_in_at, made optional as it might be null
  status: 'active' | 'inactive'; // Added: Derived property for UI display (from 'is_active')
  assignedClasses?: string[]; // Added: If this field is part of your user data, made optional
  login_code?: string;   // Added: Reflects the 'login_code' column from public.users
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  allowedRoles: UserRole[];
}