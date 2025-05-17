import { BarChart3, Users, CircleDollarSign, School } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import SearchInput from '../../components/shared/SearchInput';
import StatCard from '../../components/dashboard/StatCard';
import QuickAccess from '../../components/dashboard/QuickAccess';
import DefaultersTable from '../../components/dashboard/DefaultersTable';
import { useState } from 'react';

const AdminDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Statistics for the dashboard
  const statistics = [
    { 
      title: 'Academic Year Collection (2025-26)',
      value: '₹33,15,000',
      change: '+12%',
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-blue-100 text-blue-600',
    },
    { 
      title: 'Monthly Collection (Aug-2025)',
      value: '₹4,50,000',
      change: '+8%',
      isPositive: true,
      icon: CircleDollarSign,
      color: 'bg-green-100 text-green-600',
    },
    { 
      title: 'Daily Collection (02-Aug-2025)',
      value: '₹75,000',
      change: '+15%',
      isPositive: true, 
      icon: CircleDollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
    { 
      title: 'Total Active Students',
      value: '1,250',
      change: '+3%',
      isPositive: true,
      icon: Users,
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

  // Mock data for defaulters table
  const defaultersData = [
    { class: 'I-A', teacher: 'Priya Sharma', defaulterCount: 5, outstandingBalance: '25,000' },
    { class: 'II-B', teacher: 'Rajesh Kumar', defaulterCount: 3, outstandingBalance: '18,000' },
    { class: 'III-A', teacher: 'Sneha Gupta', defaulterCount: 4, outstandingBalance: '22,000' },
    { class: 'IV-C', teacher: 'Amit Singh', defaulterCount: 6, outstandingBalance: '30,000' },
    { class: 'V-B', teacher: 'Neha Verma', defaulterCount: 2, outstandingBalance: '12,000' },
    { class: 'VI-A', teacher: 'Rahul Sharma', defaulterCount: 5, outstandingBalance: '35,000' },
    { class: 'VII-B', teacher: 'Pooja Patel', defaulterCount: 4, outstandingBalance: '28,000' },
    { class: 'VIII-A', teacher: 'Sanjay Mehta', defaulterCount: 3, outstandingBalance: '24,000' },
    { class: 'IX-C', teacher: 'Anita Rao', defaulterCount: 7, outstandingBalance: '49,000' },
    { class: 'X-B', teacher: 'Deepak Kumar', defaulterCount: 5, outstandingBalance: '40,000' },
    { class: 'XI-A', teacher: 'Meera Singh', defaulterCount: 6, outstandingBalance: '54,000' },
    { class: 'XII-C', teacher: 'Vikram Reddy', defaulterCount: 4, outstandingBalance: '48,000' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader title="Admin Dashboard">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current Term:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            2025-2026
          </span>
        </div>
      </PageHeader>

      <div className="w-full max-w-xl">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search student name..."
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {statistics.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Access */}
      <QuickAccess items={quickAccess} />

      {/* Defaulters Table */}
      <DefaultersTable data={defaultersData} />
    </div>
  );
};

export default AdminDashboard;