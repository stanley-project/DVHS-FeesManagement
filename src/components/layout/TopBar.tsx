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

  // Reset session timeout on user activity
  useEffect(() => {
    const handleActivity = () => {
      resetSession();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [resetSession]);

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
          Welcome {user?.name}
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
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-error hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;