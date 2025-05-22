import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';

interface VillageImportProps {
  onClose: () => void;
  onImport: (data: any) => void;
}

const VillageImport = ({ onClose, onImport }: VillageImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      // In a real app, parse CSV and show preview
      setPreview([
        { name: 'Ramapuram', distance: 5.2 },
        { name: 'Kondapur', distance: 3.8 },
      ]);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to import');
      return;
    }
    onImport(preview);
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Import Villages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded p-3 text-sm">
              {error}
            </div>
          )}

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <span className="text-lg font-medium mb-2">
                Click to upload or drag and drop
              </span>
              <span className="text-sm text-muted-foreground">
                CSV files only (max 1MB)
              </span>
            </label>
          </div>

          {file && preview.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Preview</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Village Name</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Distance (km)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">{item.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              disabled={!file}
            >
              Import Villages
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VillageImport;