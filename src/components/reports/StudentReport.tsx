import React, { useState } from 'react';

const StudentReport: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  return (
    <div>
      <select
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
  );
};

export default StudentReport;