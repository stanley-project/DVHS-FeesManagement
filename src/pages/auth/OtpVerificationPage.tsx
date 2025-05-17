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
  const { phoneNumber, verifyOtp, login } = useAuth();
  const navigate = useNavigate();

  // If no phone number is set, redirect to login
  useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
    }
  }, [phoneNumber, navigate]);

  // Timer for OTP resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last character if multiple are pasted
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus to next input if a digit is entered
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
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const otpString = otp.join('');
    
    // Basic validation
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setIsLoading(false);
      return;
    }

    // Try to verify OTP
    const isVerified = verifyOtp(otpString);
    
    if (isVerified) {
      navigate('/');
    } else {
      setError('Invalid OTP. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    
    // Reset timer and resend status
    setTimeLeft(60);
    setCanResend(false);
    
    // Simulate resending OTP
    const result = login(phoneNumber);
    if (!result.success) {
      setError(result.message);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only proceed if it looks like a 6-digit OTP
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('').slice(0, 6);
      setOtp(newOtp);
      // Focus on the last input
      inputRefs.current[5]?.focus();
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
          <button 
            onClick={() => navigate('/login')}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </button>
          
          <h2 className="text-xl font-semibold mb-2">Verify OTP</h2>
          <p className="text-muted-foreground mb-6">
            Enter the 6-digit code sent to {phoneNumber ? '+91 ' + phoneNumber : 'your phone'}
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
              disabled={isLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {isLoading ? 'Verifying...' : 'Verify & Proceed'}
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