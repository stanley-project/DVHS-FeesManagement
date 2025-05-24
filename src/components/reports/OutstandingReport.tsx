import React, { useState } from 'react';

const OutstandingReport: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  return (
    <div className="p-4">
      <div className="mb-4">
        <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Class
        </label>
        <select
          id="classFilter"
          className="input text-sm"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          <option value="nursery">Nursery</option>
          <option value="lkg">LKG</option>
          <option value="ukg">UKG</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>Class {i + 1}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default OutstandingReport;