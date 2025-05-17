import { BarChart3, Users, CircleDollarSign, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  // Statistics for the dashboard
  const statistics = [
    { 
      title: 'Total Students',
      value: '1,250',
      change: '+12%',
      isPositive: true,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    { 
      title: 'Fee Collection (This Month)',
      value: '₹5,42,800',
      change: '+24%',
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: 'Pending Fees',
      value: '₹1,24,500',
      change: '-3%',
      isPositive: true, 
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'New Admissions',
      value: '48',
      change: '+8%',
      isPositive: true,
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  // Quick access buttons
  const quickAccess = [
    { title: 'Student Registration', path: '/student-registration' },
    { title: 'Fee Collection', path: '/fee-collection' },
    { title: 'Fee Structure', path: '/fee-structure' },
    { title: 'Reports', path: '/reports' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            2025-2026
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
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
                  {stat.change} from last month
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Recent Activity */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((_, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-3 hover:bg-muted rounded-md"
            >
              <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center">
                {index % 2 === 0 ? (
                  <Users className="w-5 h-5" />
                ) : (
                  <CircleDollarSign className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {index % 2 === 0 
                    ? 'New student registered by Accountant (class IX-A)' 
                    : 'Fee collected for student ID: ST-1548 (₹12,500)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {index % 2 === 0 ? '2 hours ago' : '4 hours ago'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;