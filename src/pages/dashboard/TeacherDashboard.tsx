import { Users, CircleDollarSign, School, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacherDashboardStats } from '../../hooks/useTeacherDashboardStats';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { stats, loading, error } = useTeacherDashboardStats(user?.id || '');

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

  // Statistics for the dashboard
  const statistics = [
    { 
      title: 'Class Strength',
      value: stats.classStrength,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    { 
      title: 'Fully Paid Fees',
      value: stats.feeStatus.paid,
      percent: stats.classStrength > 0 
        ? Math.round((stats.feeStatus.paid / stats.classStrength) * 100) 
        : 0,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: 'Partial Payment',
      value: stats.feeStatus.partial,
      percent: stats.classStrength > 0 
        ? Math.round((stats.feeStatus.partial / stats.classStrength) * 100) 
        : 0,
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Fee Defaulters',
      value: stats.feeStatus.pending,
      percent: stats.classStrength > 0 
        ? Math.round((stats.feeStatus.pending / stats.classStrength) * 100) 
        : 0,
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Teacher Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Class:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {stats.className}
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
                {stat.percent !== undefined && (
                  <span className="text-xs font-medium mt-1 inline-block">
                    {stat.percent}% of class
                  </span>
                )}
              </div>
              <div className={`rounded-full p-3 ${stat.color} self-start`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fee Status */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Class Fee Status</h2>
          <Link 
            to="/student-fee-status"
            className="text-sm text-primary hover:underline"
          >
            View Details
          </Link>
        </div>
        
        <div className="w-full bg-muted rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full"
            style={{ 
              width: `${stats.classStrength > 0 
                ? Math.round((stats.feeStatus.paid / stats.classStrength) * 100) 
                : 0}%` 
            }}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Paid ({stats.feeStatus.paid})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Partial ({stats.feeStatus.partial})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Pending ({stats.feeStatus.pending})</span>
          </div>
        </div>
      </div>

      {/* Fee Defaulters */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Fee Defaulters</h2>
        {stats.pendingStudents.length > 0 ? (
          <div className="space-y-4">
            {stats.pendingStudents.map((student, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-error/5 border border-error/20 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-error/10 text-error rounded-full w-10 h-10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">Due: {student.dueIn} day(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{student.outstandingAmount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-error">Overdue</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-muted-foreground">No fee defaulters in your class!</p>
        )}
      </div>

      {/* Upcoming Fee Submissions */}
      <div className="bg-card rounded-lg shadow p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Term Fee Schedule</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Term</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Due Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.feeSchedule.map((term, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                <td className="px-3 py-2 font-medium">{term.term}</td>
                <td className="px-3 py-2">{term.dueDate}</td>
                <td className="px-3 py-2">{term.amount}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    term.status === 'Completed' ? 'bg-success/10 text-success' :
                    term.status === 'Upcoming' ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {term.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherDashboard;