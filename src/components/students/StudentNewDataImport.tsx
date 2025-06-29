import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, FileText, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ImportedNewStudent {
  admission_number: string;
  student_name: string;
  gender: string;
  date_of_birth: string;
  date_of_admission: string;
  class: string; // The class name from Excel
  section: string;
  pen?: string;
  phone_number: string;
  father_name: string;
  mother_name: string;
  student_aadhar?: string;
  father_aadhar?: string;
  village_name?: string;
  has_school_bus: boolean;
  row_number: number;
}

interface ValidationError {
  row: number;
  admission_number: string;
  field: string;
  message: string;
  recommended_action: string;
  severity: 'error' | 'warning';
}

interface ImportSummary {
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  warnings: number;
  duplicate_records: number;
  missing_required_fields: number;
  format_errors: number;
  class_mapping_errors: number;
}

interface StudentNewDataImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const StudentNewDataImport: React.FC<StudentNewDataImportProps> = ({ onClose, onImportComplete }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedData, setImportedData] = useState<ImportedNewStudent[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'validate' | 'preview' | 'import' | 'complete'>('upload');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [classMappings, setClassMappings] = useState<Record<string, string>>({});
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string}[]>([]);

  const downloadTemplate = () => {
    const template = [
      {
        admission_number: 'ST-2025',
        student_name: 'John Doe',
        gender: 'male',
        date_of_birth: '2018-05-15',
        date_of_admission: '2025-06-01',
        class: 'LKG-A',
        section: 'A',
        pen: 'ABC123DEF45',
        phone_number: '9876543210',
        father_name: 'Robert Doe',
        mother_name: 'Jane Doe',
        student_aadhar: '123456789012',
        father_aadhar: '987654321098',
        village_name: 'Ananthasagar',
        has_school_bus: 'Yes'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    
    // Add column headers with descriptions
    const headers = [
      'Admission Number (Required)',
      'Student Name (Required)',
      'Gender (male/female/other)',
      'Date of Birth (YYYY-MM-DD)',
      'Date of Admission (YYYY-MM-DD) *Required*',
      'Class (Required - e.g., LKG-A, 1-A, etc.)',
      'Section (A, B, C, etc.)',
      'PEN (11 alphanumeric chars)',
      'Phone Number (10 digits)',
      'Father Name (Required)',
      'Mother Name (Required)',
      'Student Aadhar (12 digits)',
      'Father Aadhar (12 digits)',
      'Village Name',
      'School Bus (Yes/No)'
    ];

    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    XLSX.utils.book_append_sheet(wb, ws, 'New Student Import Template');
    
    const fileName = `New_Student_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Template downloaded successfully');
  };

  const fetchAvailableClasses = async () => {
    try {
      // Get current academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError) throw yearError;

      // Get classes for current academic year
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year_id', currentYear.id);

      if (classesError) throw classesError;

      setAvailableClasses(classes || []);
      
      // Create a mapping from class name to class ID
      const mappings: Record<string, string> = {};
      classes?.forEach(cls => {
        mappings[cls.name.toLowerCase()] = cls.id;
      });
      setClassMappings(mappings);
      
      return mappings;
    } catch (error) {
      console.error('Error fetching available classes:', error);
      return {};
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Fetch available classes first
    await fetchAvailableClasses();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row and process data
        const processedData: ImportedNewStudent[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length === 0 || !row[0]) continue; // Skip empty rows

          const student: ImportedNewStudent = {
            admission_number: row[0]?.toString().trim() || '',
            student_name: row[1]?.toString().trim() || '',
            gender: row[2]?.toString().toLowerCase().trim() || '',
            date_of_birth: formatDate(row[3]),
            date_of_admission: formatDate(row[4]),
            class: row[5]?.toString().trim() || '',
            section: row[6]?.toString().trim() || 'A',
            pen: row[7]?.toString().trim().toUpperCase() || undefined,
            phone_number: row[8]?.toString().trim() || '',
            father_name: row[9]?.toString().trim() || '',
            mother_name: row[10]?.toString().trim() || '',
            student_aadhar: row[11]?.toString().trim() || undefined,
            father_aadhar: row[12]?.toString().trim() || undefined,
            village_name: row[13]?.toString().trim() || undefined,
            has_school_bus: ['yes', 'true', '1'].includes(row[14]?.toString().toLowerCase().trim() || ''),
            row_number: i + 1
          };

          processedData.push(student);
        }

        setImportedData(processedData);
        setCurrentStep('validate');
        validateData(processedData);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error processing file. Please check the format and try again.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return '';
  };

  const getRecommendedAction = (field: string, message: string, severity: 'error' | 'warning'): string => {
    if (severity === 'error') {
      switch (field) {
        case 'admission_number':
          if (message.includes('required')) return 'Add a unique admission number for this student';
          if (message.includes('duplicate')) return 'Change the admission number to make it unique';
          return 'Fix the admission number format';
        case 'student_name':
          return 'Enter the complete student name';
        case 'date_of_admission':
          return 'Provide a valid admission date in YYYY-MM-DD format';
        case 'class':
          return 'Enter a valid class name that exists in the current academic year';
        case 'father_name':
          return 'Enter the father\'s complete name';
        case 'mother_name':
          return 'Enter the mother\'s complete name';
        case 'phone_number':
          return 'Enter a valid 10-digit phone number';
        case 'student_aadhar':
          return 'Enter a valid 12-digit Aadhar number or leave blank';
        case 'father_aadhar':
          return 'Enter a valid 12-digit Aadhar number or leave blank';
        case 'gender':
          return 'Use only: male, female, or other';
        case 'pen':
          return 'Enter exactly 11 alphanumeric characters or leave blank';
        case 'date_of_birth':
          return 'Use YYYY-MM-DD format for date of birth';
        default:
          return 'Correct the data format as per template requirements';
      }
    } else {
      // Warning actions
      switch (field) {
        case 'admission_number':
          if (message.includes('already exists')) return 'Student will be skipped - already in database';
          return 'Review and verify this admission number';
        case 'village_name':
          return 'Add this village to the system or use an existing village name';
        case 'class':
          return 'Verify the class name matches available classes';
        default:
          return 'Review this field - import will continue but may need attention';
      }
    }
  };

  const validateData = async (data: ImportedNewStudent[]) => {
    setIsProcessing(true);
    const errors: ValidationError[] = [];
    const duplicateCheck = new Set<string>();

    try {
      // Get existing students to check for duplicates
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('admission_number');

      if (error) throw error;

      const existingAdmissionNumbers = new Set(existingStudents?.map(s => s.admission_number) || []);

      // Get available villages
      const { data: villages, error: villageError } = await supabase
        .from('villages')
        .select('name')
        .eq('is_active', true);

      if (villageError) throw villageError;

      const availableVillages = new Set(villages?.map(v => v.name.toLowerCase()) || []);

      // Refresh class mappings
      const classMappings = await fetchAvailableClasses();

      data.forEach((student, index) => {
        const row = student.row_number;
        const admissionNumber = student.admission_number || `Row ${row}`;

        // Required field validation
        if (!student.admission_number) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'admission_number', 
            message: 'Admission number is required', 
            recommended_action: getRecommendedAction('admission_number', 'required', 'error'),
            severity: 'error' 
          });
        }
        if (!student.student_name) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'student_name', 
            message: 'Student name is required', 
            recommended_action: getRecommendedAction('student_name', 'required', 'error'),
            severity: 'error' 
          });
        }
        if (!student.date_of_admission) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'date_of_admission', 
            message: 'Date of admission is required', 
            recommended_action: getRecommendedAction('date_of_admission', 'required', 'error'),
            severity: 'error' 
          });
        }
        if (!student.father_name) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'father_name', 
            message: 'Father name is required', 
            recommended_action: getRecommendedAction('father_name', 'required', 'error'),
            severity: 'error' 
          });
        }
        if (!student.mother_name) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'mother_name', 
            message: 'Mother name is required', 
            recommended_action: getRecommendedAction('mother_name', 'required', 'error'),
            severity: 'error' 
          });
        }
        if (!student.class) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'class', 
            message: 'Class is required', 
            recommended_action: getRecommendedAction('class', 'required', 'error'),
            severity: 'error' 
          });
        } else {
          // Check if class exists in current academic year
          const classId = classMappings[student.class.toLowerCase()];
          if (!classId) {
            errors.push({ 
              row, 
              admission_number: admissionNumber,
              field: 'class', 
              message: `Class "${student.class}" not found in current academic year`, 
              recommended_action: getRecommendedAction('class', 'not found', 'error'),
              severity: 'error' 
            });
          }
        }

        // Format validation
        if (student.phone_number && !/^\d{10}$/.test(student.phone_number)) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'phone_number', 
            message: 'Phone number must be 10 digits', 
            recommended_action: getRecommendedAction('phone_number', 'format', 'error'),
            severity: 'error' 
          });
        }
        if (student.student_aadhar && !/^\d{12}$/.test(student.student_aadhar)) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'student_aadhar', 
            message: 'Student Aadhar must be 12 digits', 
            recommended_action: getRecommendedAction('student_aadhar', 'format', 'error'),
            severity: 'error' 
          });
        }
        if (student.father_aadhar && !/^\d{12}$/.test(student.father_aadhar)) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'father_aadhar', 
            message: 'Father Aadhar must be 12 digits', 
            recommended_action: getRecommendedAction('father_aadhar', 'format', 'error'),
            severity: 'error' 
          });
        }
        if (!['male', 'female', 'other'].includes(student.gender)) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'gender', 
            message: 'Gender must be male, female, or other', 
            recommended_action: getRecommendedAction('gender', 'format', 'error'),
            severity: 'error' 
          });
        }

        // PEN validation (optional but must be valid if provided - 11 characters)
        if (student.pen && !/^[A-Z0-9]{11}$/.test(student.pen)) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'pen', 
            message: 'PEN must be exactly 11 alphanumeric characters', 
            recommended_action: getRecommendedAction('pen', 'format', 'error'),
            severity: 'error' 
          });
        }

        // Date validation
        if (student.date_of_birth && isNaN(new Date(student.date_of_birth).getTime())) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'date_of_birth', 
            message: 'Invalid date of birth format', 
            recommended_action: getRecommendedAction('date_of_birth', 'format', 'error'),
            severity: 'error' 
          });
        }
        if (student.date_of_admission && isNaN(new Date(student.date_of_admission).getTime())) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'date_of_admission', 
            message: 'Invalid date of admission format', 
            recommended_action: getRecommendedAction('date_of_admission', 'format', 'error'),
            severity: 'error' 
          });
        }

        // Date logic validation
        if (student.date_of_birth && student.date_of_admission) {
          const birthDate = new Date(student.date_of_birth);
          const admissionDate = new Date(student.date_of_admission);
          if (admissionDate <= birthDate) {
            errors.push({ 
              row, 
              admission_number: admissionNumber,
              field: 'date_of_admission', 
              message: 'Date of admission must be after date of birth', 
              recommended_action: 'Ensure admission date is later than birth date',
              severity: 'error' 
            });
          }
        }

        // Duplicate check within file
        if (student.admission_number) {
          if (duplicateCheck.has(student.admission_number)) {
            errors.push({ 
              row, 
              admission_number: admissionNumber,
              field: 'admission_number', 
              message: 'Duplicate admission number in file', 
              recommended_action: getRecommendedAction('admission_number', 'duplicate', 'error'),
              severity: 'error' 
            });
          } else {
            duplicateCheck.add(student.admission_number);
          }

          // Check against existing students
          if (existingAdmissionNumbers.has(student.admission_number)) {
            errors.push({ 
              row, 
              admission_number: admissionNumber,
              field: 'admission_number', 
              message: 'Student already exists in database', 
              recommended_action: getRecommendedAction('admission_number', 'already exists', 'error'),
              severity: 'error' 
            });
          }
        }

        // Village validation
        if (student.village_name && !availableVillages.has(student.village_name.toLowerCase())) {
          errors.push({ 
            row, 
            admission_number: admissionNumber,
            field: 'village_name', 
            message: 'Village not found in system', 
            recommended_action: getRecommendedAction('village_name', 'not found', 'warning'),
            severity: 'warning' 
          });
        }
      });

      setValidationErrors(errors);
      generateImportSummary(data, errors);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Error during validation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImportSummary = (data: ImportedNewStudent[], errors: ValidationError[]) => {
    const errorRows = new Set(errors.filter(e => e.severity === 'error').map(e => e.row));
    const warningRows = new Set(errors.filter(e => e.severity === 'warning').map(e => e.row));
    
    const summary: ImportSummary = {
      total_records: data.length,
      successful_imports: data.length - errorRows.size,
      failed_imports: errorRows.size,
      warnings: warningRows.size,
      duplicate_records: errors.filter(e => e.message.includes('duplicate') || e.message.includes('already exists')).length,
      missing_required_fields: errors.filter(e => e.message.includes('required')).length,
      format_errors: errors.filter(e => e.message.includes('format') || e.message.includes('digits')).length,
      class_mapping_errors: errors.filter(e => e.message.includes('Class') && e.message.includes('not found')).length
    };

    setImportSummary(summary);
  };

  const processImport = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('import');

    try {
      // Get current academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (yearError || !currentYear) {
        throw new Error('No current academic year found');
      }

      // Get class mappings
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year_id', currentYear.id);

      if (classError) throw classError;

      const classMap = new Map(classes?.map(c => [c.name.toLowerCase(), c.id]) || []);

      // Get village mappings
      const { data: villages, error: villageError } = await supabase
        .from('villages')
        .select('id, name');

      if (villageError) throw villageError;

      const villageMap = new Map(villages?.map(v => [v.name.toLowerCase(), v.id]) || []);

      // Filter out records with errors
      const errorRows = new Set(validationErrors.filter(e => e.severity === 'error').map(e => e.row));
      const validRecords = importedData.filter(student => !errorRows.has(student.row_number));

      let successCount = 0;
      let failCount = 0;

      for (const student of validRecords) {
        try {
          // Map class name to class ID
          const classId = classMap.get(student.class.toLowerCase());
          
          if (!classId) {
            console.error(`Class mapping not found for: ${student.class}`);
            failCount++;
            continue;
          }

          const studentData = {
            admission_number: student.admission_number,
            student_name: student.student_name,
            gender: student.gender,
            date_of_birth: student.date_of_birth,
            class_id: classId,
            section: student.section || 'A',
            admission_date: student.date_of_admission,
            status: 'active' as const,
            PEN: student.pen || 'Not provided',
            phone_number: student.phone_number,
            father_name: student.father_name,
            mother_name: student.mother_name,
            student_aadhar: student.student_aadhar || null,
            father_aadhar: student.father_aadhar || null,
            village_id: student.village_name ? villageMap.get(student.village_name.toLowerCase()) || null : null,
            has_school_bus: student.has_school_bus,
            registration_type: 'new' as const,
            last_registration_date: new Date().toISOString().split('T')[0],
            last_registration_type: 'new' as const
          };

          const { error: insertError } = await supabase
            .from('students')
            .insert([studentData]);

          if (insertError) {
            console.error(`Error inserting student ${student.admission_number}:`, insertError);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing student ${student.admission_number}:`, error);
          failCount++;
        }
      }

      // Update summary with actual results
      setImportSummary(prev => prev ? {
        ...prev,
        successful_imports: successCount,
        failed_imports: failCount + errorRows.size
      } : null);

      setCurrentStep('complete');
      toast.success(`Import completed! ${successCount} students imported successfully.`);
      
      if (failCount > 0) {
        toast.error(`${failCount} students failed to import. Check the error report.`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportErrorReport = () => {
    if (validationErrors.length === 0) {
      toast.info('No errors to export');
      return;
    }

    const errorReport = validationErrors.map(error => ({
      'Row Number': error.row,
      'Admission Number': error.admission_number,
      'Field': error.field,
      'Error Type': error.severity,
      'Issue': error.message,
      'Recommended Action': error.recommended_action
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorReport);
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');

    const fileName = `New_Student_Import_Errors_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Error report exported successfully');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload New Student Data</h3>
            <p className="text-muted-foreground mb-6">
              Upload an Excel file containing new student records for direct admission
            </p>
            
            <div className="space-y-4">
              <button
                className="btn btn-outline btn-md"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </button>
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  className="btn btn-primary btn-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel File
                </button>
              </div>
            </div>

            {/* Template Information */}
            <div className="mt-8 bg-muted p-4 rounded-lg text-left max-w-2xl mx-auto">
              <h4 className="font-medium mb-2">Template Requirements:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Class:</strong> Required field - must match a class in the current academic year</li>
                <li>• <strong>Date of Admission:</strong> Required field (YYYY-MM-DD format)</li>
                <li>• <strong>PEN:</strong> Optional 11-character alphanumeric code</li>
                <li>• <strong>Required fields:</strong> Admission Number, Student Name, Father Name, Mother Name, Date of Admission, Class</li>
                <li>• <strong>Date formats:</strong> Use YYYY-MM-DD format for all dates</li>
                <li>• <strong>Gender:</strong> Must be 'male', 'female', or 'other'</li>
                <li>• <strong>Phone Number:</strong> Must be exactly 10 digits</li>
                <li>• <strong>Aadhar Numbers:</strong> Must be exactly 12 digits if provided</li>
                <li>• <strong>Village Name:</strong> Must match an existing village in the system</li>
              </ul>
            </div>
          </div>
        );

      case 'validate':
        return (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Validating Data</h3>
            <p className="text-muted-foreground">
              Checking data integrity and format...
            </p>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Records</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">{importSummary?.total_records}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Valid Records</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">{importSummary?.successful_imports}</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Errors</span>
                </div>
                <p className="text-2xl font-bold text-red-900 mt-1">{importSummary?.failed_imports}</p>
                <p className="text-xs text-red-700 mt-1">
                  {importSummary?.class_mapping_errors ? `Class errors: ${importSummary.class_mapping_errors}` : ''}
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Warnings</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{importSummary?.warnings}</p>
              </div>
            </div>

            {/* Available Classes */}
            <div className="bg-card rounded-lg border">
              <div className="p-4 border-b">
                <h4 className="font-medium">Available Classes</h4>
                <p className="text-sm text-muted-foreground">
                  Students must be assigned to one of these classes in the current academic year
                </p>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {availableClasses.length > 0 ? (
                    availableClasses.map((cls) => (
                      <span key={cls.id} className="px-2 py-1 bg-muted rounded-md text-sm">
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No classes found for current academic year</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Details */}
            {validationErrors.length > 0 && (
              <div className="bg-card rounded-lg border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h4 className="font-medium">Validation Issues</h4>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                    >
                      {showErrorDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={exportErrorReport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Errors
                    </button>
                  </div>
                </div>
                
                {showErrorDetails && (
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {validationErrors.map((error, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-l-4 ${
                            error.severity === 'error' 
                              ? 'bg-red-50 border-red-400 text-red-800' 
                              : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {error.severity === 'error' ? (
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                Row {error.row}: Admission Number={error.admission_number}: {error.field} - {error.message}
                              </div>
                              <div className="text-xs mt-1 opacity-90">
                                <strong>Action:</strong> {error.recommended_action}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                className="btn btn-outline btn-md"
                onClick={() => setCurrentStep('upload')}
              >
                Back to Upload
              </button>
              
              <button
                className="btn btn-primary btn-md"
                onClick={processImport}
                disabled={importSummary?.successful_imports === 0}
              >
                Import {importSummary?.successful_imports} Valid Records
              </button>
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Importing New Students</h3>
            <p className="text-muted-foreground">
              Processing student records...
            </p>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Import Complete</h3>
            
            {importSummary && (
              <div className="bg-muted p-6 rounded-lg max-w-md mx-auto mt-6">
                <h4 className="font-medium mb-4">Import Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Records:</span>
                    <span className="font-medium">{importSummary.total_records}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successfully Imported:</span>
                    <span className="font-medium text-success">{importSummary.successful_imports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Imports:</span>
                    <span className="font-medium text-error">{importSummary.failed_imports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Warnings:</span>
                    <span className="font-medium text-warning">{importSummary.warnings}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-4 mt-6">
              <button
                className="btn btn-outline btn-md"
                onClick={() => {
                  setCurrentStep('upload');
                  setImportedData([]);
                  setValidationErrors([]);
                  setImportSummary(null);
                }}
              >
                Import More Students
              </button>
              
              <button
                className="btn btn-primary btn-md"
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
              >
                Complete
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Import New Students</h2>
            <p className="text-sm text-muted-foreground">Import new student records for direct admission</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {['upload', 'validate', 'preview', 'import', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ['upload', 'validate', 'preview', 'import', 'complete'].indexOf(currentStep)
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    index < ['upload', 'validate', 'preview', 'import', 'complete'].indexOf(currentStep)
                      ? 'bg-success'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default StudentNewDataImport;