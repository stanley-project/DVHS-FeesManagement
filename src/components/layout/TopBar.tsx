import { useState } from 'react';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <button 
        onClick={toggleSidebar}
        className="p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <h1 className="text-lg font-semibold md:text-xl ml-2 lg:ml-0">
          Welcome, {user?.name}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-md text-muted-foreground hover:bg-muted focus:outline-none">
          <Bell className="h-5 w-5" />
        </button>

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