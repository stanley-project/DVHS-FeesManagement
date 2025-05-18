import { testUsers, testStudents, testFeeStructure, testPayments } from '../data/testData';

// Helper function to reset test data
export const resetTestData = () => {
  localStorage.clear();
  sessionStorage.clear();
  
  // Set up initial test data
  localStorage.setItem('testUsers', JSON.stringify(testUsers));
  localStorage.setItem('testStudents', JSON.stringify(testStudents));
  localStorage.setItem('testFeeStructure', JSON.stringify(testFeeStructure));
  localStorage.setItem('testPayments', JSON.stringify(testPayments));
};

// Helper function to simulate OTP verification
export const simulateOtpVerification = (phoneNumber: string, otp: string) => {
  // For testing, accept any 6-digit OTP
  return otp.length === 6 && /^\d+$/.test(otp);
};

// Helper function to simulate payment processing
export const simulatePayment = (amount: number, method: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `TEST-${Date.now()}`,
        amount,
        method,
      });
    }, 1000);
  });
};

// Helper function to validate phone numbers
export const validatePhoneNumber = (phoneNumber: string) => {
  return /^[6-9]\d{9}$/.test(phoneNumber);
};

// Helper function to check browser compatibility
export const checkBrowserCompatibility = () => {
  return {
    localStorage: typeof window.localStorage !== 'undefined',
    sessionStorage: typeof window.sessionStorage !== 'undefined',
    indexedDB: typeof window.indexedDB !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
  };
};

// Helper function to measure response times
export const measureResponseTime = async (callback: () => Promise<any>) => {
  const start = performance.now();
  const result = await callback();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
};