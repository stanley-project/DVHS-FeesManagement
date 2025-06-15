import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Phone, Shield, Search, Filter, Key, Eye, EyeOff, Copy, Check } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import LoginHistoryModal from '../components/users/LoginHistoryModal';
import PermissionsModal from '../components/users/PermissionsModal';
import LoginCodeModal from '../components/users/LoginCodeModal';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';
import { supabase } from '../lib/supabase';

const UserManagement = () => {
  const { user: currentUser, authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showLoginCode, setShowLoginCode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showLoginCodes, setShowLoginCodes] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(null);
  
  const {
    users,
    loading,
    error,
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

  // Calculate total pages and ensure current page is valid
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Reset pagination when filters change or when current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalCount, itemsPerPage, currentPage, totalPages]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus]);

  console.log("UserManagement: Component rendered.");
  console.log("  Auth Loading:", authLoading);
  console.log("  Current User:", currentUser ? currentUser.name : "Not logged in");
  console.log("  Users Hook - Loading:", loading);
  console.log("  Users Hook - Error:", error);
  console.log("  Users Hook - Users Array Length:", users.length);
  console.log("  Users Hook - Total Count:", totalCount);

  const handleUserAction = async (action, user) => {
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
        await handleDeleteUser(user);
        break;
      case 'permissions':
        setShowPermissions(true);
        break;
      case 'history':
        setShowLoginHistory(true);
        break;
      case 'loginCode':
        setShowLoginCode(true);
        break;
      default:
        break;
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      alert('User deleted successfully');
      await refreshUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name,
          role: userData.role,
          phone_number: userData.phone_number,
          login_code: userData.login_code,
          is_active: userData.status === 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);

      if (error) throw error;

      alert('User updated successfully');
      await refreshUsers();
      setShowUserForm(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Update user error:', err);
      alert(`Failed to update user: ${err.message}`);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          name: userData.name,
          role: userData.role,
          phone_number: userData.phone_number,
          login_code: userData.login_code,
          is_active: userData.status === 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      alert(`User created successfully! Login code: ${userData.login_code}`);
      await refreshUsers();
      setShowUserForm(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Create user error:', err);
      alert(`Failed to create user: ${err.message}`);
    }
  };

  const handleUpdateLoginCode = async (userId, newCode) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          login_code: newCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await refreshUsers();
    } catch (err) {
      throw new Error(err.message || 'Failed to update login code');
    }
  };

  const copyToClipboard = async (text, userId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUserId(userId);
      setTimeout(() => setCopiedUserId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handlePageChange = (newPage) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(validPage);
  };

  if (authLoading) {
    return <div className="text-center py-8">Authenticating...</div>;
  }

  // Check if user has admin privileges
  const canViewLoginCodes = currentUser?.role === 'administrator';
  const canManageUsers = currentUser?.role === 'administrator';

  if (!canManageUsers) {
    return (
      <div className="text-center py-8">
        <p className="text-error">Access denied. Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        
        <div className="flex gap-2">
          {canViewLoginCodes && (
            <button 
              className="btn btn-outline btn-md"
              onClick={() => setShowLoginCodes(!showLoginCodes)}
            >
              {showLoginCodes ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showLoginCodes ? 'Hide' : 'Show'} Login Codes
            </button>
          )}
          
          <button 
            className="btn btn-primary btn-md"
            onClick={() => {
              setSelectedUser(null);
              setShowUserForm(true);
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </button>
        </div>
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
                className="input pl-10 w-full"
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
          {error ? (
            <div className="text-center py-8 text-error">
              Error loading users: {error}
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
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
                    {canViewLoginCodes && showLoginCodes && (
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Login Code</th>
                    )}
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created At</th>
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
                            user.role === 'teacher' ? 'bg-accent text-accent-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
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
                          <span>{user.phone_number}</span>
                        </div>
                      </td>
                      {canViewLoginCodes && showLoginCodes && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                              {user.login_code || 'Not Set'}
                            </code>
                            {user.login_code && (
                              <button
                                onClick={() => copyToClipboard(user.login_code, user.id)}
                                className="p-1 hover:bg-muted rounded-md"
                                title="Copy Login Code"
                              >
                                {copiedUserId === user.id ? (
                                  <Check className="h-4 w-4 text-success" />
                                ) : (
                                  <Copy className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleUserAction('loginCode', user)}
                              className="p-1 hover:bg-muted rounded-md"
                              title="Manage Login Code"
                            >
                              <Key className="h-4 w-4 text-primary" />
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
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
                          {canViewLoginCodes && !showLoginCodes && (
                            <button
                              onClick={() => handleUserAction('loginCode', user)}
                              className="p-1 hover:bg-muted rounded-md"
                              title="Manage Login Code"
                            >
                              <Key className="h-4 w-4 text-primary" />
                            </button>
                          )}
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
              {totalCount > 0 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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
          onSubmit={async (data) => {
            if (selectedUser) {
              await handleUpdateUser({ ...data, id: selectedUser.id });
            } else {
              await handleCreateUser(data);
            }
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

      {/* Login Code Modal */}
      {showLoginCode && selectedUser && (
        <LoginCodeModal
          user={selectedUser}
          onClose={() => {
            setShowLoginCode(false);
            setSelectedUser(null);
          }}
          onUpdate={handleUpdateLoginCode}
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