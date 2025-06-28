import { useState } from 'react';
import { Plus, Upload, Download, Filter, Eye, Pencil, ToggleLeft, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudents, Student } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import SearchInput from '../shared/SearchInput';
import * as XLSX from 'xlsx';

interface StudentTableProps {
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onViewStudent: (student: Student) => void;
}

const StudentTable = ({ onAddStudent, onEditStudent, onViewStudent }: StudentTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [sortField, setSortField] = useState<string>('admission_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;

  const { classes } = useClasses();
  const { 
    students, 
    loading, 
    error, 
    totalCount, 
    deleteStudent, 
    toggleStudentStatus,
    fetchAllStudents
  } = useStudents({
    search: searchQuery,
    classFilter: selectedClass,
    statusFilter: selectedStatus,
    page: currentPage,
    limit: itemsPerPage,
    sortField,
    sortDirection
  });

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.student_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStudent(student.id);
      toast.success('Student deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete student');
    }
  };

  const handleToggleStatus = async (student: Student) => {
    try {
      await toggleStudentStatus(student.id);
      toast.success(`Student ${student.status === 'active' ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update student status');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const handleExportStudents = async () => {
    try {
      setIsExporting(true);
      toast.loading('Preparing export... This may take a moment for large datasets');
      
      // Fetch all students based on current filters (without pagination)
      const allStudents = await fetchAllStudents();
      
      // Prepare data for export
      const exportData = allStudents.map(student => ({
        'Admission Number': student.admission_number,
        'Student Name': student.student_name,
        'Class': student.class?.name || 'N/A',
        'Gender': student.gender,
        'Date of Birth': new Date(student.date_of_birth).toLocaleDateString(),
        'Admission Date': new Date(student.admission_date).toLocaleDateString(),
        'Father Name': student.father_name,
        'Mother Name': student.mother_name,
        'Phone Number': student.phone_number,
        'Village': student.village?.name || 'N/A',
        'Bus Service': student.has_school_bus ? 'Yes' : 'No',
        'Status': student.status === 'active' ? 'Active' : 'Inactive',
        'Registration Type': student.registration_type === 'new' ? 'New' : 'Continuing',
        'PEN': student.PEN || 'N/A',
        'Student Aadhar': student.student_aadhar || 'N/A',
        'Father Aadhar': student.father_aadhar || 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Students_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      toast.dismiss();
      toast.success(`Exported ${allStudents.length} students successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Failed to export students');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-error mb-4">Error loading students</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or admission number..."
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="input"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          
          <select
            className="input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <button 
            className="btn btn-outline btn-icon" 
            title="Export"
            onClick={handleExportStudents}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <div className="dropdown">
          <button className="btn btn-outline btn-md">
            Import Students
          </button>
          <div className="dropdown-content">
            <ul className="menu">
              <li>
                <button onClick={() => window.dispatchEvent(new CustomEvent('import-new-students'))}>
                  Import New Students
                </button>
              </li>
              <li>
                <button onClick={() => window.dispatchEvent(new CustomEvent('import-continuing-students'))}>
                  Import Continuing Students
                </button>
              </li>
            </ul>
          </div>
        </div>
        
        <button
          className="btn btn-primary btn-md"
          onClick={onAddStudent}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Student
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <span className="ml-2 text-muted-foreground">Loading students...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">No students found</div>
            {searchQuery || selectedClass !== 'all' || selectedStatus !== 'all' ? (
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={onAddStudent}
              >
                Add your first student
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort('admission_number')}
                      >
                        Admission No.
                        <ArrowUpDown className={`h-4 w-4 ${sortField === 'admission_number' ? 'text-primary' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort('student_name')}
                      >
                        Student Name
                        <ArrowUpDown className={`h-4 w-4 ${sortField === 'student_name' ? 'text-primary' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort('class_id')}
                      >
                        Class
                        <ArrowUpDown className={`h-4 w-4 ${sortField === 'class_id' ? 'text-primary' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort('admission_date')}
                      >
                        Admission Date
                        <ArrowUpDown className={`h-4 w-4 ${sortField === 'admission_date' ? 'text-primary' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        <ArrowUpDown className={`h-4 w-4 ${sortField === 'status' ? 'text-primary' : ''}`} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{student.admission_number}</td>
                      <td className="px-4 py-3">{student.student_name}</td>
                      <td className="px-4 py-3">{student.class?.name || 'N/A'}</td>
                      <td className="px-4 py-3">{new Date(student.admission_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                          {student.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="p-1 hover:bg-muted rounded-md" 
                            title="View Details"
                            onClick={() => onViewStudent(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 hover:bg-muted rounded-md" 
                            title="Edit"
                            onClick={() => onEditStudent(student)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 hover:bg-muted rounded-md" 
                            title="Toggle Status"
                            onClick={() => handleToggleStatus(student)}
                          >
                            <ToggleLeft className={`h-4 w-4 ${
                              student.status === 'active' ? 'text-success' : 'text-muted-foreground'
                            }`} />
                          </button>
                          <button 
                            className="p-1 hover:bg-muted rounded-md text-error" 
                            title="Delete"
                            onClick={() => handleDelete(student)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} students
              </p>
              <div className="flex gap-1">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentTable;