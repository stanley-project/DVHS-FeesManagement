import { useState } from 'react';
import { BarChart3, Download, FileText, Filter, Mail, ArrowUpDown } from 'lucide-react';
import CollectionReport from '../components/reports/CollectionReport';
import OutstandingReport from '../components/reports/OutstandingReport';
import StudentReport from '../components/reports/StudentReport';
import AnalyticsDashboard from '../components/reports/AnalyticsDashboard';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('collection');
  const [selectedReport, setSelectedReport] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedFeeType, setSelectedFeeType] = useState('all');
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Reports</h1>
        
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm inline-flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            Email Report
          </button>
          <button className="btn btn-outline btn-sm inline-flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Report Tabs */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'collection' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('collection')}
            >
              Collection Reports
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'outstanding' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('outstanding')}
            >
              Outstanding Reports
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'student' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('student')}
            >
              Student Reports
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics Dashboard
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-6">
          {/* Common Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {activeTab !== 'analytics' && (
              <>
                <select
                  className="input text-sm"
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                >
                  {activeTab === 'collection' && (
                    <>
                      <option value="daily">Daily Collection</option>
                      <option value="monthly">Monthly Collection</option>
                      <option value="feeType">Fee Type Collection</option>
                    </>
                  )}
                  {activeTab === 'outstanding' && (
                    <>
                      <option value="classwise">Class-wise Outstanding</option>
                      <option value="studentwise">Student-wise Outstanding</option>
                      <option value="aging">Aging Analysis</option>
                      <option value="feeType">Fee Type Outstanding</option>
                    </>
                  )}
                  {activeTab === 'student' && (
                    <>
                      <option value="feeStatus">Fee Status Report</option>
                      <option value="classwise">Class-wise Student Count</option>
                      <option value="newAdmissions">New Admissions Report</option>
                    </>
                  )}
                </select>

                <div className="flex gap-2">
                  <input
                    type="date"
                    className="input text-sm"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input text-sm"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>

                <select
                  className="input text-sm"
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
                  className="input text-sm"
                  value={selectedFeeType}
                  onChange={(e) => setSelectedFeeType(e.target.value)}
                >
                  <option value="all">All Fee Types</option>
                  <option value="term1">Term 1 Fee</option>
                  <option value="term2">Term 2 Fee</option>
                  <option value="term3">Term 3 Fee</option>
                  <option value="transport">Transport Fee</option>
                  <option value="computer">Computer Fee</option>
                </select>
              </>
            )}
          </div>

          {/* Report Content */}
          {activeTab === 'collection' && (
            <CollectionReport
              type={selectedReport}
              dateRange={dateRange}
              selectedClass={selectedClass}
              selectedFeeType={selectedFeeType}
            />
          )}

          {activeTab === 'outstanding' && (
            <OutstandingReport
              type={selectedReport}
              dateRange={dateRange}
              selectedClass={selectedClass}
              selectedFeeType={selectedFeeType}
            />
          )}

          {activeTab === 'student' && (
            <StudentReport
              type={selectedReport}
              dateRange={dateRange}
              selectedClass={selectedClass}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;