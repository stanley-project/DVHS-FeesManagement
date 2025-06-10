import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Student {
  id: string;
  admission_number: string;
  student_name: string;
  gender: string;
  date_of_birth: string;
  class_id: string;
  section: string;
  admission_date: string;
  status: 'active' | 'inactive';
  exit_date?: string;
  PEN: string;
  phone_number: string;
  father_name: string;
  mother_name: string;
  student_aadhar?: string;
  father_aadhar?: string;
  village_id?: string;
  has_school_bus: boolean;
  registration_type: 'new' | 'continuing';
  last_registration_date?: string;
  last_registration_type?: 'new' | 'continuing';
  previous_admission_number?: string;
  rejoining_reason?: string;
  created_at: string;
  updated_at: string;
  class?: {
    id: string;
    name: string;
  };
  village?: {
    id: string;
    name: string;
  };
}

interface UseStudentsOptions {
  search?: string;
  classFilter?: string;
  sectionFilter?: string;
  statusFilter?: string;
  page?: number;
  limit?: number;
}

export function useStudents(options: UseStudentsOptions = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('students')
        .select(`
          *,
          class:class_id(id, name),
          village:village_id(id, name)
        `, { count: 'exact' });

      // Apply filters
      if (options.search) {
        query = query.or(`student_name.ilike.%${options.search}%,admission_number.ilike.%${options.search}%`);
      }

      if (options.classFilter && options.classFilter !== 'all') {
        query = query.eq('class_id', options.classFilter);
      }

      if (options.sectionFilter && options.sectionFilter !== 'all') {
        query = query.eq('section', options.sectionFilter);
      }

      if (options.statusFilter && options.statusFilter !== 'all') {
        query = query.eq('status', options.statusFilter);
      }

      // Apply pagination
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      // Order by admission number
      query = query.order('admission_number', { ascending: true });

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setStudents(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select(`
          *,
          class:class_id(id, name),
          village:village_id(id, name)
        `)
        .single();

      if (error) throw error;

      setStudents(prev => [data, ...prev]);
      setTotalCount(prev => prev + 1);
      return data;
    } catch (err) {
      console.error('Error adding student:', err);
      throw err instanceof Error ? err : new Error('Failed to add student');
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id)
        .select(`
          *,
          class:class_id(id, name),
          village:village_id(id, name)
        `);

      if (error) throw error;

      // If RLS prevents returning the updated row, refresh the student list
      if (!data || data.length === 0) {
        await fetchStudents();
        return null; // Return null to indicate successful update but no immediate data
      }

      const updatedStudent = data[0];

      setStudents(prev => prev.map(student => 
        student.id === id ? updatedStudent : student
      ));
      return updatedStudent;
    } catch (err) {
      console.error('Error updating student:', err);
      throw err instanceof Error ? err : new Error('Failed to update student');
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStudents(prev => prev.filter(student => student.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting student:', err);
      throw err instanceof Error ? err : new Error('Failed to delete student');
    }
  };

  const toggleStudentStatus = async (id: string) => {
    try {
      const student = students.find(s => s.id === id);
      if (!student) throw new Error('Student not found');

      const newStatus = student.status === 'active' ? 'inactive' : 'active';
      const updateData: Partial<Student> = {
        status: newStatus,
        exit_date: newStatus === 'inactive' ? new Date().toISOString().split('T')[0] : null
      };

      await updateStudent(id, updateData);
    } catch (err) {
      console.error('Error toggling student status:', err);
      throw err instanceof Error ? err : new Error('Failed to toggle student status');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [options.search, options.classFilter, options.sectionFilter, options.statusFilter, options.page]);

  return {
    students,
    loading,
    error,
    totalCount,
    addStudent,
    updateStudent,
    deleteStudent,
    toggleStudentStatus,
    refreshStudents: fetchStudents
  };
}