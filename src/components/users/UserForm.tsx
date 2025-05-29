import { useState, useEffect } from 'react'; import { UserPlus, Pencil, Trash2, Phone, Shield, Search, Filter, Key, Eye, EyeOff, Copy } from 'lucide-react'; import UserForm from '../components/users/UserForm'; import LoginHistoryModal from '../components/users/LoginHistoryModal'; import PermissionsM

pasted


import { useState } from 'react'; import { X, AlertCircle } from 'lucide-react'; import { supabase } from '../../lib/supabase'; import { useAuth } from '../../contexts/AuthContext'; import { z } from 'zod'; import { generateLoginCode } from '../../utils/codeGenerator'; interface UserFormProps {

pasted

Hi. I have created a web-app using bolt.new where pre-defined users are allowed to access the app. Users can login using phone Number+login code and only Administrators can control user updates or user addition. 
1) User updates or User addition is not working
2) User email is not required but existing login code is required to be displayed
3) There are only 3 roles: Administrator, Accountant and Teacher. Remove all other roles and any code relavant to other roles. 
Review and make changes to attached User Management and User form code

Edit
Looking at your code, I can identify several issues that need to be fixed. Let me create updated versions of both components to address your concerns.


Updated UserManagement.jsx
Code 

Updated UserForm.jsx
Code 




You are out of free messages until 7:30 PM


import { useState } from 'react';
import { X, AlertCircle, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Simple login code generator function (no external dependency)
const generateLoginCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding I, O, 0, 1 for clarity
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const UserForm = ({ user, onClose, onSubmit }) => {
  const { user: currentUser } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone_number: user?.phone_number || '',
    login_code: user?.login_code || generateLoginCode(),
    role: user?.role || 'teacher',
    status: user ? (user.is_active ? 'active' : 'inactive') : 'active'
  });

  const validateForm = () => {
    if (!formData.name || formData.name.length < 3) {
      setError('Name must be at least 3 characters');
      return false;
    }
    
    if (!formData.phone_number || !/^(\+91)?[6-9]\d{9}$/.test(formData.phone_number)) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    
    if (!formData.login_code || formData.login_code.length < 4) {
      setError('Login code must be at least 4 characters');
      return false;
    }
    
    if (!['administrator', 'accountant', 'teacher'].includes(formData.role)) {
      setError('Please select a valid role');
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setError(null);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      setError(null);
      
      if (!currentUser || currentUser.role !== 'administrator') {
        throw new Error('Only administrators can manage users');
      }

      // Ensure phone number has country code
      let phoneNumber = formData.phone_number;
      if (!phoneNumber.startsWith('+91')) {
        phoneNumber = `+91${phoneNumber.replace(/^\+?91?/, '')}`;
      }

      const userData = {
        name: formData.name.trim(),
        phone_number: phoneNumber,
        login_code: formData.login_code.toUpperCase(),
        role: formData.role,
        status: formData.status
      };

      await onSubmit(userData);
      setShowConfirmation(false);
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
      setShowConfirmation(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits and limit to 10 digits
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }
    return cleaned;
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium">
                Phone Number *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                  +91
                </span>
                <input
                  id="phoneNumber"
                  type="tel"
                  className="input rounded-l-none"
                  value={formData.phone_number.replace(/^\+?91/, '')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    phone_number: formatPhoneNumber(e.target.value)
                  })}
                  placeholder="10-digit phone number"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-medium">
                Role *
              </label>
              <select
                id="role"
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="administrator">Administrator</option>
                <option value="accountant">Accountant</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Login Code Field - Full Width */}
          <div className="space-y-2">
            <label htmlFor="loginCode" className="block text-sm font-medium">
              Login Code *
            </label>
            <div className="flex gap-2">
              <input
                id="loginCode"
                type="text"
                className="input font-mono uppercase flex-1"
                value={formData.login_code}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  login_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
                })}
                maxLength={8}
                required
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFormData({ ...formData, login_code: generateLoginCode() })}
              >
                Generate New
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => copyToClipboard(formData.login_code)}
                title="Copy Login Code"
              >
                <Copy className={`h-4 w-4 ${copiedCode ? 'text-success' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {user ? 'Current login code - modify if needed' : 'Auto-generated login code for this user'}
              {copiedCode && <span className="text-success ml-2">✓ Copied!</span>}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              className="btn btn-outline btn-md"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
            >
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Action</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground">
                Are you sure you want to {user ? 'update' : 'create'} this user?
              </p>
              {!user && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium">Login Code:</p>
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                    {formData.login_code}
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Make sure to save this login code - the user will need it to log in.
                  </p>
                </div>
              )}
              {formData.status === 'inactive' && (
                <p className="text-warning text-sm">
                  ⚠️ This user will be inactive and cannot log in.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserForm;