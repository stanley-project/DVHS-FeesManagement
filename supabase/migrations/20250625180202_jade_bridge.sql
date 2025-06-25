-- This migration fixes the fee structure system to focus on monthly recurring fees
-- and removes the admission fee category

-- First, ensure we don't have any fee_structure records that reference admission fee types
DELETE FROM fee_structure 
WHERE fee_type_id IN (
  SELECT id FROM fee_types WHERE category = 'admission'
);

-- Update fee_types table to remove admission category
UPDATE fee_types 
SET category = 'school' 
WHERE category = 'admission';

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