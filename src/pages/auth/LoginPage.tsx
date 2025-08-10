// src/pages/auth/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct
import { School, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';
import { isNetworkOrResourceError } from '../../lib/supabase';

const LoginPage = () => {
  const [loginCode, setLoginCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const { login, phoneNumber, setPhoneNumber } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNetworkError(false);
    setIsLoading(true);

    // Basic validation for phone number
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      setError('Please enter a valid phone number');
      setIsLoading(false);
      return;
    }

    // Basic validation for login code
    if (!loginCode || !/^[A-HJ-NP-Z2-9]{8}$/.test(loginCode)) {
      setError('Please enter a valid login code');
      setIsLoading(false);
      return;
    }

    try {
      // Try to login with loginCode (phone number is already in context)
      const result = await login(loginCode);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
        
        // Check if the error is a network error
        if (isNetworkOrResourceError(new Error(result.message))) {
          setNetworkError(true);
          setRetryCount(prev => prev + 1);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred');
      
      // Check if the error is a network error
      if (isNetworkOrResourceError(error)) {
        setNetworkError(true);
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <div className="flex justify-center">
            <School className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Deepthi Vidyalayam</h1>
          <p className="text-muted-foreground">Fee Management System</p>
        </div>

        <div className="mt-8 bg-card rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {networkError && (
                    <p className="mt-1 text-xs">
                      Please check your internet connection and try again.
                    </p>
                  )}
                </div>
              </div>
              
              {networkError && retryCount < 3 && (
                <button 
                  onClick={handleSubmit}
                  className="mt-2 text-sm flex items-center gap-1 text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry login
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium">
                Phone Number
              </label>
              <div className="mt-1">
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    +91
                  </span>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="10-digit phone number"
                    className="input rounded-l-none"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your registered phone number
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="loginCode" className="block text-sm font-medium">
                Login Code
              </label>
              <div className="relative">
                <input
                  id="loginCode"
                  name="loginCode"
                  type={showCode ? "text" : "password"}
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="Enter your assigned code"
                  className="input pr-10"
                  maxLength={8}
                  style={{ letterSpacing: showCode ? '0.25em' : 'normal' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your assigned login code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default LoginPage;