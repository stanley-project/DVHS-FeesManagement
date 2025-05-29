// src/pages/auth/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct
import { School } from 'lucide-react'; // Assuming you want to keep the School icon

const LoginPage = () => {
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState(''); // Local state for displaying errors
  const [isLoading, setIsLoading] = useState(false); // Local loading state for form submission

  // Destructure necessary states and functions from useAuth
  const { login, authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Effect to redirect if already authenticated
  useEffect(() => {
    // Only redirect if authentication is complete and user is logged in
    if (isAuthenticated && user && !authLoading) {
      navigate('/'); // Redirect to dashboard
    }
  }, [isAuthenticated, authLoading, user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(''); // Clear previous errors
    setIsLoading(true); // Start local loading for this submission

    // Basic validation for login code format
    if (!loginCode || !/^[A-HJ-NP-Z2-9]{8}$/.test(loginCode)) {
      setError('Please enter a valid 8-character login code');
      setIsLoading(false); // End local loading
      return;
    }

    // Call the login function from AuthContext to verify the code
    const result = await login(loginCode);

    if (result.success) {
      navigate('/'); // Redirect to dashboard on successful login
    } else {
      setError(result.message);
    }

    setIsLoading(false); // End local loading
  };

  // Combine local isLoading with authLoading from context for comprehensive form disable state
  const isFormDisabled = isLoading || authLoading;

  // Show loading/redirect states to prevent flickering or incorrect UI rendering
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Authenticating...</div>;
  }
  if (isAuthenticated && user) { // If authenticated and user object exists, redirect
    return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Redirecting...</div>;
  }

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
              <label htmlFor="loginCode" className="block text-sm font-medium text-foreground">
                Login Code
              </label>
              <div className="mt-1">
                <input
                  id="loginCode"
                  name="loginCode"
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="Enter your 8-character code"
                  className="input"
                  maxLength={8}
                  pattern="[A-HJ-NP-Z2-9]{8}"
                  disabled={isFormDisabled}
                  style={{ letterSpacing: '0.25em' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your login code provided by the administrator.
                Codes only use letters A-H, J-N, P-Z and numbers 2-9.
              </p>
            </div>

            <button
              type="submit"
              disabled={isFormDisabled} // Use combined loading state
              className="btn btn-primary btn-lg w-full"
            >
              {isFormDisabled ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              For demo purposes, use: ADMIN123 (Admin), ACCT123 (Accountant), or TCHR123 (Teacher)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;