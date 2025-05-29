// src/pages/auth/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct
import { School } from 'lucide-react'; // Assuming you want to keep the School icon

const LoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, setPhoneNumber: setAuthPhoneNumber } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

    // Try to login
    setAuthPhoneNumber(phoneNumber);
    const result = await login(loginCode);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <div className="flex justify-center">
            <School className="h-12 w-12 text-primary" /> {/* School icon */}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Deepthi Vidyalayam</h1>
          <p className="text-muted-foreground">Fee Management System</p>
          {/* Consider replacing the local image path with an SVG or a public asset URL */}
          {/* <div className="mt-4 flex justify-center">
            <img
              src="/src/components/auth/DVHS Logo.jpeg"
              alt="DVHS Logo"
              className="h-64 w-auto"
            />
          </div> */}
        </div>

        <div className="mt-8 bg-card rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground">
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
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="loginCode" className="block text-sm font-medium text-foreground">
                Login Code
              </label>
              <input
                id="loginCode"
                name="loginCode"
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="Enter your login code"
                className="input"
                maxLength={8}
                style={{ letterSpacing: '0.25em' }}
              />
              <p className="text-xs text-muted-foreground">
                Enter your assigned login code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              For demo purposes, use:<br />
              Admin: 9876543210 / ADMIN123<br />
              Accountant: 9876543211 / ACCT123<br />
              Teacher: 9876543212 / TCHR123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;