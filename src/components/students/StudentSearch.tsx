import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Student } from '../../hooks/useStudents';

interface StudentSearchProps {
  onSelect: (student: Student) => void;
  onClose: () => void;
}

const StudentSearch = ({ onSelect, onClose }: StudentSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      console.log('StudentSearch: Starting search for query:', searchQuery);
      console.log('StudentSearch: Current user session:', await supabase.auth.getSession());
      
      // First, let's try a simple query without joins to see if we can get any students
      console.log('StudentSearch: Testing basic student query...');
      const { data: basicData, error: basicError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'inactive')
        .limit(5);
      
      console.log('StudentSearch: Basic query result:', { data: basicData, error: basicError });
      
      // Now try the full query with joins
      console.log('StudentSearch: Executing full search query...');
      const { data, error: searchError } = await supabase
        .from('students')
        .select(`
          *,
          class:class_id(id, name),
          village:village_id(id, name)
        `)
        .or(`student_name.ilike.%${searchQuery}%,admission_number.ilike.%${searchQuery}%`)
        .eq('status', 'inactive')
        .order('student_name');

      console.log('StudentSearch: Full query executed');
      console.log('StudentSearch: Supabase search data:', data);
      console.log('StudentSearch: Supabase search error:', searchError);
      console.log('StudentSearch: Data length:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('StudentSearch: First result sample:', data[0]);
        console.log('StudentSearch: All results:', data);
      }

      // Let's also try without the status filter to see if we get any results
      console.log('StudentSearch: Testing without status filter...');
      const { data: allData, error: allError } = await supabase
        .from('students')
        .select(`
          *,
          class:class_id(id, name),
          village:village_id(id, name)
        `)
        .or(`student_name.ilike.%${searchQuery}%,admission_number.ilike.%${searchQuery}%`)
        .order('student_name');
      
      console.log('StudentSearch: Query without status filter:', { data: allData, error: allError, count: allData?.length });

      if (searchError) {
        console.error('StudentSearch: Search error details:', searchError);
        throw searchError;
      }

      setSearchResults(data || []);
    } catch (err) {
      console.error('StudentSearch: Catch block error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (student: Student) => {
    onSelect(student);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Search Previous Students</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
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
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 max-h-96 overflow-y-auto">
            {error && (
              <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Searching students...</span>
              </div>
            ) : hasSearched && searchResults.length === 0 && !error ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No inactive students found matching your search criteria</p>
                <p className="text-sm mt-2">Check the browser console for detailed search information</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admission No.</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Class</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exit Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Village</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{student.admission_number}</td>
                        <td className="px-4 py-3">{student.student_name}</td>
                        <td className="px-4 py-3">{student.class?.name || 'N/A'}-{student.section}</td>
                        <td className="px-4 py-3">
                          {student.exit_date ? new Date(student.exit_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3">{student.village?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleSelect(student)}
                            className="btn btn-sm btn-primary"
                          >
                            Select for Rejoining
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12 text-muted-foreground">
                Enter a student name or admission number to search for previous students
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSearch;