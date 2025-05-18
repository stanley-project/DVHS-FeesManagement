// Validation rules for forms
export const validationRules = {
  phoneNumber: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Please enter a valid 10-digit phone number',
  },
  amount: {
    min: 0,
    max: 1000000,
    message: 'Amount must be between 0 and 10,00,000',
  },
  date: {
    past: false,
    message: 'Date cannot be in the past',
  },
  required: {
    message: 'This field is required',
  },
};

// Form validation helper
export const validateForm = (data: any, rules: any) => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const rule = rules[field];

    if (rule.required && !value) {
      errors[field] = rule.message || validationRules.required.message;
    }

    if (value) {
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message;
      }

      if (rule.min !== undefined && value < rule.min) {
        errors[field] = rule.message;
      }

      if (rule.max !== undefined && value > rule.max) {
        errors[field] = rule.message;
      }

      if (field === 'date' && rule.past === false) {
        const date = new Date(value);
        if (date < new Date()) {
          errors[field] = rule.message;
        }
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};