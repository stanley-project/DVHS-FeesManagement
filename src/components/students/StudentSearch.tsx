import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface StudentSearchProps {
  onSelect: (student: any) => void;
  onClose: () => void;
}

const StudentSearch = ({ onSelect, onClose }: StudentSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNoResults(false);

    // Mock search results - replace with actual API call
    const results = [
      {
        id: '1',
        admissionNumber: 'ADM2024001',
        studentName: 'Rahul Kumar',
        class: 'IX',
        section: 'A',
        academicYear: '2024-25',
        admissionDate: '2024-06-01',
        status: 'inactive'
      },
      // Add more mock results as needed
    ];

    setTimeout(() => {
      setSearchResults(results);
      setNoResults(results.length === 0);
      setIsLoading(false);
    }, 500);
  };

  const handleSelect = (student: any) => {
    onSelect(student);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Search Previous Students</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or admission number..."
                  className="input w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !searchQuery.trim()}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </button>
            </div>
          </form>

          <div className="mt-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching...
              </div>
            ) : noResults ? (
              <div className="text-center py-8 text-muted-foreground">
                No students found matching your search criteria
              </div>
            ) : searchResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admission No.</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class-Section</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Academic Year</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                        <td className="px-4 py-3">{student.studentName}</td>
                        <td className="px-4 py-3">{student.class}-{student.section}</td>
                        <td className="px-4 py-3">{student.academicYear}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            student.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          }`}>
                            {student.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleSelect(student)}
                            className="btn btn-sm btn-primary"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSearch;