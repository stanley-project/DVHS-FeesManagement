import { useState } from 'react';
import { ArrowUpDown, Eye, Pencil, ToggleLeft, Download, Filter, Search, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  class: string;
  section: string;
  admissionDate: string;
  status: 'active' | 'inactive';
}

const StudentTable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock data - replace with actual API call
  const students: Student[] = [
    {
      id: '1',
      admissionNumber: 'ADM2025001',
      name: 'Rahul Kumar',
      class: 'IX',
      section: 'A',
      admissionDate: '2025-06-01',
      status: 'active',
    },
    // Add more mock data as needed
  ];

  const itemsPerPage = 10;
  const totalPages = Math.ceil(students.length / itemsPerPage);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.class === selectedClass;
    const matchesSection = selectedSection === 'all' || student.section === selectedSection;
    const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;

    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            className="input pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="input"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map(
              (cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              )
            )}
          </select>
          
          <select
            className="input"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="all">All Sections</option>
            {['A', 'B', 'C', 'D'].map((section) => (
              <option key={section} value={section}>Section {section}</option>
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
          
          <button className="btn btn-outline btn-icon" title="Export">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Admission No.
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Student Name
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Section</th>
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Admission Date
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => (
                <tr key={student.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{student.admissionNumber}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.class}</td>
                  <td className="px-4 py-3">{student.section}</td>
                  <td className="px-4 py-3">{student.admissionDate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {student.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button className="p-1 hover:bg-muted rounded-md" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded-md" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded-md" title="Toggle Status">
                        <ToggleLeft className="h-4 w-4" />
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
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
      </div>
    </div>
  );
};

export default StudentTable;