import { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';

interface VillageImportProps {
  onClose: () => void;
  onImport: (data: any) => void;
}

const VillageImport = ({ onClose, onImport }: VillageImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      // Mock preview data
      setPreview([
        { name: 'Rajapuram', distance: '5.2', status: 'Active' },
        { name: 'Krishnapuram', distance: '3.8', status: 'Active' },
      ]);
      setError('');
    }
  };

  const handleImport = () => {
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

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Drag and drop your CSV file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn btn-outline btn-sm"
              >
                Browse Files
              </label>
            </div>

            {file && (
              <>
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-medium mb-2">Selected File</h3>
                  <p className="text-sm text-muted-foreground">{file.name}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Preview</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Village Name</th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Distance (km)</th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2 text-right">{row.distance}</td>
                            <td className="px-4 py-2">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-md flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <p>Please verify the data before importing</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-muted/50">
          <button
            className="btn btn-outline btn-md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-md"
            onClick={handleImport}
            disabled={!file}
          >
            Import Villages
          </button>
        </div>
      </div>
    </div>
  );
};

export default VillageImport;