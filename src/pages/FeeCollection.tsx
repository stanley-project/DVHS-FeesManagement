import { Search, ArrowRight, CheckCircle, Filter } from 'lucide-react';
import React, { useState } from 'react';

const FeeCollection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  
  const students = [
    { id: 'ST-1001', name: 'Amit Kumar', class: 'IX-A', pendingFee: '₹15,000', dueDate: '15 Aug 2025' },
    { id: 'ST-1002', name: 'Priya Sharma', class: 'X-B', pendingFee: '₹12,000', dueDate: '20 Sep 2025' },
    { id: 'ST-1003', name: 'Rahul Singh', class: 'VII-C', pendingFee: '₹9,500', dueDate: '10 Oct 2025' },
    { id: 'ST-1004', name: 'Sneha Gupta', class: 'V-A', pendingFee: '₹7,500', dueDate: '05 Nov 2025' },
    { id: 'ST-1005', name: 'Rajesh Verma', class: 'XII-B', pendingFee: '₹19,000', dueDate: '30 Aug 2025' },
  ];
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Fee Collection</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Search Panel */}
        <div className="lg:col-span-1 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Search Student</h2>
          </div>
          
          <div className="p-4">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, name or class"
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Students</h3>
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
                      <p className="text-xs text-muted-foreground">
                        {student.id} | {student.class}
                      </p>
                    </div>
                    <ArrowRight className={`h-4 w-4 transition-opacity ${selectedStudent === index ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                  </div>
                  <div className="mt-1 flex justify-between items-center">
                    <p className="text-sm">Pending: {student.pendingFee}</p>
                    <p className="text-xs text-muted-foreground">Due: {student.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Fee Collection Form */}
        <div className="lg:col-span-2 bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <h2 className="text-xl font-semibold">Fee Collection Details</h2>
          </div>
          
          {selectedStudent !== null ? (
            <div className="p-4">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-medium">{students[selectedStudent].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {students[selectedStudent].id} | {students[selectedStudent].class}
                  </p>
                </div>
                <div className="self-end sm:self-auto">
                  <span className="inline-block px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
                    Pending: {students[selectedStudent].pendingFee}
                  </span>
                </div>
              </div>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="feeType" className="block text-sm font-medium">
                      Fee Type
                    </label>
                    <select id="feeType" className="input">
                      <option value="term1">Term 1 Fee</option>
                      <option value="term2">Term 2 Fee</option>
                      <option value="term3">Term 3 Fee</option>
                      <option value="admissionFee">Admission Fee</option>
                      <option value="transportFee">Transport Fee</option>
                      <option value="examFee">Examination Fee</option>
                      <option value="otherFee">Other Fee</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="amount" className="block text-sm font-medium">
                      Amount
                    </label>
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                        ₹
                      </span>
                      <input
                        id="amount"
                        type="number"
                        className="input rounded-l-none"
                        placeholder="Enter amount"
                        defaultValue="15000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="paymentDate" className="block text-sm font-medium">
                      Payment Date
                    </label>
                    <input
                      id="paymentDate"
                      type="date"
                      className="input"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="paymentMode" className="block text-sm font-medium">
                      Payment Mode
                    </label>
                    <select id="paymentMode" className="input">
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque/DD</option>
                      <option value="online">Online Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="remarks" className="block text-sm font-medium">
                      Remarks
                    </label>
                    <textarea
                      id="remarks"
                      rows={3}
                      className="input"
                      placeholder="Any additional information about this payment"
                    />
                  </div>
                </div>
                
                <div className="border-t pt-4 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    className="btn btn-outline btn-md"
                    onClick={() => setSelectedStudent(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-md inline-flex items-center"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Collect Fee & Generate Receipt
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a Student</h3>
              <p className="text-muted-foreground">
                Select a student from the left panel to collect fees
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeeCollection;