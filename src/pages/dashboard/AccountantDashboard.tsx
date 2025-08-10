import { BarChart3, Users, CircleDollarSign, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccountantDashboardStats } from '../../hooks/useAccountantDashboardStats';

const AccountantDashboard = () => {
  const { stats, loading, error } = useAccountantDashboardStats();

  // Statistics for the dashboard
  const statistics = [
    { 
      title: 'Collections Today',
      value: `₹${stats.todayCollection.toLocaleString('en-IN')}`,
      change: '+15%',
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: 'Pending Payments',
      value: stats.pendingPayments.toString(),
      change: '-5%',
      isPositive: true,
      icon: Users,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Total Collected (Month)',
      value: `₹${stats.monthlyCollection.toLocaleString('en-IN')}`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        Error loading dashboard data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Accountant Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {stats.currentAcademicYear}
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
              {stats.todayCollections.length > 0 ? (
                stats.todayCollections.map((payment, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">{payment.receiptId}</td>
                    <td className="px-3 py-2">{payment.studentName}</td>
                    <td className="px-3 py-2">{payment.class}</td>
                    <td className="px-3 py-2">₹{payment.amount.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-muted-foreground">{payment.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No collections recorded today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Collections */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Pending Payments (Due This Week)</h2>
        <div className="space-y-3">
          {stats.pendingStudents.length > 0 ? (
            stats.pendingStudents.map((student, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.admissionNumber} | {student.class} | Due: {student.dueIn} day(s)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{student.outstandingAmount.toLocaleString('en-IN')}</p>
                  <Link to="/fee-collection" className="text-xs text-primary hover:underline">Collect</Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No pending payments due this week
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;