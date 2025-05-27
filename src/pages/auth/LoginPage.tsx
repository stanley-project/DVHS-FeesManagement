import { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, setPhoneNumber: setAuthPhoneNumber, authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Effect to redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      navigate('/'); // Redirect to dashboard
    }
  }, [isAuthenticated, authLoading, user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => { // Keep async
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!phoneNumber || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    // Ensure E.164 format for Supabase
    // Assuming +91 is the country code, modify if different
    const formattedPhoneNumber = `+91${phoneNumber}`; 

    // Await the asynchronous login call to send OTP
    const result = await login(formattedPhoneNumber); 
    
    if (result.success) {
      // Store the formatted phone number in AuthContext for the /verify-otp page
      setAuthPhoneNumber(formattedPhoneNumber); 
      // Navigate to the separate OTP verification page
      navigate('/verify-otp');
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  // Combine local isLoading with authLoading from context for comprehensive loading state
  const isFormDisabled = isLoading || authLoading;

  // If already authenticated and loading has finished, we should be redirecting,
  // so no need to render the form. This prevents flickering.
  if (isAuthenticated && user && !authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Redirecting...</div>;
  }
  
  // If auth is still loading, show a general loading message
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Authenticating...</div>;
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Deepthi Vidyalayam</h1>
          <p className="text-muted-foreground">Fee Management System</p>
          <div className="mt-4 flex justify-center">
            <img 
              src="/src/components/auth/DVHS Logo.jpeg" 
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
                    disabled={isFormDisabled}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your registered phone number to receive an OTP
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isFormDisabled}
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