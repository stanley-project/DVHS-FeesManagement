import { BarChart3, Download, FileText, Filter } from 'lucide-react';
import React, { useState } from 'react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('collection');
  
  // Mock data for the charts
  const collectionData = [
    { month: 'Jan', amount: 325000 },
    { month: 'Feb', amount: 280000 },
    { month: 'Mar', amount: 420000 },
    { month: 'Apr', amount: 350000 },
    { month: 'May', amount: 290000 },
    { month: 'Jun', amount: 580000 },
    { month: 'Jul', amount: 620000 },
    { month: 'Aug', amount: 450000 },
  ];
  
  const pendingData = [
    { class: 'I', amount: 45000 },
    { class: 'II', amount: 35000 },
    { class: 'III', amount: 52000 },
    { class: 'IV', amount: 38000 },
    { class: 'V', amount: 42000 },
    { class: 'VI', amount: 65000 },
    { class: 'VII', amount: 58000 },
    { class: 'VIII', amount: 70000 },
    { class: 'IX', amount: 85000 },
    { class: 'X', amount: 75000 },
    { class: 'XI', amount: 95000 },
    { class: 'XII', amount: 88000 },
  ];
  
  const recentTransactions = [
    { id: 'RC-2025', student: 'Amit Kumar', class: 'IX-A', amount: '₹15,000', date: '12 Aug 2025', type: 'Term 1 Fee' },
    { id: 'RC-2024', student: 'Priya Sharma', class: 'X-B', amount: '₹12,000', date: '12 Aug 2025', type: 'Term 1 Fee' },
    { id: 'RC-2023', student: 'Rahul Singh', class: 'VII-C', amount: '₹9,500', date: '11 Aug 2025', type: 'Term 1 Fee' },
    { id: 'RC-2022', student: 'Sneha Gupta', class: 'V-A', amount: '₹7,500', date: '11 Aug 2025', type: 'Term 1 Fee' },
    { id: 'RC-2021', student: 'Rajesh Verma', class: 'XII-B', amount: '₹19,000', date: '10 Aug 2025', type: 'Term 1 Fee' },
  ];
  
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Reports</h1>
        
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm inline-flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </button>
          <button className="btn btn-primary btn-sm inline-flex items-center">
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
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${activeTab === 'collection' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('collection')}
            >
              Collection Summary
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Fees
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('transactions')}
            >
              Recent Transactions
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 ${activeTab === 'classwise' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('classwise')}
            >
              Class-wise Report
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-6">
          {/* Collection Summary */}
          {activeTab === 'collection' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Fee Collection Summary</h2>
                <div className="flex gap-2">
                  <select className="input input-sm text-xs">
                    <option value="2025">2025-26</option>
                    <option value="2024">2024-25</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Total Collection (YTD)</p>
                  <h3 className="text-2xl font-bold mt-1">₹33,15,000</h3>
                  <span className="text-xs font-medium text-success mt-1 inline-block">
                    +12% from last year
                  </span>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <h3 className="text-2xl font-bold mt-1">₹4,50,000</h3>
                  <span className="text-xs font-medium text-success mt-1 inline-block">
                    +8% from last month
                  </span>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                  <h3 className="text-2xl font-bold mt-1">85%</h3>
                  <span className="text-xs font-medium text-success mt-1 inline-block">
                    +3% from last term
                  </span>
                </div>
              </div>
              
              <div className="h-64 bg-muted rounded-md p-4">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>Monthly Collection Chart</p>
                  <p className="text-xs">(Chart visualization would be here)</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By Fee Type */}
                <div>
                  <h3 className="text-md font-medium mb-3">Collection by Fee Type</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (₹)</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2">Term 1 Fee</td>
                        <td className="px-3 py-2 text-right">18,75,000</td>
                        <td className="px-3 py-2 text-right">56.6%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Term 2 Fee</td>
                        <td className="px-3 py-2 text-right">8,20,000</td>
                        <td className="px-3 py-2 text-right">24.7%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Admission Fee</td>
                        <td className="px-3 py-2 text-right">4,50,000</td>
                        <td className="px-3 py-2 text-right">13.6%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Transport Fee</td>
                        <td className="px-3 py-2 text-right">1,20,000</td>
                        <td className="px-3 py-2 text-right">3.6%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Others</td>
                        <td className="px-3 py-2 text-right">50,000</td>
                        <td className="px-3 py-2 text-right">1.5%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* By Payment Mode */}
                <div>
                  <h3 className="text-md font-medium mb-3">Collection by Payment Mode</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Payment Mode</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (₹)</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-2">Online Transfer</td>
                        <td className="px-3 py-2 text-right">15,20,000</td>
                        <td className="px-3 py-2 text-right">45.9%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">UPI</td>
                        <td className="px-3 py-2 text-right">10,65,000</td>
                        <td className="px-3 py-2 text-right">32.1%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Cash</td>
                        <td className="px-3 py-2 text-right">4,80,000</td>
                        <td className="px-3 py-2 text-right">14.5%</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-2">Cheque/DD</td>
                        <td className="px-3 py-2 text-right">2,50,000</td>
                        <td className="px-3 py-2 text-right">7.5%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Pending Fees */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Pending Fee Summary</h2>
                <div className="flex gap-2">
                  <select className="input input-sm text-xs">
                    <option value="all">All Classes</option>
                    <option value="primary">Primary (I-V)</option>
                    <option value="middle">Middle (VI-VIII)</option>
                    <option value="secondary">Secondary (IX-X)</option>
                    <option value="seniorSecondary">Sr. Secondary (XI-XII)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Total Pending Amount</p>
                  <h3 className="text-2xl font-bold mt-1">₹7,48,000</h3>
                  <span className="text-xs font-medium text-error mt-1 inline-block">
                    15% of total expected
                  </span>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Students with Pending Fees</p>
                  <h3 className="text-2xl font-bold mt-1">124</h3>
                  <span className="text-xs font-medium text-error mt-1 inline-block">
                    9.9% of total students
                  </span>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">Overdue (&gt;30 days)</p>
                  <h3 className="text-2xl font-bold mt-1">₹2,15,000</h3>
                  <span className="text-xs font-medium text-error mt-1 inline-block">
                    28.7% of pending amount
                  </span>
                </div>
              </div>
              
              <div className="h-64 bg-muted rounded-md p-4">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>Class-wise Pending Amount Chart</p>
                  <p className="text-xs">(Chart visualization would be here)</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium mb-3">Students with Highest Pending Amount</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Student ID</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Class</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pending Fee</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Due Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((_, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="px-3 py-2">ST-10{index + 25}</td>
                          <td className="px-3 py-2">Student Name {index + 1}</td>
                          <td className="px-3 py-2">{['IX-A', 'X-B', 'VII-C', 'XII-A', 'XI-B'][index]}</td>
                          <td className="px-3 py-2">₹{(18000 - index * 1000).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2">{['15 Aug', '20 Sep', '10 Oct', '05 Nov', '30 Aug'][index]} 2025</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${index < 2 ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                              {index < 2 ? 'Overdue' : 'Upcoming'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Recent Transactions */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Transactions</h2>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="input input-sm text-xs"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt ID</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Student Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Class</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fee Type</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((transaction, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="px-3 py-2 font-medium">{transaction.id}</td>
                        <td className="px-3 py-2">{transaction.student}</td>
                        <td className="px-3 py-2">{transaction.class}</td>
                        <td className="px-3 py-2">{transaction.type}</td>
                        <td className="px-3 py-2">{transaction.amount}</td>
                        <td className="px-3 py-2">{transaction.date}</td>
                        <td className="px-3 py-2">
                          <button className="btn btn-ghost btn-sm p-0 text-primary hover:text-primary/80">
                            <FileText className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-center">
                <nav className="flex items-center gap-1">
                  <button className="btn btn-ghost btn-sm">Previous</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted">2</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted">3</button>
                  <span className="px-2">...</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted">10</button>
                  <button className="btn btn-ghost btn-sm">Next</button>
                </nav>
              </div>
            </div>
          )}
          
          {/* Class-wise Report */}
          {activeTab === 'classwise' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Class-wise Fee Report</h2>
                <div className="flex gap-2">
                  <select className="input input-sm text-xs">
                    <option value="all">All Classes</option>
                    <option value="I">Class I</option>
                    <option value="II">Class II</option>
                    <option value="III">Class III</option>
                    <option value="IV">Class IV</option>
                    <option value="V">Class V</option>
                    <option value="VI">Class VI</option>
                    <option value="VII">Class VII</option>
                    <option value="VIII">Class VIII</option>
                    <option value="IX">Class IX</option>
                    <option value="X">Class X</option>
                    <option value="XI">Class XI</option>
                    <option value="XII">Class XII</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Class</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Students</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Expected Amount</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Collected</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Pending</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Collection %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { class: 'I', students: 42, expected: '₹7,98,000', collected: '₹6,78,300', pending: '₹1,19,700', percent: '85%' },
                      { class: 'II', students: 45, expected: '₹8,55,000', collected: '₹7,69,500', pending: '₹85,500', percent: '90%' },
                      { class: 'III', students: 40, expected: '₹7,60,000', collected: '₹6,08,000', pending: '₹1,52,000', percent: '80%' },
                      { class: 'IV', students: 38, expected: '₹7,22,000', collected: '₹6,49,800', pending: '₹72,200', percent: '90%' },
                      { class: 'V', students: 36, expected: '₹6,84,000', collected: '₹5,81,400', pending: '₹1,02,600', percent: '85%' },
                      { class: 'VI', students: 35, expected: '₹8,22,500', collected: '₹7,40,250', pending: '₹82,250', percent: '90%' },
                      { class: 'VII', students: 32, expected: '₹7,52,000', collected: '₹6,39,200', pending: '₹1,12,800', percent: '85%' },
                      { class: 'VIII', students: 30, expected: '₹7,05,000', collected: '₹5,64,000', pending: '₹1,41,000', percent: '80%' },
                      { class: 'IX', students: 28, expected: '₹7,98,000', collected: '₹6,78,300', pending: '₹1,19,700', percent: '85%' },
                      { class: 'X', students: 26, expected: '₹7,41,000', collected: '₹6,66,900', pending: '₹74,100', percent: '90%' },
                      { class: 'XI', students: 24, expected: '₹9,12,000', collected: '₹7,29,600', pending: '₹1,82,400', percent: '80%' },
                      { class: 'XII', students: 22, expected: '₹8,36,000', collected: '₹7,10,600', pending: '₹1,25,400', percent: '85%' },
                    ].map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="px-3 py-2 font-medium">Class {row.class}</td>
                        <td className="px-3 py-2 text-right">{row.students}</td>
                        <td className="px-3 py-2 text-right">{row.expected}</td>
                        <td className="px-3 py-2 text-right">{row.collected}</td>
                        <td className="px-3 py-2 text-right">{row.pending}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.percent === '90%' ? 'bg-success/10 text-success' : 
                            row.percent === '85%' ? 'bg-success/10 text-success' : 
                            'bg-warning/10 text-warning'
                          }`}>
                            {row.percent}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td className="px-3 py-2 font-medium">Total</td>
                      <td className="px-3 py-2 text-right font-medium">398</td>
                      <td className="px-3 py-2 text-right font-medium">₹93,85,500</td>
                      <td className="px-3 py-2 text-right font-medium">₹80,15,850</td>
                      <td className="px-3 py-2 text-right font-medium">₹13,69,650</td>
                      <td className="px-3 py-2 text-right font-medium">85.4%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;