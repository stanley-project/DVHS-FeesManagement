import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext'; 
import { z } from 'zod';

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
  assignedClasses: z.array(z.string())
});

const UserForm = ({ user, onClose, onSubmit }: UserFormProps) => {
  const { user: currentUser } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(user || {
    name: '',
    phoneNumber: '',
    role: 'teacher',
    status: 'active',
    assignedClasses: [],
  });

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
      const email = `user_${formData.phoneNumber}@schoolapp.local`;
      
      if (!currentUser || currentUser.role !== 'administrator') {
        throw new Error('Only administrators can manage users');
      }

      if (!user) {
        // Check for existing user
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('phone_number', formData.phoneNumber);

        if (checkError) {
          throw checkError;
        }

        if (existingUser && existingUser.length > 0) {
          throw new Error('A user with this phone number already exists');
        }

        // Call the Edge Function to create user
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-by-admin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            phone_number: `+91${formData.phoneNumber}`, // Add country code
            role: formData.role,
            email_suffix: 'deepthischool.edu'
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create user');
        }

        const result = await response.json();
        onSubmit(result);
      } else {
        // When updating existing user
        const updates = {
          name: formData.name,
          phone_number: formData.phoneNumber,
          role: formData.role,
          is_active: formData.status === 'active'
        };
        const { data, error } = await supabaseAdmin
          .from('users') // Use regular client for updates
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        onSubmit(data);
      }

      setShowConfirmation(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
      setShowConfirmation(false);
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