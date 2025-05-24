import { useState, useEffect } from 'react';
import { Plus, ArrowUpDown, AlertCircle } from 'lucide-react';
import AcademicYearForm from '../components/fees/AcademicYearForm';
import { supabase } from '../lib/supabase';

const AcademicYearManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showTransitionConfirm, setShowTransitionConfirm] = useState(false);
  const [selectedYear, setSelectedYear] = useState<any>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch academic years on component mount
  useState(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      setAcademicYears(data || []);
    } catch (err: any) {
      console.error('Error fetching academic years:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      // If setting as current year, first unset any existing current year
      if (formData.isCurrent) {
        await supabase
          .from('academic_years')
          .update({ is_current: false })
          .eq('is_current', true);
      }

      // Insert or update academic year
      const { data, error } = await supabase
        .from('academic_years')
        .upsert({
          id: formData.id, // Will be undefined for new records
          year_name: formData.yearName,
          start_date: formData.startDate,
          end_date: formData.endDate,
          is_current: formData.isCurrent,
          transition_status: 'pending',
          previous_year_id: formData.previousYearId,
          next_year_id: formData.nextYearId
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh academic years list
      await fetchAcademicYears();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving academic year:', err);
      alert('Failed to save academic year. Please try again.');
    }
  };

  const handleStartTransition = async (year: any) => {
    try {
      // Get next academic year
      const nextYear = academicYears.find(y => 
        new Date(y.start_date) > new Date(year.start_date)
      );

      if (!nextYear) {
        alert('Please create the next academic year before starting transition');
        return;
      }

      // Create transition record
      const { data: transition, error } = await supabase
        .from('academic_year_transitions')
        .insert({
          from_year_id: year.id,
          to_year_id: nextYear.id,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update academic year status
      await supabase
        .from('academic_years')
        .update({ transition_status: 'in_progress' })
        .eq('id', year.id);

      // Refresh academic years list
      await fetchAcademicYears();

      // Start transition process
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-promotion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transitionId: transition.id })
      });

      if (!response.ok) throw new Error('Failed to start transition process');

    } catch (err: any) {
      console.error('Error starting transition:', err);
      alert('Failed to start transition. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Academic Year Management</h1>
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
              {error}
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
                    <th className="px-4 py-3 text-left">Start Date</th>
                    <th className="px-4 py-3 text-left">End Date</th>
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
                      <td className="px-4 py-3">{new Date(year.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{new Date(year.end_date).toLocaleDateString()}</td>
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
                        <div className="flex justify-end">
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

      {/* Academic Year Form */}
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