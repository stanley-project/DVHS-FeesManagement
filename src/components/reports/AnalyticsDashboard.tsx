import { BarChart3, PieChart, LineChart, ArrowUpDown } from 'lucide-react';

const AnalyticsDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Collection Efficiency</p>
          <p className="text-2xl font-bold mt-1">85%</p>
          <p className="text-xs text-success mt-1">+3% from last month</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Avg. Collection/Student</p>
          <p className="text-2xl font-bold mt-1">₹35,000</p>
          <p className="text-xs text-success mt-1">+5% from last year</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Default Rate</p>
          <p className="text-2xl font-bold mt-1">12%</p>
          <p className="text-xs text-error mt-1">+2% from last month</p>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">Online Payment Rate</p>
          <p className="text-2xl font-bold mt-1">65%</p>
          <p className="text-xs text-success mt-1">+8% from last month</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Trends */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Collection Trends</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Collection Trend Chart</span>
          </div>
        </div>

        {/* Fee Type Distribution */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Fee Type Distribution</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <PieChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Fee Distribution Chart</span>
          </div>
        </div>

        {/* Class-wise Comparison */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Class-wise Collection vs Outstanding</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Class-wise Comparison Chart</span>
          </div>
        </div>

        {/* Payment Method Trends */}
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-4">Payment Method Trends</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <LineChart className="h-8 w-8 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Payment Method Trend Chart</span>
          </div>
        </div>
      </div>

      {/* Top Defaulters */}
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Top Defaulters</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left">
                  <button className="flex items-center gap-1">
                    Student Name
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Outstanding Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button className="flex items-center gap-1 ml-auto">
                    Days Overdue
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">Student Name {index + 1}</td>
                  <td className="px-4 py-3">Class {['IX-A', 'X-B', 'XI-A', 'XII-B', 'VIII-C'][index]}</td>
                  <td className="px-4 py-3 text-right">₹{(25000 - index * 1000).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">{90 - index * 10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;