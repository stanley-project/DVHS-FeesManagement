import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, FileText, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ImportedStudent {
  admission_number: string;
  student_name: string;
  gender: string;
  date_of_birth: string;
  date_of_admission: string; // Added required field
  current_class: string;
  promoted_class: string;
  section: string;
  pen?: string; // Replaced address with PEN (11 characters)
  phone_number: string;
  father_name: string;
  mother_name: string;
  student_aadhar?: string;
  father_aadhar?: string;
  village_name?: string;
  has_school_bus: boolean;
  status: 'active' | 'inactive';
  last_fee_payment_date?: string;
  outstanding_amount?: number;
  row_number: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
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
  records_requiring_attention: number;
}

interface StudentDataImportProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const StudentDataImport: React.FC<StudentDataImportProps> = ({ onClose, onImportComplete }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedData, setImportedData] = useState<ImportedStudent[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'validate' | 'preview' | 'import' | 'complete'>('upload');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Class mapping for promotion
  const classPromotionMap: Record<string, string> = {
    'Nursery': 'LKG-A',
    'LKG-A': '1-A', 'LKG-B': '1-B', 'LKG-C': '1-C',
    '1-A': '2-A', '1-B': '2-B', '1-C': '2-C', '1-D': '2-D',
    '2-A': '3-A', '2-B': '3-B', '2-C': '3-C',
    '3-A': '4-A', '3-B': '4-B', '3-C': '4-C',
    '4-A': '5-A', '4-B': '5-B', '4-C': '5-C',
    '5-A': '6-A', '5-B': '6-B', '5-C': '6-C',
    '6-A': '7-A', '7-A': '8-A', '8-A': '9', '9': '10'
  };

  const downloadTemplate = () => {
    const template = [
      {
        admission_number: 'ST-1001',
        student_name: 'John Doe',
        gender: 'male',
        date_of_birth: '2010-05-15',
        date_of_admission: '2020-06-01',
        current_class: '8-A',
        pen: 'ABC123DEF45',
        phone_number: '9876543210',
        father_name: 'Robert Doe',
        mother_name: 'Jane Doe',
        student_aadhar: '123456789012',
        father_aadhar: '987654321098',
        village_name: 'Village Name',
        has_school_bus: 'Yes',
        status: 'active',
        last_fee_payment_date: '2024-12-15',
        outstanding_amount: '0'
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
      'Current Class (2024-25)',
      'PEN (11 alphanumeric chars)',
      'Phone Number (10 digits)',
      'Father Name (Required)',
      'Mother Name (Required)',
      'Student Aadhar (12 digits)',
      'Father Aadhar (12 digits)',
      'Village Name',
      'School Bus (Yes/No)',
      'Status (active/inactive)',
      'Last Fee Payment Date',
      'Outstanding Amount'
    ];

    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    XLSX.utils.book_append_sheet(wb, ws, 'Student Import Template');
    
    const fileName = `Student_Import_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Template downloaded successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row and process data
        const processedData: ImportedStudent[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length === 0 || !row[0]) continue; // Skip empty rows

          const student: ImportedStudent = {
            admission_number: row[0]?.toString().trim() || '',
            student_name: row[1]?.toString().trim() || '',
            gender: row[2]?.toString().toLowerCase().trim() || '',
            date_of_birth: formatDate(row[3]),
            date_of_admission: formatDate(row[4]), // New required field
            current_class: row[5]?.toString().trim() || '',
            promoted_class: classPromotionMap[row[5]?.toString().trim()] || row[5]?.toString().trim(),
            section: 'A', // Default section
            pen: row[6]?.toString().trim().toUpperCase() || undefined, // PEN field (optional, 11 chars)
            phone_number: row[7]?.toString().trim() || '',
            father_name: row[8]?.toString().trim() || '',
            mother_name: row[9]?.toString().trim() || '',
            student_aadhar: row[10]?.toString().trim() || undefined,
            father_aadhar: row[11]?.toString().trim() || undefined,
            village_name: row[12]?.toString().trim() || undefined,
            has_school_bus: ['yes', 'true', '1'].includes(row[13]?.toString().toLowerCase().trim() || ''),
            status: ['active', 'inactive'].includes(row[14]?.toString().toLowerCase().trim()) 
              ? row[14]?.toString().toLowerCase().trim() as 'active' | 'inactive' 
              : 'active',
            last_fee_payment_date: formatDate(row[15]),
            outstanding_amount: parseFloat(row[16]?.toString() || '0') || 0,
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

  const validateData = async (data: ImportedStudent[]) => {
    setIsProcessing(true);
    const errors: ValidationError[] = [];
    const duplicateCheck = new Set<string>();

    try {
      // Get existing students to check for duplicates
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('admission_number')
        .eq('status', 'active');

      if (error) throw error;

      const existingAdmissionNumbers = new Set(existingStudents?.map(s => s.admission_number) || []);

      // Get available villages
      const { data: villages, error: villageError } = await supabase
        .from('villages')
        .select('name')
        .eq('is_active', true);

      if (villageError) throw villageError;

      const availableVillages = new Set(villages?.map(v => v.name.toLowerCase()) || []);

      data.forEach((student, index) => {
        const row = student.row_number;

        // Required field validation
        if (!student.admission_number) {
          errors.push({ row, field: 'admission_number', message: 'Admission number is required', severity: 'error' });
        }
        if (!student.student_name) {
          errors.push({ row, field: 'student_name', message: 'Student name is required', severity: 'error' });
        }
        if (!student.date_of_admission) {
          errors.push({ row, field: 'date_of_admission', message: 'Date of admission is required', severity: 'error' });
        }
        if (!student.father_name) {
          errors.push({ row, field: 'father_name', message: 'Father name is required', severity: 'error' });
        }
        if (!student.mother_name) {
          errors.push({ row, field: 'mother_name', message: 'Mother name is required', severity: 'error' });
        }

        // Format validation
        if (student.phone_number && !/^\d{10}$/.test(student.phone_number)) {
          errors.push({ row, field: 'phone_number', message: 'Phone number must be 10 digits', severity: 'error' });
        }
        if (student.student_aadhar && !/^\d{12}$/.test(student.student_aadhar)) {
          errors.push({ row, field: 'student_aadhar', message: 'Student Aadhar must be 12 digits', severity: 'error' });
        }
        if (student.father_aadhar && !/^\d{12}$/.test(student.father_aadhar)) {
          errors.push({ row, field: 'father_aadhar', message: 'Father Aadhar must be 12 digits', severity: 'error' });
        }
        if (!['male', 'female', 'other'].includes(student.gender)) {
          errors.push({ row, field: 'gender', message: 'Gender must be male, female, or other', severity: 'error' });
        }

        // PEN validation (optional but must be valid if provided - 11 characters)
        if (student.pen && !/^[A-Z0-9]{11}$/.test(student.pen)) {
          errors.push({ row, field: 'pen', message: 'PEN must be exactly 11 alphanumeric characters', severity: 'error' });
        }

        // Date validation
        if (student.date_of_birth && isNaN(new Date(student.date_of_birth).getTime())) {
          errors.push({ row, field: 'date_of_birth', message: 'Invalid date of birth format', severity: 'error' });
        }
        if (student.date_of_admission && isNaN(new Date(student.date_of_admission).getTime())) {
          errors.push({ row, field: 'date_of_admission', message: 'Invalid date of admission format', severity: 'error' });
        }

        // Date logic validation
        if (student.date_of_birth && student.date_of_admission) {
          const birthDate = new Date(student.date_of_birth);
          const admissionDate = new Date(student.date_of_admission);
          if (admissionDate <= birthDate) {
            errors.push({ row, field: 'date_of_admission', message: 'Date of admission must be after date of birth', severity: 'error' });
          }
        }

        // Duplicate check within file
        if (student.admission_number) {
          if (duplicateCheck.has(student.admission_number)) {
            errors.push({ row, field: 'admission_number', message: 'Duplicate admission number in file', severity: 'error' });
          } else {
            duplicateCheck.add(student.admission_number);
          }

          // Check against existing students
          if (existingAdmissionNumbers.has(student.admission_number)) {
            errors.push({ row, field: 'admission_number', message: 'Student already exists in database', severity: 'warning' });
          }
        }

        // Village validation
        if (student.village_name && !availableVillages.has(student.village_name.toLowerCase())) {
          errors.push({ row, field: 'village_name', message: 'Village not found in system', severity: 'warning' });
        }

        // Class promotion validation
        if (!student.promoted_class) {
          errors.push({ row, field: 'current_class', message: 'Cannot determine promoted class', severity: 'warning' });
        }

        // Outstanding amount warning
        if (student.outstanding_amount && student.outstanding_amount > 0) {
          errors.push({ row, field: 'outstanding_amount', message: `Outstanding amount: ₹${student.outstanding_amount}`, severity: 'warning' });
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

  const generateImportSummary = (data: ImportedStudent[], errors: ValidationError[]) => {
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
      records_requiring_attention: warningRows.size
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

      const classMap = new Map(classes?.map(c => [c.name, c.id]) || []);

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
          const studentData = {
            admission_number: student.admission_number,
            student_name: student.student_name,
            gender: student.gender,
            date_of_birth: student.date_of_birth,
            class_id: classMap.get(student.promoted_class) || null,
            section: student.section,
            admission_date: student.date_of_admission, // Use the imported admission date
            status: student.status,
            address: student.pen || 'Not provided', // Map PEN to address field for database compatibility
            phone_number: student.phone_number,
            father_name: student.father_name,
            mother_name: student.mother_name,
            student_aadhar: student.student_aadhar || null,
            father_aadhar: student.father_aadhar || null,
            village_id: student.village_name ? villageMap.get(student.village_name.toLowerCase()) || null : null,
            has_school_bus: student.has_school_bus,
            registration_type: 'continuing' as const,
            last_registration_date: new Date().toISOString().split('T')[0],
            last_registration_type: 'continuing' as const,
            pen: student.pen || null // Store PEN separately if you add this field to the database
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
      'Field': error.field,
      'Error Type': error.severity,
      'Message': error.message
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(errorReport);
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');

    const fileName = `Import_Errors_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Error report exported successfully');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="text-center py-12">
            <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload Student Data</h3>
            <p className="text-muted-foreground mb-6">
              Upload an Excel file containing student records from 2024-2025 academic year
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
                <li>• <strong>Date of Admission:</strong> Required field (YYYY-MM-DD format)</li>
                <li>• <strong>PEN:</strong> Optional 11-character alphanumeric code (replaces Address)</li>
                <li>• <strong>Required fields:</strong> Admission Number, Student Name, Father Name, Mother Name, Date of Admission</li>
                <li>• <strong>Date formats:</strong> Use YYYY-MM-DD format for all dates</li>
                <li>• <strong>Gender:</strong> Must be 'male', 'female', or 'other'</li>
                <li>• <strong>Phone Number:</strong> Must be exactly 10 digits</li>
                <li>• <strong>Aadhar Numbers:</strong> Must be exactly 12 digits if provided</li>
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
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Warnings</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{importSummary?.warnings}</p>
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
                    <div className="space-y-2">
                      {validationErrors.map((error, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 p-2 rounded text-sm ${
                            error.severity === 'error' 
                              ? 'bg-red-50 text-red-800' 
                              : 'bg-yellow-50 text-yellow-800'
                          }`}
                        >
                          {error.severity === 'error' ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <span>Row {error.row}: {error.field} - {error.message}</span>
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
            <h3 className="text-lg font-medium mb-2">Importing Students</h3>
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
            <h2 className="text-xl font-semibold">Import Continuing Students</h2>
            <p className="text-sm text-muted-foreground">Import student records from 2024-2025 academic year</p>
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

export default StudentDataImport;