// src/components/TopBar.tsx (Assuming this is the correct path)
import { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path from your example
import { useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch'; // Assuming this component exists
import NotificationCenter from './NotificationCenter'; // Assuming this component exists

interface TopBarProps {
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const { user, logout, resetSession } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  // --- START: Logout specific state and handler from the second example ---
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('TopBar: Initiating logout process...', new Date().toISOString());
      await logout(); // This calls the logout function from AuthContext
      // Navigation to /login should be handled by the logout function in AuthContext
    } catch (error) {
      console.error('TopBar: Error during logout:', error);
      // Fallback if AuthContext logout or navigation fails
      // Ensure user is redirected even if there's an unexpected error in the logout process
      window.location.href = '/login'; 
    } finally {
      // setIsLoggingOut(false); // AuthContext.logout already sets authLoading, 
                               // and navigation will unmount this component or change state.
                               // If AuthContext's logout fails to navigate, the window.location.href handles it.
                               // Keeping it false or true depends on whether the component unmounts.
                               // For simplicity, if an error occurs and window.location.href is used,
                               // this component might unmount anyway. If logout() in AuthContext
                               // correctly handles navigation, this state might not be visible for long.
                               // We can remove this if AuthContext.logout handles navigation robustly.
                               // For now, let's keep it to ensure the button is re-enabled if something
                               // very unexpected happens and the component remains mounted without navigation.
      setIsLoggingOut(false); 
    }
  };
  // --- END: Logout specific state and handler ---

  // Reset session timeout on user activity (This was from your original code and is kept)
  useEffect(() => {
    const handleActivity = () => {
      if (user) { // Only reset session if a user is logged in
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
  }, [resetSession, user]); // Added user to dependencies

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleHomeClick = () => {
    navigate('/');
  };

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
          {user ? `Welcome, ${user.name}` : 'Welcome'}
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

        {user && ( // Only show user menu if user is logged in
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
                <div className="py-1">
                  <button
                    onClick={handleLogout} // Use the new handler
                    disabled={isLoggingOut} // Disable button when logging out
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-error hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-error" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging out...
                      </span>
                    ) : (
                      'Logout'
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
