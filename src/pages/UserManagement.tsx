import { UserPlus, Pencil, Trash2, Phone, Mail, Shield } from 'lucide-react';
import React, { useState } from 'react';

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock user data
  const users = [
    { id: '1', name: 'Admin User', role: 'administrator', phoneNumber: '9876543210', email: 'admin@deepthischool.edu', status: 'active' },
    { id: '2', name: 'Accountant User', role: 'accountant', phoneNumber: '9876543211', email: 'accountant@deepthischool.edu', status: 'active' },
    { id: '3', name: 'Teacher User', role: 'teacher', phoneNumber: '9876543212', email: 'teacher@deepthischool.edu', status: 'active' },
    { id: '4', name: 'Sandeep Sharma', role: 'teacher', phoneNumber: '9876543213', email: 'sandeep@deepthischool.edu', status: 'inactive' },
    { id: '5', name: 'Neha Singh', role: 'accountant', phoneNumber: '9876543214', email: 'neha@deepthischool.edu', status: 'active' },
  ];
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>User Management</h1>
        
        <button className="btn btn-primary btn-md inline-flex items-center">
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </button>
      </div>
      
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search users by name, email, or phone"
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div>
              <select className="input">
                <option value="all">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="accountant">Accountant</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            
            <div>
              <select className="input">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
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
                          <p className="text-xs text-muted-foreground">ID: {user.id}</p>
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{user.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1 hover:bg-muted rounded-md" title="Edit User">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="p-1 hover:bg-muted rounded-md" title="Delete User">
                          <Trash2 className="h-4 w-4 text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">5</span> of <span className="font-medium">5</span> users
            </p>
            <div className="flex gap-1">
              <button className="btn btn-outline btn-sm">Previous</button>
              <button className="btn btn-outline btn-sm">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;