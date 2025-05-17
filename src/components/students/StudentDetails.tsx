import { FileText, Download, Pencil, CircleDollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StudentDetailsProps {
  student: {
    id: string;
    admissionNumber: string;
    name: string;
    class: string;
    section: string;
    admissionDate: string;
    dateOfBirth: string;
    gender: string;
    status: 'active' | 'inactive';
    address: string;
    phoneNumber: string;
    studentAadhar?: string;
    fatherName: string;
    motherName: string;
    fatherAadhar?: string;
  };
}

const StudentDetails = ({ student }: StudentDetailsProps) => {
  // Mock payment history data
  const paymentHistory = [
    {
      id: 'PMT001',
      date: '2025-06-15',
      type: 'Term 1 Fee',
      amount: '₹15,000',
      status: 'paid',
    },
    {
      id: 'PMT002',
      date: '2025-09-15',
      type: 'Term 2 Fee',
      amount: '₹15,000',
      status: 'pending',
    },
    {
      id: 'PMT003',
      date: '2025-12-15',
      type: 'Term 3 Fee',
      amount: '₹15,000',
      status: 'pending',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Student Details</h2>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" title="Download PDF">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
          <Link to={`/students/${student.id}/edit`} className="btn btn-primary btn-sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Student
          </Link>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Details */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Basic Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Admission Number</dt>
              <dd className="font-medium">{student.admissionNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Student Name</dt>
              <dd className="font-medium">{student.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Class & Section</dt>
              <dd className="font-medium">{student.class}-{student.section}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="font-medium">{student.gender}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Date of Birth</dt>
              <dd className="font-medium">{student.dateOfBirth}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Admission Date</dt>
              <dd className="font-medium">{student.admissionDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  student.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}>
                  {student.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Details */}
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Contact Information</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium text-right">{student.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Phone Number</dt>
              <dd className="font-medium">+91 {student.phoneNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Student Aadhar</dt>
              <dd className="font-medium">{student.studentAadhar || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Father's Name</dt>
              <dd className="font-medium">{student.fatherName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Mother's Name</dt>
              <dd className="font-medium">{student.motherName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Father's Aadhar</dt>
              <dd className="font-medium">{student.fatherAadhar || 'Not provided'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Fee Information */}
      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Fee Information</h3>
          <Link to={`/fee-collection?student=${student.id}`} className="btn btn-primary btn-sm">
            <CircleDollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Link>
        </div>

        {/* Outstanding Fees */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Outstanding Fees</h4>
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-error">₹30,000</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-sm font-medium">15 Sep 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div>
          <h4 className="text-sm font-medium mb-2">Payment History</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Receipt ID</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{payment.id}</td>
                    <td className="px-4 py-2">{payment.date}</td>
                    <td className="px-4 py-2">{payment.type}</td>
                    <td className="px-4 py-2 text-right">{payment.amount}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {payment.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {payment.status === 'paid' && (
                        <button className="text-primary hover:text-primary/80">
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;