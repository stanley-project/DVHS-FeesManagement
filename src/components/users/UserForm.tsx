import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase, handleApiError } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext'; 
import { z } from 'zod';
import { generateLoginCode } from '../../utils/codeGenerator';

interface UserFormProps {
  user?: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const userSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  role: z.enum(['administrator', 'accountant', 'teacher']),
  status: z.enum(['active', 'inactive']),
  assignedClasses: z.array(z.string()),
  loginCode: z.string().regex(/^[A-HJ-NP-Z2-9]{8}$/, 'Login code must be 8 characters and only contain A-H, J-N, P-Z, 2-9')
});

const UserForm = ({ user, onClose, onSubmit }: UserFormProps) => {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(user || {
    name: '',
    phoneNumber: '',
    loginCode: generateLoginCode(),
    role: 'teacher',
    status: 'active',
    assignedClasses: [],
  });

  // If editing a user, populate the form with their data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phone_number || '',
        loginCode: user.login_code || generateLoginCode(),
        role: user.role || 'teacher',
        status: user.is_active ? 'active' : 'inactive',
        assignedClasses: user.assignedClasses || [],
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      userSchema.parse(formData);
      setError(null);
      setShowConfirmation(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  const handleConfirm = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!currentUser || currentUser.role !== 'administrator') {
        throw new Error('Only administrators can manage users');
      }

      // Create or update user directly with Supabase client
      if (!user) {
        // Create new user
        const { data, error } = await supabase
          .from('users')
          .insert([{
            name: formData.name,
            phone_number: formData.phoneNumber,
            role: formData.role,
            is_active: formData.status === 'active',
            login_code: formData.loginCode,
            email: `${formData.phoneNumber}@deepthischool.edu` // Generate email from phone
          }])
          .select();
          
        if (error) throw error;
        onSubmit(data?.[0] || formData);
      } else {
        // Update existing user
        const { data, error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            phone_number: formData.phoneNumber,
            role: formData.role,
            is_active: formData.status === 'active',
            login_code: formData.loginCode,
            email: user.email || `${formData.phoneNumber}@deepthischool.edu`
          })
          .eq('id', user.id)
          .select();
          
        if (error) throw error;
        onSubmit(data?.[0] || { ...user, ...formData });
      }

      setShowConfirmation(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
      handleApiError(err);
      setShowConfirmation(false);
    } finally {
      setIsLoading(false);
    }
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
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="10-digit phone number"
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

            {formData.role === 'teacher' && (
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="classes" className="block text-sm font-medium">
                  Assigned Classes
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['IX-A', 'IX-B', 'X-A', 'X-B', 'XI-A', 'XI-B', 'XII-A', 'XII-B'].map((cls) => (
                    <label key={cls} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.assignedClasses.includes(cls)}
                        onChange={(e) => {
                          const classes = e.target.checked
                            ? [...formData.assignedClasses, cls]
                            : formData.assignedClasses.filter((c: string) => c !== cls);
                          setFormData({ ...formData, assignedClasses: classes });
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm">{cls}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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

          {/* Login Code Field */}
          <div className="space-y-2">
            <label htmlFor="loginCode" className="block text-sm font-medium">
              Login Code
            </label>
            <div className="flex gap-2">
              <input
                id="loginCode"
                type="text"
                className="input font-mono uppercase"
                value={formData.loginCode}
                onChange={(e) => setFormData({ ...formData, loginCode: e.target.value.toUpperCase() })}
                pattern="[A-HJ-NP-Z2-9]{8}"
                maxLength={8}
                required
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFormData({ ...formData, loginCode: generateLoginCode() })}
              >
                Generate New Code
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Login code must be 8 characters and only contain A-H, J-N, P-Z, 2-9
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
              <h3 className="text-lg font-semibold">Confirm Submission</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to {user ? 'update' : 'create'} this user?
              {formData.status === 'inactive' && ' This user will not be able to log in.'}
            </p>
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