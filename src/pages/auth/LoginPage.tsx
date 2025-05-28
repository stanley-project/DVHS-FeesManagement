// src/pages/auth/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct
import { School } from 'lucide-react'; // Assuming you want to keep the School icon

const LoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState(''); // Local state for displaying errors
  const [isLoading, setIsLoading] = useState(false); // Local loading state for form submission

  // Destructure necessary states and functions from useAuth
  const { login, setPhoneNumber: setAuthPhoneNumber, authLoading, isAuthenticated, user } = useAuth();
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

    // Basic validation for phone number format
    if (!phoneNumber || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false); // End local loading
      return;
    }

    // Supabase requires phone numbers in E.164 format (e.g., +919876543210)
    const formattedPhoneNumber = `+91${phoneNumber}`; // Assuming +91 for India

    // Call the login function from AuthContext to send the OTP
    const result = await login(formattedPhoneNumber);

    if (result.success) {
      // If OTP sending was successful, store the formatted phone number in AuthContext
      // This is crucial for OtpVerificationPage to know which number to verify
      setAuthPhoneNumber(formattedPhoneNumber);
      // Navigate to the OTP verification page
      navigate('/verify-otp');
    } else {
      // Display error message from the login function
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
                    disabled={isFormDisabled} // Disable input while loading
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your registered phone number to receive an OTP
              </p>
            </div>

            <button
              type="submit"
              disabled={isFormDisabled} // Use combined loading state
              className="btn btn-primary btn-lg w-full"
            >
              {isFormDisabled ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              For demo purposes, use: 9876543210 (Admin), 9876543211 (Accountant), or 9876543212 (Teacher)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;