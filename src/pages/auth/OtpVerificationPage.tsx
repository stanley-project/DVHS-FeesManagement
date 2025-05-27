import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Destructure authLoading, isAuthenticated, user from useAuth
  const { phoneNumber, verifyOtp, login, authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect logic:
  // 1. If no phone number is set in context (user navigated directly or session lost)
  // 2. If authentication is complete and user is already logged in
  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
    } else if (isAuthenticated && user && !authLoading) {
      navigate('/'); // User already logged in, go to dashboard
    }
  }, [phoneNumber, navigate, isAuthenticated, user, authLoading]);

  // Timer for OTP resend
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (timeLeft > 0 && !canResend) { // Only run timer if not resendable
      timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, canResend]); // Added canResend to dependency array for clarity

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if multiple are pasted
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus to next input if a digit is entered and not the last input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Navigate between inputs with arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      const newOtp = [...otp];
      newOtp[index - 1] = ''; // Clear previous input on backspace
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Backspace' && otp[index] && index === 0) {
        // Clear current input on backspace if at first digit
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
    }
  };

  // Make handleSubmit async
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const otpString = otp.join('');
    
    // Basic validation
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) { // Added regex check for all digits
      setError('Please enter a valid 6-digit OTP');
      setIsLoading(false);
      return;
    }

    // Ensure phone number is available
    if (!phoneNumber) {
        setError('Phone number not found. Please return to login page.');
        setIsLoading(false);
        navigate('/login'); // Force redirect if phone number is missing
        return;
    }

    // Await the asynchronous verifyOtp call
    const isVerified = await verifyOtp(phoneNumber, otpString);
    
    if (isVerified) {
      // The AuthContext's onAuthStateChange listener will handle setting user state
      // and redirecting to the dashboard ('/') upon successful login.
      // So, no need to navigate here explicitly, it will happen automatically.
      console.log('OTP Verified successfully! AuthContext will handle navigation.');
    } else {
      setError('Invalid OTP. Please try again.');
    }
    
    setIsLoading(false);
  };

  // Make handleResendOtp async
  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setError('');
    setIsLoading(true);

    // Reset timer and resend status
    setTimeLeft(60);
    setCanResend(false);
    
    if (!phoneNumber) {
        setError('Phone number not found. Cannot resend OTP.');
        setIsLoading(false);
        return;
    }

    // Await the asynchronous login call to resend OTP
    const result = await login(phoneNumber);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  // Combine local isLoading with authLoading from context for comprehensive loading state
  const isFormDisabled = isLoading || authLoading;

  // Show loading/redirect states
  if (authLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Authenticating...</div>;
  }
  if (isAuthenticated && user) { // If authenticated and user object exists, redirect
      return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Redirecting...</div>;
  }
  if (!phoneNumber) { // If no phoneNumber is in context, go back to login (handled by useEffect)
      return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Redirecting to login...</div>;
  }


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
          <button 
            onClick={() => navigate('/login')}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            disabled={isFormDisabled}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </button>
          
          <h2 className="text-xl font-semibold mb-2">Verify OTP</h2>
          <p className="text-muted-foreground mb-6">
            Enter the 6-digit code sent to {phoneNumber ? '+91 ' + phoneNumber.replace('+91', '') : 'your phone'}
            {/* Added .replace('+91', '') to display only the digits */}
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Verification Code
              </label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="input w-12 h-12 text-center text-xl"
                    disabled={isFormDisabled} // Disable input while loading
                  />
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {canResend ? (
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    className="text-primary hover:underline"
                    disabled={isFormDisabled} // Disable resend button while loading
                  >
                    Resend OTP
                  </button>
                ) : (
                  <>Resend OTP in <span className="font-medium">{timeLeft}s</span></>
                )}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isFormDisabled} // Use combined loading state
              className="btn btn-primary btn-lg w-full"
            >
              {isFormDisabled ? 'Verifying...' : 'Verify & Proceed'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              For demo purposes, enter any 6-digit code (e.g., 123456)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;