import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ImportStats {
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  duplicates: number;
  validationErrors: number;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function useStudentImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);

  const validateStudentData = async (students: any[]) => {
    const errors: ImportError[] = [];
    const duplicateCheck = new Set<string>();

    // Get existing students for duplicate checking
    const { data: existingStudents } = await supabase
      .from('students')
      .select('admission_number')
      .eq('status', 'active');

    const existingNumbers = new Set(existingStudents?.map(s => s.admission_number) || []);

    students.forEach((student, index) => {
      const row = index + 2; // Account for header row

      // Required field validation
      if (!student.admission_number) {
        errors.push({ row, field: 'admission_number', message: 'Admission number is required', severity: 'error' });
      }
      if (!student.student_name) {
        errors.push({ row, field: 'student_name', message: 'Student name is required', severity: 'error' });
      }
      if (!student.father_name) {
        errors.push({ row, field: 'father_name', message: 'Father name is required', severity: 'error' });
      }
      if (!student.mother_name) {
        errors.push({ row, field: 'mother_name', message: 'Mother name is required', severity: 'error' });
      }
      if (!student.address) {
        errors.push({ row, field: 'address', message: 'Address is required', severity: 'error' });
      }

      // Format validation
      if (student.phone_number && !/^\d{10}$/.test(student.phone_number)) {
        errors.push({ row, field: 'phone_number', message: 'Phone number must be 10 digits', severity: 'error' });
      }

      if (student.student_aadhar && !/^\d{12}$/.test(student.student_aadhar)) {
        errors.push({ row, field: 'student_aadhar', message: 'Student Aadhar must be 12 digits', severity: 'error' });
      }

      // Duplicate checking
      if (student.admission_number) {
        if (duplicateCheck.has(student.admission_number)) {
          errors.push({ row, field: 'admission_number', message: 'Duplicate admission number in file', severity: 'error' });
        } else {
          duplicateCheck.add(student.admission_number);
        }

        if (existingNumbers.has(student.admission_number)) {
          errors.push({ row, field: 'admission_number', message: 'Student already exists in database', severity: 'warning' });
        }
      }

      // Gender validation
      if (!['male', 'female', 'other'].includes(student.gender?.toLowerCase())) {
        errors.push({ row, field: 'gender', message: 'Gender must be male, female, or other', severity: 'error' });
      }

      // Date validation
      if (student.date_of_birth && isNaN(new Date(student.date_of_birth).getTime())) {
        errors.push({ row, field: 'date_of_birth', message: 'Invalid date format', severity: 'error' });
      }
    });

    setImportErrors(errors);
    return errors;
  };

  const importStudents = async (students: any[]) => {
    setIsImporting(true);
    
    try {
      // Validate data first
      const errors = await validateStudentData(students);
      const errorRows = new Set(errors.filter(e => e.severity === 'error').map(e => e.row - 2));
      
      // Filter out invalid records
      const validStudents = students.filter((_, index) => !errorRows.has(index));
      
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      // Get current academic year
      const { data: currentYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (!currentYear) {
        throw new Error('No current academic year found');
      }

      // Get class mappings
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .eq('academic_year_id', currentYear.id);

      const classMap = new Map(classes?.map(c => [c.name, c.id]) || []);

      // Get village mappings
      const { data: villages } = await supabase
        .from('villages')
        .select('id, name');

      const villageMap = new Map(villages?.map(v => [v.name.toLowerCase(), v.id]) || []);

      // Process each valid student
      for (const student of validStudents) {
        try {
          // Check if student already exists
          const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('admission_number', student.admission_number)
            .single();

          if (existing) {
            duplicateCount++;
            continue;
          }

          // Prepare student data
          const studentData = {
            admission_number: student.admission_number,
            student_name: student.student_name,
            gender: student.gender?.toLowerCase() || 'male',
            date_of_birth: student.date_of_birth,
            class_id: classMap.get(student.promoted_class) || null,
            section: 'A', // Default section
            admission_date: new Date().toISOString().split('T')[0],
            status: 'active' as const,
            address: student.address,
            phone_number: student.phone_number,
            father_name: student.father_name,
            mother_name: student.mother_name,
            student_aadhar: student.student_aadhar || null,
            father_aadhar: student.father_aadhar || null,
            village_id: student.village_name ? villageMap.get(student.village_name.toLowerCase()) || null : null,
            has_school_bus: student.has_school_bus || false,
            registration_type: 'continuing' as const,
            last_registration_date: new Date().toISOString().split('T')[0],
            last_registration_type: 'continuing' as const
          };

          const { error } = await supabase
            .from('students')
            .insert([studentData]);

          if (error) {
            console.error('Insert error:', error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Processing error:', error);
          failCount++;
        }
      }

      const stats: ImportStats = {
        totalProcessed: students.length,
        successfulImports: successCount,
        failedImports: failCount + errorRows.size,
        duplicates: duplicateCount,
        validationErrors: errors.filter(e => e.severity === 'error').length
      };

      setImportStats(stats);
      return stats;

    } catch (error) {
      console.error('Import error:', error);
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setImportStats(null);
    setImportErrors([]);
  };

  return {
    isImporting,
    importStats,
    importErrors,
    importStudents,
    validateStudentData,
    resetImport
  };
}