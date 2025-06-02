import { useState, useEffect } from 'react';
import { Plus, ArrowUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import AcademicYearForm from '../components/fees/AcademicYearForm';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicYears } from '../hooks/useAcademicYears';

interface FormData {
  yearName: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const AcademicYearManagement = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const { academicYears, loading, error, addAcademicYear, refreshAcademicYears } = useAcademicYears();

  const handleSubmit = async (formData: FormData) => {
    try {
      if (!user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      if (user.role !== 'administrator') {
        throw new Error('Unauthorized: Only administrators can manage academic years');
      }


      // Insert new academic year
      const { data, error } = await supabase
        .from('academic_years')
        .insert([{
          year_name: formData.yearName,
          start_date: formData.startDate,
          end_date: formData.endDate,
          is_current: formData.isCurrent,
          transition_status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Academic year added successfully');
      setShowForm(false);
      refreshAcademicYears();
    } catch (err) {
      console.error('Error saving academic year:', err);
      if(err.message.includes('42501')){
        toast.error('Unauthorized: You do not have permission to perform this action.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to save academic year');
      }
    }
  };

  const handleStartTransition = async (year: AcademicYear) => {
    try {
      const nextYear = academicYears.find(y => 
        new Date(y.start_date) > new Date(year.start_date)
      );

      if (!nextYear) {
        toast.error('Please create the next academic year before starting transition');
        return;
      }

      // Update academic year status
      const { error: updateError } = await supabase
        .from('academic_years')
        .update({ transition_status: 'in_progress' })
        .eq('id', year.id);

      if (updateError) throw updateError;

      toast.success('Academic year transition started');
      refreshAcademicYears(); // Refresh the list
    } catch (err) {
      console.error('Error starting transition:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start transition');
    }
  };

  // Fetch academic years on component mount
  useEffect(() => {
    refreshAcademicYears();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Academic Year Management</h1>
        <button
          className="btn btn-primary btn-md inline-flex items-center"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Academic Year
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="p-6">
          {error ? (
            <div className="text-center py-4 text-error">
              {error.message}
            </div>
          ) : loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading academic years...
            </div>
          ) : academicYears.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No academic years found. Click "Add Academic Year" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center gap-1">
                        Academic Year
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center gap-1">
                        Start Date
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button className="flex items-center gap-1">
                        End Date
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Transition Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {academicYears.map((year) => (
                    <tr key={year.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">
                        {year.year_name}
                        {year.is_current && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(year.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(year.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          year.is_current ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {year.is_current ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          year.transition_status === 'completed' ? 'bg-success/10 text-success' :
                          year.transition_status === 'in_progress' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {year.transition_status.charAt(0).toUpperCase() + year.transition_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {year.is_current && year.transition_status === 'pending' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleStartTransition(year)}
                            >
                              Start Transition
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <AcademicYearForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default AcademicYearManagement;