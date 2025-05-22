import { User } from '../types/user';
import { NavItem } from '../types/user';
import { School, CircleDollarSign, Users, FileText, BookOpen, BarChart3, UserCog } from 'lucide-react';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    phoneNumber: '9876543210',
    email: 'admin@deepthischool.edu',
    role: 'administrator',
  },
  {
    id: '2',
    name: 'Accountant User',
    phoneNumber: '9876543211',
    email: 'accountant@deepthischool.edu',
    role: 'accountant',
  },
  {
    id: '3',
    name: 'Teacher User',
    phoneNumber: '9876543212',
    email: 'teacher@deepthischool.edu',
    role: 'teacher',
  },
];

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'BarChart3',
    allowedRoles: ['administrator', 'accountant', 'teacher'],
  },
  {
    title: 'Student Registration',
    href: '/student-registration',
    icon: 'Users',
    allowedRoles: ['administrator', 'accountant'],
  },
  {
    title: 'Fee Structure',
    href: '/fee-structure',
    icon: 'CircleDollarSign',
    allowedRoles: ['administrator'],
  },
  {
    title: 'Fee Collection',
    href: '/fee-collection',
    icon: 'CircleDollarSign',
    allowedRoles: ['administrator', 'accountant'],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: 'FileText',
    allowedRoles: ['administrator', 'accountant'],
  },
  {
    title: 'User Management',
    href: '/user-management',
    icon: 'UserCog',
    allowedRoles: ['administrator'],
  },
  {
    title: 'Student Fee Status',
    href: '/student-fee-status',
    icon: 'School',
    allowedRoles: ['teacher'],
  },
];

export const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'School':
      return School;
    case 'CircleDollarSign':
      return CircleDollarSign;
    case 'Users':
      return Users;
    case 'FileText':
      return FileText;
    case 'BookOpen':
      return BookOpen;
    case 'BarChart3':
      return BarChart3;
    case 'UserCog':
      return UserCog;
    default:
      return School;
  }
};