import { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';

interface PermissionsModalProps {
  user: any;
  onClose: () => void;
  onSave: (permissions: any) => void;
}

const PermissionsModal = ({ user, onClose, onSave }: PermissionsModalProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [permissions, setPermissions] = useState({
    students: {
      view: true,
      create: user.role !== 'teacher',
      edit: user.role !== 'teacher',
      delete: false,
    },
    fees: {
      view: true,
      collect: user.role !== 'teacher',
      refund: user.role === 'administrator',
      reports: user.role !== 'teacher',
    },
    users: {
      view: user.role === 'administrator',
      create: user.role === 'administrator',
      edit: user.role === 'administrator',
      delete: user.role === 'administrator',
    },
    settings: {
      view: user.role === 'administrator',
      edit: user.role === 'administrator',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSave(permissions);
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">User Permissions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user.name} ({user.role})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Students Module */}
            <div>
              <h3 className="text-lg font-medium mb-4">Students</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.students.view}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      students: { ...permissions.students, view: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>View Students</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.students.create}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      students: { ...permissions.students, create: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role === 'teacher'}
                  />
                  <span>Create Students</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.students.edit}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      students: { ...permissions.students, edit: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role === 'teacher'}
                  />
                  <span>Edit Students</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.students.delete}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      students: { ...permissions.students, delete: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Delete Students</span>
                </label>
              </div>
            </div>

            {/* Fees Module */}
            <div>
              <h3 className="text-lg font-medium mb-4">Fees</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.fees.view}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      fees: { ...permissions.fees, view: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>View Fees</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.fees.collect}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      fees: { ...permissions.fees, collect: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role === 'teacher'}
                  />
                  <span>Collect Fees</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.fees.refund}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      fees: { ...permissions.fees, refund: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Refund Fees</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.fees.reports}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      fees: { ...permissions.fees, reports: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role === 'teacher'}
                  />
                  <span>View Reports</span>
                </label>
              </div>
            </div>

            {/* Users Module */}
            <div>
              <h3 className="text-lg font-medium mb-4">Users</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.users.view}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      users: { ...permissions.users, view: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>View Users</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.users.create}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      users: { ...permissions.users, create: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Create Users</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.users.edit}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      users: { ...permissions.users, edit: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Edit Users</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.users.delete}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      users: { ...permissions.users, delete: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Delete Users</span>
                </label>
              </div>
            </div>

            {/* Settings Module */}
            <div>
              <h3 className="text-lg font-medium mb-4">Settings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.settings.view}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      settings: { ...permissions.settings, view: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>View Settings</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissions.settings.edit}
                    onChange={(e) => setPermissions({
                      ...permissions,
                      settings: { ...permissions.settings, edit: e.target.checked }
                    })}
                    className="h-4 w-4 rounded border-input"
                    disabled={user.role !== 'administrator'}
                  />
                  <span>Edit Settings</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
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
              Save Permissions
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
              <h3 className="text-lg font-semibold">Confirm Changes</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to update the permissions for this user?
              This action will take effect immediately.
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

export default PermissionsModal;