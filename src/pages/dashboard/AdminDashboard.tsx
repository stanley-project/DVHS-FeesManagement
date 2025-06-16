import { useState, useEffect } from 'react';
import { BarChart3, Users, CircleDollarSign, School } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import QuickAccess from '../../components/dashboard/QuickAccess';
import DefaultersTable from '../../components/dashboard/DefaultersTable';
import { useDashboardStats } from '../../hooks/useDashboardStats';

const AdminDashboard = () => {
  const { stats, loading, error } = useDashboardStats();

  // Quick access buttons
  const quickAccess = [
    { title: 'Student Registration', path: '/student-registration' },
    { title: 'Fee Collection', path: '/fee-collection' },
    { title: 'Fee Structure', path: '/fee-structure' },
    { title: 'Reports', path: '/reports' },
  ];

  // Statistics for the dashboard
  const statistics = [
    { 
      title: `Academic Year Collection (${stats.currentAcademicYear})`,
      value: `₹${stats.yearCollection.toLocaleString('en-IN')}`,
      change: `+${stats.yearGrowth}%`,
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-blue-100 text-blue-600',
    },
    { 
      title: `Monthly Collection (${new Date().toLocaleString('default', { month: 'short' })}-${new Date().getFullYear()})`,
      value: `₹${stats.monthCollection.toLocaleString('en-IN')}`,
      change: `+${stats.monthGrowth}%`,
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: `Daily Collection (${new Date().toLocaleDateString()})`,
      value: `₹${stats.dailyCollection.toLocaleString('en-IN')}`,
      change: `+${stats.dailyGrowth}%`,
      isPositive: true, 
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Total Active Students',
      value: stats.activeStudents.toLocaleString(),
      change: `+${stats.studentGrowth}%`,
      isPositive: true,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Admin Dashboard">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {stats.currentAcademicYear || 'Loading...'}
          </span>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
        </div>
      ) : error ? (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          Error loading dashboard data: {error}
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {statistics.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Quick Access */}
          <QuickAccess items={quickAccess} />

          {/* Defaulters Table */}
          <DefaultersTable data={stats.defaultersData} />
        </>
      )}
    </div>
  );
};

export default AdminDashboard;