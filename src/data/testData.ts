import { User, UserRole } from '../types/user';

// Test users for each role with valid phone numbers
export const testUsers: User[] = [
  {
    id: 'test-admin',
    name: 'Test Administrator',
    phoneNumber: '9876543210',
    role: 'administrator',
  },
  {
    id: 'test-accountant',
    name: 'Test Accountant',
    phoneNumber: '9876543211',
    role: 'accountant',
  },
  {
    id: 'test-teacher',
    name: 'Test Teacher',
    phoneNumber: '9876543212',
    role: 'teacher',
  },
];

// Test data for students
export const testStudents = [
  {
    id: 'test-student-1',
    admissionNumber: 'ST-2025001',
    name: 'Test Student 1',
    class: 'IX',
    section: 'A',
    admissionDate: '2025-06-01',
    status: 'active',
    // Add other required fields
  },
  // Add more test students
];

// Test data for fee structure
export const testFeeStructure = [
  {
    id: 'test-fee-1',
    name: 'Term 1 Fee',
    amount: 15000,
    dueDate: '2025-06-15',
    // Add other required fields
  },
  // Add more test fee structures
];

// Test data for payments
export const testPayments = [
  {
    id: 'test-payment-1',
    studentId: 'test-student-1',
    amount: 15000,
    paymentDate: '2025-06-10',
    paymentMethod: 'online',
    // Add other required fields
  },
  // Add more test payments
];