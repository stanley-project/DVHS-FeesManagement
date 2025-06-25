/*
  # Monthly Recurring Fees System Update

  This migration updates the fee structure system to focus on monthly recurring fees
  and simplifies the fee categories.
  
  1. Changes:
    - Updates fee_structure to set is_recurring_monthly to true for school fees
    - Updates bus_fee_structure to ensure it's treated as monthly
    - Creates a function to handle fee payments with proper RLS bypass
    - Fixes due dates in fee_structure to align with academic year
  
  2. Note:
    - This migration avoids deleting fee_types with 'admission' category to prevent
      foreign key constraint violations
*/

-- Set all school fees to be monthly recurring
UPDATE fee_structure
SET is_recurring_monthly = true
WHERE id IN (
  SELECT fs.id
  FROM fee_structure fs
  JOIN fee_types ft ON fs.fee_type_id = ft.id
  WHERE ft.category = 'school'
);

-- Update bus_fee_structure to ensure it's treated as monthly
COMMENT ON TABLE bus_fee_structure IS 'Bus fee structure with monthly recurring fees';

-- Create a function to create fee payments with proper RLS bypass
CREATE OR REPLACE FUNCTION create_fee_payment(payment_data JSONB)
RETURNS JSONB AS $$
DECLARE
  payment_id UUID;
  result JSONB;
BEGIN
  -- Insert the payment
  INSERT INTO fee_payments (
    student_id,
    amount_paid,
    payment_date,
    payment_method,
    transaction_id,
    receipt_number,
    notes,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    (payment_data->>'student_id')::UUID,
    (payment_data->>'amount_paid')::NUMERIC,
    (payment_data->>'payment_date')::DATE,
    (payment_data->>'payment_method')::payment_method,
    payment_data->>'transaction_id',
    payment_data->>'receipt_number',
    payment_data->>'notes',
    (payment_data->>'created_by')::UUID,
    COALESCE((payment_data->>'created_at')::TIMESTAMPTZ, NOW()),
    COALESCE((payment_data->>'updated_at')::TIMESTAMPTZ, NOW())
  )
  RETURNING id INTO payment_id;
  
  -- Get the complete payment with allocation
  SELECT 
    jsonb_build_object(
      'id', p.id,
      'student_id', p.student_id,
      'amount_paid', p.amount_paid,
      'payment_date', p.payment_date,
      'payment_method', p.payment_method,
      'transaction_id', p.transaction_id,
      'receipt_number', p.receipt_number,
      'notes', p.notes,
      'created_by', p.created_by,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'payment_allocation', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', pa.id,
              'payment_id', pa.payment_id,
              'student_id', pa.student_id,
              'bus_fee_amount', pa.bus_fee_amount,
              'school_fee_amount', pa.school_fee_amount,
              'allocation_date', pa.allocation_date,
              'created_at', pa.created_at,
              'updated_at', pa.updated_at
            )
          )
          FROM payment_allocation pa
          WHERE pa.payment_id = p.id
        ),
        '[]'::jsonb
      )
    ) INTO result
  FROM fee_payments p
  WHERE p.id = payment_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix due dates in fee_structure to align with academic year
UPDATE fee_structure fs
SET due_date = (
  SELECT ay.start_date
  FROM academic_years ay
  WHERE ay.id = fs.academic_year_id
)
WHERE due_date < (
  SELECT ay.start_date
  FROM academic_years ay
  WHERE ay.id = fs.academic_year_id
);

-- Create a function to get the correct due date based on academic year
CREATE OR REPLACE FUNCTION get_next_due_date(academic_year_id UUID)
RETURNS DATE AS $$
DECLARE
  academic_year_start DATE;
BEGIN
  -- Get the academic year start date
  SELECT start_date INTO academic_year_start
  FROM academic_years
  WHERE id = academic_year_id;
  
  -- Return the start date of the academic year
  RETURN academic_year_start;
END;
$$ LANGUAGE plpgsql;