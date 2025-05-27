export type UserRole = 'administrator' | 'accountant' | 'teacher';

export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  allowedRoles: UserRole[];
}

// src/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string; // From public.users
  phone_number: string; // From public.users
  is_active: boolean; // From public.users
  role: string; // From public.users
  created_at: string; // From public.users
  updated_at: string; // From public.users
  lastLogin?: string; // This will be mapped from auth.users.last_sign_in_at
  status: 'active' | 'inactive'; // Derived from is_active
  assignedClasses?: string[]; // If this field exists and is used elsewhere, keep it. For now, assuming it's an array of strings.
}