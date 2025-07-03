import React from 'react';

export const StudentListSkeleton = () => (
  <div className="space-y-3 p-4">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted/70 rounded w-24" />
          </div>
          <div className="h-5 bg-muted rounded w-16" />
        </div>
      </div>
    ))}
  </div>
);

export const FeePaymentFormSkeleton = () => (
  <div className="animate-pulse p-6 space-y-6">
    <div className="flex justify-between pb-4 border-b">
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded w-40" />
        <div className="h-4 bg-muted/70 rounded w-32" />
      </div>
      <div className="h-6 bg-muted rounded w-24" />
    </div>
    
    <div className="space-y-4">
      <div className="h-24 bg-muted rounded" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="h-24 bg-muted rounded" />
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <div className="h-10 bg-muted rounded w-24" />
        <div className="h-10 bg-muted rounded w-40" />
      </div>
    </div>
  </div>
);

export const PaymentHistorySkeleton = () => (
  <div className="animate-pulse mt-8 pt-6 border-t space-y-4">
    <div className="h-5 bg-muted rounded w-32" />
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {[...Array(5)].map((_, i) => (
              <th key={i} className="px-4 py-2">
                <div className="h-4 bg-muted rounded w-16 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, i) => (
            <tr key={i} className="border-b">
              {[...Array(5)].map((_, j) => (
                <td key={j} className="px-4 py-2">
                  <div className="h-4 bg-muted rounded w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);