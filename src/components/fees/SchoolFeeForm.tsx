import { useState } from 'react';

// Update formData initialization
const [formData, setFormData] = useState(initialData || {
  academicYear,
  fees: [
    { class: 'nursery', monthlyFee: '', termFee: '' },
    { class: 'lkg', monthlyFee: '', termFee: '' }, 
    { class: 'ukg', monthlyFee: '', termFee: '' },
    { class: '1', monthlyFee: '', termFee: '' },
    { class: '2', monthlyFee: '', termFee: '' },
    { class: '3', monthlyFee: '', termFee: '' },
    { class: '4', monthlyFee: '', termFee: '' },
    { class: '5', monthlyFee: '', termFee: '' },
    { class: '6', monthlyFee: '', termFee: '' },
    { class: '7', monthlyFee: '', termFee: '' },
    { class: '8', monthlyFee: '', termFee: '' },
    { class: '9', monthlyFee: '', termFee: '' },
    { class: '10', monthlyFee: '', termFee: '' }
  ],
  effectiveDate: new Date().toISOString().split('T')[0],
});

export default formData