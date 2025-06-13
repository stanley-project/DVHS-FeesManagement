import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMiscellaneousCharges } from '../../hooks/useMiscellaneousCharges';
import { MiscellaneousCharge, ChargeCategory } from '../../types/fees';

interface MiscellaneousChargesFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  studentId?: string;
  academicYearId?: string;
}

interface FormData {
  studentId: string;
  chargeItems: {
    categoryId: string;
    customCategory?: string;
    amount: number;
    description: string;
  }[];
}

const MiscellaneousChargesForm = ({
  onSubmit,
  onCancel,
  studentId,
  academicYearId
}: MiscellaneousChargesFormProps) => {
  const { user } = useAuth();
  const { chargeCategories, loading: categoriesLoading, error: categoriesError } = useMiscellaneousCharges();
  
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStudentSearch, setShowStudentSearch] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      studentId: studentId || '',
      chargeItems: [
        {
          categoryId: '',
          amount: 0,
          description: ''
        }
      ]
    }
  });

  const chargeItems = watch('chargeItems');
  const watchedStudentId = watch('studentId');

  // Fetch academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const { data, error } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (error) throw error;
        setAcademicYears(data || []);
      } catch (err) {
        console.error('Error fetching academic years:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch academic years');
      }
    };

    fetchAcademicYears();
  }, []);

  // Fetch student details if studentId is provided
  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!watchedStudentId) {
        setSelectedStudent(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            student_name,
            admission_number,
            class:class_id(id, name)
          `)
          .eq('id', watchedStudentId)
          .single();

        if (error) throw error;
        setSelectedStudent(data);
      } catch (err) {
        console.error('Error fetching student details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch student details');
      }
    };

    fetchStudentDetails();
  }, [watchedStudentId]);

  // Search students
  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setStudents([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_name,
          admission_number,
          class:class_id(id, name)
        `)
        .or(`student_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
        .eq('status', 'active')
        .order('student_name')
        .limit(10);

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error searching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to search students');
    } finally {
      setLoading(false);
    }
  };

  // Add a new charge item
  const addChargeItem = () => {
    const currentItems = watch('chargeItems');
    setValue('chargeItems', [
      ...currentItems,
      {
        categoryId: '',
        amount: 0,
        description: ''
      }
    ]);
  };

  // Remove a charge item
  const removeChargeItem = (index: number) => {
    const currentItems = watch('chargeItems');
    setValue('chargeItems', currentItems.filter((_, i) => i !== index));
  };

  // Set default amount when category is selected
  const handleCategoryChange = (index: number, categoryId: string) => {
    const category = chargeCategories.find(cat => cat.id === categoryId);
    if (category && category.default_amount) {
      const currentItems = watch('chargeItems');
      currentItems[index].amount = category.default_amount;
      setValue('chargeItems', [...currentItems]);
    }
  };

  // Form submission
  const onFormSubmit = (data: FormData) => {
    if (!user) {
      toast.error('You must be logged in to create charges');
      return;
    }

    if (!data.studentId) {
      toast.error('Please select a student');
      return;
    }

    if (data.chargeItems.length === 0) {
      toast.error('Please add at least one charge item');
      return;
    }

    // Validate each charge item
    for (const item of data.chargeItems) {
      if (!item.amount || item.amount <= 0) {
        toast.error('All charges must have an amount greater than 0');
        return;
      }
      
      if (!item.description.trim()) {
        toast.error('All charges must have a description');
        return;
      }
    }

    setShowConfirmation(true);
  };

  // Confirm submission
  const handleConfirm = async () => {
    try {
      const formData = watch();
      
      // Get current academic year if not provided
      let yearId = academicYearId;
      if (!yearId) {
        const { data: currentYear, error: yearError } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .single();

        if (yearError) throw yearError;
        yearId = currentYear.id;
      }

      // Create charge records
      const charges = formData.chargeItems.map(item => ({
        student_id: formData.studentId,
        academic_year_id: yearId,
        charge_category_id: item.categoryId || null,
        amount: item.amount,
        description: item.description,
        charge_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        is_paid: false,
        created_by: user.id
      }));

      const { data, error } = await supabase
        .from('miscellaneous_charges')
        .insert(charges)
        .select();

      if (error) throw error;

      toast.success(`${charges.length} charge(s) created successfully`);
      onSubmit(data);
      setShowConfirmation(false);
    } catch (err) {
      console.error('Error creating charges:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create charges');
      setShowConfirmation(false);
    }
  };

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading categories...</span>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Error Loading Categories</p>
        </div>
        <p className="mt-1">{categoriesError.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b">
        <div>
          <h3 className="text-xl font-semibold">Miscellaneous Charges</h3>
          <p className="text-sm text-muted-foreground">Add variable expenses for students</p>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Student Selection */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Student Information</h4>
        
        {studentId ? (
          // Display selected student if studentId is provided
          selectedStudent && (
            <div className="bg-muted p-4 rounded-md">
              <p className="font-medium">{selectedStudent.student_name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedStudent.admission_number} | {selectedStudent.class?.name}
              </p>
            </div>
          )
        ) : (
          // Student search if studentId is not provided
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Select Student *
            </label>
            <div className="relative">
              <input
                type="text"
                className="input w-full"
                placeholder="Search by name or admission number"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchStudents(e.target.value);
                  setShowStudentSearch(true);
                }}
                onFocus={() => setShowStudentSearch(true)}
              />
              
              {showStudentSearch && (
                <div className="absolute z-10 w-full mt-1 bg-card rounded-md shadow-lg border max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Searching...</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchQuery ? 'No students found' : 'Type to search students'}
                    </div>
                  ) : (
                    <div>
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="p-3 hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setValue('studentId', student.id);
                            setSelectedStudent(student);
                            setSearchQuery(student.student_name);
                            setShowStudentSearch(false);
                          }}
                        >
                          <p className="font-medium">{student.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.admission_number} | {student.class?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Controller
              name="studentId"
              control={control}
              rules={{ required: 'Student is required' }}
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
            
            {errors.studentId && (
              <p className="text-sm text-error">{errors.studentId.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Charge Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium">Charge Items</h4>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={addChargeItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>

        {chargeItems.map((item, index) => (
          <div key={index} className="p-4 border rounded-md space-y-4">
            <div className="flex justify-between">
              <h5 className="font-medium">Item {index + 1}</h5>
              {index > 0 && (
                <button
                  type="button"
                  className="text-error hover:text-error/80"
                  onClick={() => removeChargeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Category *
                </label>
                <Controller
                  name={`chargeItems.${index}.categoryId`}
                  control={control}
                  rules={{ required: 'Category is required' }}
                  render={({ field }) => (
                    <select
                      className="input"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleCategoryChange(index, e.target.value);
                      }}
                    >
                      <option value="">Select Category</option>
                      {chargeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.chargeItems?.[index]?.categoryId && (
                  <p className="text-sm text-error">{errors.chargeItems[index]?.categoryId?.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Amount (₹) *
                </label>
                <Controller
                  name={`chargeItems.${index}.amount`}
                  control={control}
                  rules={{ 
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  }}
                  render={({ field }) => (
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        className="input rounded-l-none"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                />
                {errors.chargeItems?.[index]?.amount && (
                  <p className="text-sm text-error">{errors.chargeItems[index]?.amount?.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Description *
              </label>
              <Controller
                name={`chargeItems.${index}.description`}
                control={control}
                rules={{ required: 'Description is required' }}
                render={({ field }) => (
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Provide a detailed description of the charge"
                    {...field}
                  />
                )}
              />
              {errors.chargeItems?.[index]?.description && (
                <p className="text-sm text-error">{errors.chargeItems[index]?.description?.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          className="btn btn-outline btn-md"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-md"
        >
          Create Charges
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
              <h3 className="text-lg font-semibold">Confirm Charges</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-muted-foreground">
                Are you sure you want to create the following charges for {selectedStudent?.student_name}?
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <div className="font-medium">Summary:</div>
                <ul className="mt-2 space-y-1">
                  {chargeItems.map((item, index) => {
                    const category = chargeCategories.find(cat => cat.id === item.categoryId);
                    return (
                      <li key={index}>
                        • {category?.name || 'Custom'}: ₹{item.amount} - {item.description}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 font-medium">
                  Total: ₹{chargeItems.reduce((sum, item) => sum + (item.amount || 0), 0)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These charges will be added to the student's account and can be collected separately.
              </p>
            </div>
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
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default MiscellaneousChargesForm;