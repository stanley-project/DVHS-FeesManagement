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