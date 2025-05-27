import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Destructure login and setAuthPhoneNumber from useAuth
  // authLoading from useAuth can also be used for better loading state
  const { login, setPhoneNumber: setAuthPhoneNumber, authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated and loaded
  // This helps prevent showing the login page if the user is already logged in
  useState(() => { // Using useState with an immediate function for initial check
    if (isAuthenticated && user && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, user, navigate]);


  // Make handleSubmit an async function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); // Start local loading state

    // Basic validation
    if (!phoneNumber || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    // Ensure E.164 format for Supabase
    // Assuming +91 is the country code, modify if different
    const formattedPhoneNumber = `+91${phoneNumber}`; 

    // Await the asynchronous login call
    const result = await login(formattedPhoneNumber); 
    
    // Check the result from the async operation
    if (result.success) {
      // If OTP was successfully sent, store the phone number in AuthContext
      // and navigate to OTP verification page
      setAuthPhoneNumber(formattedPhoneNumber); // Store formatted number
      navigate('/verify-otp');
    } else {
      setError(result.message);
    }
    
    setIsLoading(false); // End local loading state
  };

  // Combine local isLoading with authLoading from context for comprehensive loading state
  const isFormDisabled = isLoading || authLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Deepthi Vidyalayam</h1>
          <p className="text-muted-foreground">Fee Management System</p>
          <div className="mt-4 flex justify-center">
            <img 
              src="/src/components/auth/DVHS Logo.jpeg" // Verify this path and if the image exists
              alt="DVHS Logo" 
              className="h-64 w-auto"
            />
          </div>
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