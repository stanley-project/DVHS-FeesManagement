import { useState } from 'react';
import { Search, CircleDollarSign, Filter, ArrowRight, FileText } from 'lucide-react';

const StudentFeeStatus = () => {
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  
  // Mock data for students in the teacher's class
  const students = [
    { id: 'ST-1001', name: 'Amit Kumar', totalFee: '₹45,000', paid: '₹45,000', pending: '₹0', status: 'paid' },
    { id: 'ST-1002', name: 'Priya Sharma', totalFee: '₹45,000', paid: '₹30,000', pending: '₹15,000', status: 'partial' },
    { id: 'ST-1003', name: 'Rahul Singh', totalFee: '₹45,000', paid: '₹45,000', pending: '₹0', status: 'paid' },
    { id: 'ST-1004', name: 'Sneha Gupta', totalFee: '₹45,000', paid: '₹45,000', pending: '₹0', status: 'paid' },
    { id: 'ST-1005', name: 'Rajesh Verma', totalFee: '₹45,000', paid: '₹0', pending: '₹45,000', status: 'pending' },
  ];
  
  // Mock data for fee payment history
  const feeHistory = [
    { id: 'RC-2025', type: 'Term 1 Fee', amount: '₹15,000', date: '15 Jun 2025', status: 'Paid' },
    { id: 'RC-2024', type: 'Term 2 Fee', amount: '₹15,000', date: '15 Sep 2025', status: 'Paid' },
    { id: 'RC-2023', type: 'Term 3 Fee', amount: '₹15,000', date: '15 Dec 2025', status: 'Pending' },
  ];
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Fee Status</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Class:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            IX-A
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List Panel */}
        <div className="lg:col-span-1 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Students</h2>
          </div>
          
          <div className="p-4">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search by name or ID"
                className="input pl-10"
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Your Class: IX-A</h3>
              <button className="btn btn-ghost btn-sm inline-flex items-center text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </button>
            </div>
            
            <div className="divide-y">
              {students.map((student, index) => (
                <div
                  key={index}
                  className={`py-3 px-2 hover:bg-muted rounded-md cursor-pointer transition-colors ${selectedStudent === index ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedStudent(index)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.id}</p>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-opacity ${selectedStudent === index ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                  </div>
                  <div className="mt-1 flex justify-between items-center">
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        student.status === 'paid' ? 'bg-success' : 
                        student.status === 'partial' ? 'bg-warning' : 
                        'bg-error'
                      }`}></span>
                      <span className="text-xs capitalize">{student.status}</span>
                    </div>
                    {student.status !== 'paid' && (
                      <p className="text-xs text-muted-foreground">Pending: {student.pending}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Fee Status Details Panel */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Fee Status Details</h2>
          </div>
          
          {selectedStudent !== null ? (
            <div className="p-4">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-medium">{students[selectedStudent].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {students[selectedStudent].id} | Class IX-A
                  </p>
                </div>
                <div className="self-end sm:self-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    students[selectedStudent].status === 'paid' ? 'bg-success/10 text-success' : 
                    students[selectedStudent].status === 'partial' ? 'bg-warning/10 text-warning' : 
                    'bg-error/10 text-error'
                  }`}>
                    {students[selectedStudent].status === 'paid' ? 'Fully Paid' : 
                      students[selectedStudent].status === 'partial' ? 'Partially Paid' : 
                      'Payment Pending'}
                  </span>
                </div>
              </div>
              
              {/* Fee Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Fee Summary (Academic Year 2025-26)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-lg font-semibold">{students[selectedStudent].totalFee}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Paid Amount</p>
                    <p className="text-lg font-semibold text-success">{students[selectedStudent].paid}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">Pending Amount</p>
                    <p className={`text-lg font-semibold ${students[selectedStudent].status !== 'paid' ? 'text-error' : ''}`}>
                      {students[selectedStudent].pending}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Fee Payment History */}
              <div>
                <h4 className="text-sm font-medium mb-3">Fee Payment History</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt ID</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeHistory.map((fee, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{fee.id}</td>
                          <td className="px-3 py-2">{fee.type}</td>
                          <td className="px-3 py-2">{fee.amount}</td>
                          <td className="px-3 py-2">{fee.date}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              fee.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {fee.status === 'Paid' && (
                              <button className="btn btn-ghost btn-sm p-0 text-primary hover:text-primary/80">
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
              
              {/* Fee Structure */}
              <div className="mt-6 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Fee Structure (Class IX)</h4>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1 text-muted-foreground">Tuition Fee (Per Term)</td>
                      <td className="py-1 text-right">₹12,000</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">Development Fee (Per Term)</td>
                      <td className="py-1 text-right">₹1,500</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-muted-foreground">Computer & Library Fee (Per Term)</td>
                      <td className="py-1 text-right">₹1,500</td>
                    </tr>
                    <tr className="border-t">
                      <td className="py-1 font-medium">Total Fee Per Term</td>
                      <td className="py-1 text-right font-medium">₹15,000</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">Annual Fee (3 Terms)</td>
                      <td className="py-1 text-right font-medium">₹45,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a Student</h3>
              <p className="text-muted-foreground">
                Select a student from the left panel to view fee details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFeeStatus;