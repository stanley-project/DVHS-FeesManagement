import React, { useState } from 'react';
import { LogOut, Menu, Bell, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('TopBar: Initiating logout process...', new Date().toISOString());
      await logout();
    } catch (error) {
      console.error('TopBar: Error during logout:', error);
      // Force reload as a fallback
      window.location.href = '/login';
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Left side - Menu and Logo */}
        <div className="flex items-center">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-md"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:flex items-center space-x-4 ml-4">
            <span className="font-semibold text-lg">DVHS Fee Management</span>
          </div>
        </div>

        {/* Right side - User Menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 hover:bg-muted rounded-md">
            <Bell className="h-5 w-5" />
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                onClick={toggleUserMenu}
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline-block">{user.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background border animate-in fade-in slide-in-from-top-2">
                  <div className="py-1 border-b px-4 py-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
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
      </div>
    </header>
  );
};

export default TopBar;