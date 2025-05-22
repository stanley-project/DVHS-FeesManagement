import { useState } from 'react';
import { Plus, Upload, Download, Filter, Eye, Pencil, ToggleLeft } from 'lucide-react';
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
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Class options including pre-primary classes
  const classOptions = [
    { value: 'nursery', label: 'Nursery' },
    { value: 'lkg', label: 'LKG' },
    { value: 'ukg', label: 'UKG' },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Class ${i + 1}`
    }))
  ];

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

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by name or admission number..."
            className="input w-full"
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
            {classOptions.map((cls) => (
              <option key={cls.value} value={cls.value}>{cls.label}</option>
            ))}
          </select>
          
          <select
            className="input"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="all">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
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

      {/* Students Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admission No.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admission Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
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
            Showing {filteredStudents.length} students
          </p>
          <div className="flex gap-1">
            <button
              className="btn btn-outline btn-sm"
              disabled={true}
            >
              Previous
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={true}
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