import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionExpiredPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md mx-auto animate-fadeIn">
        <div className="flex justify-center mb-6">
          <div className="bg-error/10 rounded-full p-6">
            <AlertCircle className="h-12 w-12 text-error" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Session Expired</h1>
        <p className="text-muted-foreground mb-6">
          Your session has expired due to inactivity. Please log in again to continue.
        </p>
        
        <button
          onClick={() => navigate('/login')}
          className="btn btn-primary btn-lg"
        >
          Log In Again
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredPage;