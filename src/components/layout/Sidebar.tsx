import { School, Home } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { navItems, getIconComponent } from '../../data/mockData';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(
    item => user && item.allowedRoles.includes(user.role)
  );

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo and header */}
        <div 
          className="flex items-center justify-between h-16 px-4 border-b border-primary-foreground/10 cursor-pointer"
          onClick={handleHomeClick}
        >
          <div className="flex items-center space-x-2">
            <School className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Deepthi Vidyalayam</h2>
              <p className="text-xs text-white font-bold opacity-70">Fee Management System</p>
            </div>
          </div>
          <Home className="h-5 w-5 text-white hover:opacity-80" />
        </div>
        
        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {filteredNavItems.map((item) => {
            const Icon = getIconComponent(item.icon);
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => {
                  if (isOpen) toggleSidebar();
                }}
                className={({ isActive }) => 
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors font-bold",
                    isActive 
                      ? "bg-primary-foreground text-primary" 
                      : "text-white hover:text-primary-foreground hover:bg-primary-foreground/10"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;