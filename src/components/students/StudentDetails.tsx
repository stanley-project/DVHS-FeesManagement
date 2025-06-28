import { X, User, Phone, MapPin, Calendar, GraduationCap, Bus } from 'lucide-react';
import { Student } from '../../hooks/useStudents';

interface StudentDetailsProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
}

const StudentDetails = ({ student, onClose, onEdit }: StudentDetailsProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">{student.student_name}</h2>
            <p className="text-sm text-muted-foreground">Student Details</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="btn btn-outline btn-sm"
            >
              Edit Student
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Admission Number</p>
                      <p className="font-medium">{student.admission_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{student.gender}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{new Date(student.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {student.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Class</p>
                      <p className="font-medium">{student.class?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Section</p>
                      <p className="font-medium">{student.section}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Admission Date</p>
                      <p className="font-medium">{new Date(student.admission_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Type</p>
                      <p className="font-medium capitalize">{student.registration_type}</p>
                    </div>
                  </div>
                  {student.exit_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Exit Date</p>
                      <p className="font-medium">{new Date(student.exit_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Family Information */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{student.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PEN (Permanent Education Number)</p>
                    <p className="font-medium">{student.PEN}</p>
                  </div>
                  {student.village && (
                    <div>
                      <p className="text-sm text-muted-foreground">Village</p>
                      <p className="font-medium">{student.village.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Family Information */}
              <div>
                <h3 className="text-lg font-medium mb-4">Family Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Father's Name</p>
                    <p className="font-medium">{student.father_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mother's Name</p>
                    <p className="font-medium">{student.mother_name}</p>
                  </div>
                  {student.student_aadhar && (
                    <div>
                      <p className="text-sm text-muted-foreground">Student Aadhar</p>
                      <p className="font-medium">{student.student_aadhar}</p>
                    </div>
                  )}
                  {student.father_aadhar && (
                    <div>
                      <p className="text-sm text-muted-foreground">Father's Aadhar</p>
                      <p className="font-medium">{student.father_aadhar}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transport Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Transport Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">School Bus Service</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      student.has_school_bus ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {student.has_school_bus ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {student.has_school_bus && student.bus_start_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bus Service Start Date</p>
                      <p className="font-medium">{new Date(student.bus_start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Registration History */}
          {(student.previous_admission_number || student.rejoining_reason) && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Registration History
              </h3>
              <div className="space-y-3">
                {student.previous_admission_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Previous Admission Number</p>
                    <p className="font-medium">{student.previous_admission_number}</p>
                  </div>
                )}
                {student.rejoining_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Rejoining Reason</p>
                    <p className="font-medium">{student.rejoining_reason}</p>
                  </div>
                )}
                {student.last_registration_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Registration Date</p>
                    <p className="font-medium">{new Date(student.last_registration_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="mt-8 pt-6 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p>Created: {new Date(student.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p>Last Updated: {new Date(student.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;