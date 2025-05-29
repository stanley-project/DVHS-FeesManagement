import { useState } from 'react';
import { X, AlertCircle, Copy, Check } from 'lucide-react';
import { generateLoginCode } from '../../utils/codeGenerator';

interface LoginCodeModalProps {
  user: {
    id: string;
    name: string;
    login_code: string;
  };
  onClose: () => void;
  onUpdate: (userId: string, newCode: string) => Promise<void>;
}

const LoginCodeModal = ({ user, onClose, onUpdate }: LoginCodeModalProps) => {
  const [newCode, setNewCode] = useState(user.login_code);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateNew = () => {
    setNewCode(generateLoginCode());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onUpdate(user.id, newCode);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update login code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Manage Login Code</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">User</p>
            <p className="font-medium">{user.name}</p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Login Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="input font-mono uppercase w-full"
                  pattern="[A-HJ-NP-Z2-9]{8}"
                  maxLength={8}
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                onClick={handleGenerateNew}
                className="btn btn-outline btn-sm whitespace-nowrap"
              >
                Generate New
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Login code must be 8 characters long and can only contain uppercase letters (A-H, J-N, P-Z) and numbers (2-9)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            className="btn btn-outline btn-md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-md"
            onClick={handleUpdate}
            disabled={isLoading || newCode === user.login_code}
          >
            {isLoading ? 'Updating...' : 'Update Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginCodeModal;