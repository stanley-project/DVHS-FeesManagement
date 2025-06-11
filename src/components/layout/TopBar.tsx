// src/components/layout/TopBar.tsx
import { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';

interface TopBarProps {
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const { user, logout, resetSession } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  // Logout specific state and handler
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      console.log('TopBar: Initiating logout process...', new Date().toISOString());
      
      await logout(); // This calls the logout function from AuthContext
      
      // Navigation to /login should be handled by the logout function in AuthContext
      // If for some reason it doesn't navigate, we'll handle it in the catch block
    } catch (error) {
      console.error('TopBar: Error during logout:', error);
      setLogoutError('Failed to logout. Please try again.');
      
      // Fallback if AuthContext logout or navigation fails
      // Ensure user is redirected even if there's an unexpected error in the logout process
      try {
        // Clear any local storage manually as fallback
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      } catch (fallbackError) {
        console.error('TopBar: Fallback logout failed:', fallbackError);
        // Last resort - reload the page
        window.location.reload();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Reset session timeout on user activity
  useEffect(() => {
    const handleActivity = () => {
      if (user) {
        resetSession();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [resetSession, user]);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  // Clear error when dropdown closes
  useEffect(() => {
    if (!dropdownOpen) {
      setLogoutError(null);
    }
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-semibold md:text-xl ml-2 lg:ml-0">
          {user ? `Welcome ${user.name}` : 'Welcome'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <GlobalSearch />

        <button 
          onClick={handleHomeClick}
          className="p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none"
        >
          <Home className="h-5 w-5" />
        </button>

        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none"
          >
            <Bell className="h-5 w-5" />
          </button>

          {notificationsOpen && (
            <NotificationCenter onClose={() => setNotificationsOpen(false)} />
          )}
        </div>

        {user && (
          <div className="relative">
            <button 
              onClick={toggleDropdown}
              className="flex items-center gap-2 p-1 rounded-full focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <User className="h-5 w-5" />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 z-20 animate-slideUp">
                <div className="py-1 border-b px-4 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
                
                {/* Error message display */}
                {logoutError && (
                  <div className="px-4 py-2 border-b">
                    <p className="text-xs text-error">{logoutError}</p>
                  </div>
                )}
                
                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-error hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
                    aria-label="Logout from account"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-error\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                            <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Logging out...</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;