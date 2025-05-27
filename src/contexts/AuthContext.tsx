import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types/user';
import { mockUsers } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  login: (phoneNumber: string) => { success: boolean; message: string };
  verifyOtp: (otp: string) => boolean;
  logout: () => void;
  sessionTimeout: number | null;
  setSessionTimeout: (timeout: number | null) => void;
  resetSession: () => void;
  rememberDevice: boolean;
  setRememberDevice: (remember: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for user in localStorage on component mount
    const storedUser = localStorage.getItem('user');
    const storedRememberDevice = localStorage.getItem('rememberDevice') === 'true';
    
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setRememberDevice(storedRememberDevice);
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isAuthenticated && !rememberDevice) {
      timeoutId = setTimeout(() => {
        logout();
        navigate('/session-expired');
      }, SESSION_TIMEOUT);

      setSessionTimeout(Date.now() + SESSION_TIMEOUT);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated, rememberDevice, navigate]);

  const resetSession = () => {
    if (isAuthenticated && !rememberDevice) {
      setSessionTimeout(Date.now() + SESSION_TIMEOUT);
    }
  };

  const login = (enteredPhoneNumber: string) => {
    const userFound = mockUsers.find(user => user.phoneNumber === enteredPhoneNumber);
    
    if (userFound) {
      setPhoneNumber(enteredPhoneNumber);
      // In a real app, this would trigger an API call to send OTP
      console.log(`OTP would be sent to ${enteredPhoneNumber}`);
      return { success: true, message: 'OTP sent successfully' };
    }
    
    return { success: false, message: 'User is not enabled. Contact Admin' };
  };

  const verifyOtp = (otp: string) => {
    // In a real app, this would validate the OTP with an API
    if (otp && otp.length === 6) {
      const userFound = mockUsers.find(user => user.phoneNumber === phoneNumber);
      
      if (userFound) {
        setUser(userFound);
        setIsAuthenticated(true);
        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(userFound));
        localStorage.setItem('rememberDevice', rememberDevice.toString());
        return true;
      }
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setPhoneNumber('');
    setSessionTimeout(null);
    // Clear user from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('rememberDevice');
    navigate('/login');
  };

  const value = {
    user,
    isAuthenticated,
    phoneNumber,
    setPhoneNumber,
    login,
    verifyOtp,
    logout,
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


