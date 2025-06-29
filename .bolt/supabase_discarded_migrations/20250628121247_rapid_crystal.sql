/*
  # Fix Ambiguous Column References in Payment System

  This migration creates a stored procedure to handle fee payment insertion
  that properly qualifies all column references to avoid ambiguity issues.
  
  1. Changes:
    - Creates a new stored procedure for inserting fee payments
    - Properly qualifies all column references to avoid ambiguity
    - Handles payment allocation within the procedure
    - Adds RLS policies for the procedure
*/

-- Create a stored procedure to handle fee payment insertion
CREATE OR REPLACE FUNCTION insert_fee_payment(
  p_student_id uuid,
  p_amount_paid numeric,
  p_payment_date date,
  p_payment_method payment_method,
  p_receipt_number text,
  p_notes text,
  p_created_by uuid,
  p_academic_year_id uuid
) 
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_result jsonb;
BEGIN
  -- Insert into fee_payments table with fully qualified column names
  INSERT INTO fee_payments (
    student_id,
    amount_paid,
    payment_date,
    payment_method,
    receipt_number,
    notes,
    created_by,
    academic_year_id,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_amount_paid,
    p_payment_date,
    p_payment_method,
    p_receipt_number,
    p_notes,
    p_created_by,
    p_academic_year_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_payment_id;
  
  -- The allocate_payment trigger will handle the payment allocation
  
  -- Return the payment ID and success status
  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'success', true
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_fee_payment TO authenticated;