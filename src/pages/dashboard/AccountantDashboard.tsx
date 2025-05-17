import { BarChart3, Users, CircleDollarSign, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccountantDashboard = () => {
  // Statistics for the dashboard
  const statistics = [
    { 
      title: 'Collections Today',
      value: '₹54,800',
      change: '+15%',
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: 'Pending Payments',
      value: '32',
      change: '-5%',
      isPositive: true,
      icon: Users,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Total Collected (Month)',
      value: '₹5,24,500',
      change: '+18%',
      isPositive: true, 
      icon: CircleDollarSign,
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  // Quick access buttons
  const quickAccess = [
    { title: 'Fee Collection', path: '/fee-collection' },
    { title: 'Student Registration', path: '/student-registration' },
    { title: 'Reports', path: '/reports' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Accountant Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            2025-2026
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {statistics.map((stat, index) => (
          <div 
            key={index}
            className="bg-card rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                <span className={`text-xs font-medium ${stat.isPositive ? 'text-success' : 'text-error'} mt-1 inline-block`}>
                  {stat.change} from last week
                </span>
              </div>
              <div className={`rounded-full p-3 ${stat.color} self-start`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Buttons */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickAccess.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="inline-flex flex-col items-center justify-center p-4 bg-muted rounded-md hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Collections */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Collections</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt ID</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Student Name</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Class</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-2 font-medium">RC-{2025 + index}</td>
                  <td className="px-3 py-2">Student Name {index + 1}</td>
                  <td className="px-3 py-2">IX-{String.fromCharCode(65 + index)}</td>
                  <td className="px-3 py-2">₹{(12500 - index * 500).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-muted-foreground">{index + 8}:30 AM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Collections */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Pending Payments (Due This Week)</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((_, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Student Name {index + 6}</p>
                  <p className="text-xs text-muted-foreground">Class IX-{String.fromCharCode(70 + index)} | Due: {index + 1} day(s)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">₹{(15000 - index * 1000).toLocaleString('en-IN')}</p>
                <Link to="/fee-collection" className="text-xs text-primary hover:underline">Collect</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;