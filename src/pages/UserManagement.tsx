import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Phone, Shield, Search, Filter } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import LoginHistoryModal from '../components/users/LoginHistoryModal';
import PermissionsModal from '../components/users/PermissionsModal';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';

const UserManagement = () => {
  const { user: currentUser, authLoading } = useAuth(); // Added authLoading to track auth status
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Destructure values from useUsers hook
  const {
    users,
    loading, // loading status from useUsers
    error,   // error message from useUsers
    totalCount,
    refreshUsers
  } = useUsers({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery,
    role: selectedRole !== 'all' ? selectedRole : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // --- BEGIN NEW LOGGING ---
  console.log("UserManagement: Component rendered.");
  console.log("  Auth Loading:", authLoading);
  console.log("  Current User:", currentUser ? currentUser.email : "Not logged in");
  console.log("  Users Hook - Loading:", loading);
  console.log("  Users Hook - Error:", error);
  console.log("  Users Hook - Users Array Length:", users.length);
  console.log("  Users Hook - Total Count:", totalCount);
  // --- END NEW LOGGING ---

  const handleUserAction = async (action: string, user: any) => {
    setSelectedUser(user);
    
    switch (action) {
      case 'edit':
        setShowUserForm(true);
        break;
      case 'delete':
        if (user.id === currentUser?.id) {
          alert('You cannot delete your own account!');
          return;
        }
        // Show confirmation dialog and handle deletion
        if (confirm('Are you sure you want to delete this user?')) {
          console.log('Delete user:', user);
          // TODO: Implement actual user deletion logic here
          // After deletion, refresh the user list:
          // await refreshUsers();
        }
        break;
      case 'permissions':
        setShowPermissions(true);
        break;
      case 'history':
        setShowLoginHistory(true);
        break;
      default:
        break;
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // You might want to show a general loading/error state if auth is still loading
  if (authLoading) {
    console.log("UserManagement: Auth is still loading, showing initial loading screen.");
    return <div className="text-center py-8">Authenticating...</div>;
  }

  // Primary rendering logic based on useUsers hook state
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>User Management</h1>
        
        <button 
          className="btn btn-primary btn-md inline-flex items-center"
          onClick={() => {
            setSelectedUser(null);
            setShowUserForm(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </button>
      </div>
      
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search by name or phone number"
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                className="input"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="accountant">Accountant</option>
                <option value="teacher">Teacher</option>
              </select>
              
              <select
                className="input"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          {/* Users Table */}
          {error ? ( // Check for error from useUsers hook
            <div className="text-center py-8 text-error">
              Error loading users: {error}
            </div>
          ) : loading ? ( // Check for loading from useUsers hook
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : users.length === 0 ? ( // Check if no users are found after loading
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          user.role === 'administrator' ? 'bg-primary text-primary-foreground' :
                          user.role === 'accountant' ? 'bg-secondary text-secondary-foreground' :
                          'bg-accent text-accent-foreground'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          {user.role === 'teacher' && user.assignedClasses && user.assignedClasses.length > 0 && ( // Added null check for assignedClasses
                            <p className="text-xs text-muted-foreground">
                              Classes: {user.assignedClasses.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.phone_number}</span> {/* Corrected: Use phone_number */}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'} {/* Format date and handle null */}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-1 hover:bg-muted rounded-md" 
                          title="Edit User"
                          onClick={() => handleUserAction('edit', user)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button 
                          className="p-1 hover:bg-muted rounded-md" 
                          title="Delete User"
                          onClick={() => handleUserAction('delete', user)}
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 className={`h-4 w-4 ${
                            user.id === currentUser?.id ? 'text-muted-foreground' : 'text-error'
                          }`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t p-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onClose={() => {
            setShowUserForm(false);
            setSelectedUser(null);
          }}
          onSubmit={(data) => {
            console.log('Form submitted:', data);
            setShowUserForm(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Login History Modal */}
      {showLoginHistory && selectedUser && (
        <LoginHistoryModal
          user={selectedUser}
          onClose={() => {
            setShowLoginHistory(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Permissions Modal */}
      {showPermissions && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setShowPermissions(false);
            setSelectedUser(null);
          }}
          onSave={(permissions) => {
            console.log('Permissions updated:', permissions);
            setShowPermissions(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;