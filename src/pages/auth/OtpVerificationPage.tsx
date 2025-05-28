// src/pages/auth/OtpVerificationPage.tsx
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Ensure this path is correct

const OtpVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(''); // Local state for displaying errors
  const [isLoading, setIsLoading] = useState(false); // Local loading state for form submission
  const [timeLeft, setTimeLeft] = useState(60); // Timer for OTP resend
  const [canResend, setCanResend] = useState(false); // State to enable/disable resend button
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]); // Refs for OTP input fields

  // Destructure necessary states and functions from useAuth
  const { phoneNumber, verifyOtp, login, authLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // --- Redirect Logic ---
  useEffect(() => {
    // If no phone number is set in context (user navigated directly or session lost), redirect to login
    if (!phoneNumber) {
      navigate('/login');
    }
    // If authentication is complete and user is already logged in, redirect to dashboard
    else if (isAuthenticated && user && !authLoading) {
      navigate('/');
    }
  }, [phoneNumber, navigate, isAuthenticated, user, authLoading]);

  // --- Timer for OTP Resend ---
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (timeLeft > 0 && !canResend) {
      timerId = setTimeout(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
      return () => clearTimeout(timerId); // Cleanup timer on component unmount or re-render
    } else if (timeLeft === 0) {
      setCanResend(true); // Enable resend button when timer runs out
    }
  }, [timeLeft, canResend]); // Depend on timeLeft and canResend

  // --- OTP Input Handlers ---
  const handleChange = (index: number, value: string) => {
    // Only allow digits for OTP input
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if multiple characters are pasted/typed
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus to the next input field if a digit is entered and it's not the last input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      // Move focus to the previous input on Left Arrow key press
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      // Move focus to the next input on Right Arrow key press
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current input is empty, move to previous and clear it on Backspace
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index] && index === 0) {
        // If at the first input and it has a digit, clear it
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default paste behavior
    const pasteData = e.clipboardData.getData('text');
    // Only process if pasted data is a 6-digit number
    if (/^\d{6}$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      // Optionally, focus the last input after pasting
      inputRefs.current[5]?.focus();
    } else {
      setError('Invalid paste: Please paste a 6-digit number.');
    }
  };

  // --- Form Submission Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError(''); // Clear previous errors
    setIsLoading(true); // Start local loading

    const otpString = otp.join(''); // Combine OTP digits into a single string

    // Basic validation for OTP format
    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      setError('Please enter a valid 6-digit OTP');
      setIsLoading(false); // End local loading
      return;
    }

    // Ensure phone number is available from context
    if (!phoneNumber) {
      setError('Phone number not found. Please return to login page.');
      setIsLoading(false); // End local loading
      navigate('/login'); // Force redirect if phone number is missing
      return;
    }

    // Call the verifyOtp function from AuthContext
    const isVerified = await verifyOtp(phoneNumber, otpString);

    if (isVerified) {
      // AuthContext's onAuthStateChange listener will handle setting user state
      // and redirecting to the dashboard ('/') upon successful login.
      console.log('OTP Verified successfully! AuthContext will handle navigation.');
    } else {
      setError('Invalid OTP. Please try again.');
    }

    setIsLoading(false); // End local loading
  };

  // --- Resend OTP Handler ---
  const handleResendOtp = async () => {
    if (!canResend) return; // Prevent resending if timer is still active

    setError(''); // Clear previous errors
    setIsLoading(true); // Start local loading

    // Reset timer and resend status
    setTimeLeft(60);
    setCanResend(false);

    // Ensure phone number is available
    if (!phoneNumber) {
      setError('Phone number not found. Cannot resend OTP.');
      setIsLoading(false); // End local loading
      return;
    }

    // Call the login function from AuthContext to resend OTP
    const result = await login(phoneNumber);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false); // End local loading
  };

  // Combine local isLoading with authLoading from context for comprehensive loading state
  const isFormDisabled = isLoading || authLoading;

  // Show loading/redirect states to prevent flickering or incorrect UI rendering
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6">Authenticating...</div>;
  }
  if (isAuthenticated && user) {
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
              {/* Added onPaste handler to the container div */}
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
                    disabled={isFormDisabled}
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
                    disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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