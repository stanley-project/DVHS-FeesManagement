import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface RegistrationTypeSelectorProps {
  value: 'new' | 'rejoining' | 'continuing';
  onChange: (value: 'new' | 'rejoining' | 'continuing') => void;
  onSearch?: () => void;
}

const RegistrationTypeSelector = ({ value, onChange, onSearch }: RegistrationTypeSelectorProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Registration Type</h3>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setShowInfo(!showInfo)}
        >
          <AlertCircle className="h-5 w-5" />
        </button>
      </div>

      {showInfo && (
        <div className="bg-muted p-4 rounded-md text-sm space-y-2">
          <p><strong>New Student:</strong> First-time admission with admission fee</p>
          <p><strong>Rejoining Student:</strong> Previously inactive student returning</p>
          <p><strong>Continuing Student:</strong> Promotion from previous year</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="relative">
          <input
            type="radio"
            name="registrationType"
            className="peer sr-only"
            checked={value === 'new'}
            onChange={() => onChange('new')}
          />
          <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
            <span className="font-medium">New Student</span>
            <span className="text-xs text-muted-foreground">First time admission</span>
          </div>
        </label>

        <label className="relative">
          <input
            type="radio"
            name="registrationType"
            className="peer sr-only"
            checked={value === 'rejoining'}
            onChange={() => {
              onChange('rejoining');
              onSearch?.();
            }}
          />
          <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
            <span className="font-medium">Rejoining Student</span>
            <span className="text-xs text-muted-foreground">Previous student returning</span>
          </div>
        </label>

        <label className="relative">
          <input
            type="radio"
            name="registrationType"
            className="peer sr-only"
            checked={value === 'continuing'}
            onChange={() => {
              onChange('continuing');
              onSearch?.();
            }}
          />
          <div className="flex flex-col items-center p-4 bg-muted rounded-lg cursor-pointer border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/10">
            <span className="font-medium">Continuing Student</span>
            <span className="text-xs text-muted-foreground">Promotion from previous year</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default RegistrationTypeSelector;