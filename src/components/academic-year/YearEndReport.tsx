import { useState } from 'react';
import { Download, Printer, Mail, BarChart3, Users, CircleDollarSign } from 'lucide-react';

interface YearEndReportProps {
  academicYear: {
    id: string;
    yearName: string;
  };
  reports: {
    studentStats: {
      totalStudents: number;
      activeStudents: number;
      newAdmissions: number;
      withBusService: number;
    };
    feeCollection: {
      totalCollection: number;
      onlinePayments: number;
      cashPayments: number;
      pendingFees: number;
    };
    promotionSummary: {
      totalPromoted: number;
      totalRetained: number;
      totalTransferred: number;
      totalDropped: number;
    };
    classWiseReport: Array<{
      className: string;
      totalStudents: number;
      activeStudents: number;
    }>;
  };
}

const YearEndReport = ({ academicYear, reports }: YearEndReportProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Year End Report: {academicYear.yearName}</h2>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" title="Email Report">
            <Mail className="h-4 w-4" />
          </button>
          <button className="btn btn-outline btn-sm" title="Download PDF">
            <Download className="h-4 w-4" />
          </button>
          <button className="btn btn-outline btn-sm" title="Print Report">
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Student Statistics</h3>
          </div>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total Students</dt>
              <dd className="font-medium">{reports.studentStats.totalStudents}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active Students</dt>
              <dd className="font-medium">{reports.studentStats.activeStudents}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">New Admissions</dt>
              <dd className="font-medium">{reports.studentStats.newAdmissions}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Bus Service Users</dt>
              <dd className="font-medium">{reports.studentStats.withBusService}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Fee Collection</h3>
          </div>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total Collection</dt>
              <dd className="font-medium">₹{reports.feeCollection.totalCollection.toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Online Payments</dt>
              <dd className="font-medium">{reports.feeCollection.onlinePayments}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cash Payments</dt>
              <dd className="font-medium">{reports.feeCollection.cashPayments}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pending Fees</dt>
              <dd className="font-medium text-error">₹{reports.feeCollection.pendingFees.toLocaleString('en-IN')}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Promotion Summary</h3>
          </div>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Promoted</dt>
              <dd className="font-medium text-success">{reports.promotionSummary.totalPromoted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Retained</dt>
              <dd className="font-medium text-warning">{reports.promotionSummary.totalRetained}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Transferred Out</dt>
              <dd className="font-medium">{reports.promotionSummary.totalTransferred}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Dropped Out</dt>
              <dd className="font-medium text-error">{reports.promotionSummary.totalDropped}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Class-wise Report */}
      <div className="bg-card rounded-lg shadow p-4">
        <h3 className="text-lg font-medium mb-4">Class-wise Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Class</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total Students</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Active Students</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Active %</th>
              </tr>
            </thead>
            <tbody>
              {reports.classWiseReport.map((cls, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{cls.className}</td>
                  <td className="px-4 py-2 text-right">{cls.totalStudents}</td>
                  <td className="px-4 py-2 text-right">{cls.activeStudents}</td>
                  <td className="px-4 py-2 text-right">
                    {Math.round((cls.activeStudents / cls.totalStudents) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YearEndReport;