import { useState } from 'react';

const StudentRegistration = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Student Registration</h1>
      </div>
      
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-6">Register New Student</h2>
        
        <form className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className="input"
                  placeholder="Enter first name"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className="input"
                  placeholder="Enter last name"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="dob" className="block text-sm font-medium">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  className="input"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="gender" className="block text-sm font-medium">
                  Gender
                </label>
                <select id="gender" className="input">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="class" className="block text-sm font-medium">
                  Class
                </label>
                <select id="class" className="input">
                  <option value="">Select class</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                  <option value="VI">VI</option>
                  <option value="VII">VII</option>
                  <option value="VIII">VIII</option>
                  <option value="IX">IX</option>
                  <option value="X">X</option>
                  <option value="XI">XI</option>
                  <option value="XII">XII</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="section" className="block text-sm font-medium">
                  Section
                </label>
                <select id="section" className="input">
                  <option value="">Select section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Parent/Guardian Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Parent/Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="parentName" className="block text-sm font-medium">
                  Parent/Guardian Name
                </label>
                <input
                  id="parentName"
                  type="text"
                  className="input"
                  placeholder="Enter parent/guardian name"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="relationship" className="block text-sm font-medium">
                  Relationship
                </label>
                <select id="relationship" className="input">
                  <option value="">Select relationship</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium">
                  Phone Number
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    className="input rounded-l-none"
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium">
                  Address
                </label>
                <textarea
                  id="address"
                  rows={3}
                  className="input"
                  placeholder="Enter full address"
                />
              </div>
            </div>
          </div>
          
          {/* Fee Structure */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Fee Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="feeStructure" className="block text-sm font-medium">
                  Fee Structure
                </label>
                <select id="feeStructure" className="input">
                  <option value="">Select fee structure</option>
                  <option value="regular">Regular</option>
                  <option value="scholarship">Scholarship (25% off)</option>
                  <option value="staff">Staff Child (50% off)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="admissionFee" className="block text-sm font-medium">
                  Admission Fee
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <input
                    id="admissionFee"
                    type="number"
                    className="input rounded-l-none"
                    placeholder="Amount"
                    defaultValue="10000"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              className="btn btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
            >
              Register Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;