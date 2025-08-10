/*
  # Dashboard Performance Optimization Functions

  This migration adds database functions to optimize dashboard performance by:
  
  1. Creating stored procedures for aggregated dashboard statistics
  2. Implementing efficient class-wise defaulter calculations
  3. Adding teacher-specific class data retrieval
  4. Creating pending payments calculation function
  
  These functions move heavy calculations to the database layer,
  reducing the number of queries and improving dashboard rendering performance.
*/

-- Function to get class-wise defaulters
CREATE OR REPLACE FUNCTION get_class_defaulters(academic_year_id UUID)
RETURNS TABLE (
  class_name TEXT,
  teacher_name TEXT,
  defaulter_count INTEGER,
  outstanding_balance TEXT
) AS $$
DECLARE
  class_record RECORD;
  student_record RECORD;
  total_fees NUMERIC;
  paid_amount NUMERIC;
  class_defaulter_count INTEGER;
  class_outstanding_balance NUMERIC;
BEGIN
  -- For each class in the academic year
  FOR class_record IN 
    SELECT c.id, c.name, u.name AS teacher_name
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.academic_year_id = academic_year_id
  LOOP
    class_defaulter_count := 0;
    class_outstanding_balance := 0;
    
    -- For each student in the class
    FOR student_record IN 
      SELECT s.id
      FROM students s
      WHERE s.class_id = class_record.id AND s.status = 'active'
    LOOP
      -- Calculate total fees for this student
      SELECT COALESCE(SUM(amount::NUMERIC), 0) INTO total_fees
      FROM fee_structure
      WHERE class_id = class_record.id AND academic_year_id = academic_year_id;
      
      -- Calculate paid amount for this student
      SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO paid_amount
      FROM fee_payments
      WHERE student_id = student_record.id;
      
      -- If outstanding balance, count as defaulter
      IF total_fees > paid_amount THEN
        class_defaulter_count := class_defaulter_count + 1;
        class_outstanding_balance := class_outstanding_balance + (total_fees - paid_amount);
      END IF;
    END LOOP;
    
    -- Only return classes with defaulters
    IF class_defaulter_count > 0 THEN
      class_name := class_record.name;
      teacher_name := COALESCE(class_record.teacher_name, 'Unassigned');
      defaulter_count := class_defaulter_count;
      outstanding_balance := TO_CHAR(class_outstanding_balance, 'FM999,999,999,999');
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher's class data
CREATE OR REPLACE FUNCTION get_teacher_class_data(teacher_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  academic_year_id UUID,
  academic_year_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS class_id,
    c.name AS class_name,
    ay.id AS academic_year_id,
    ay.year_name AS academic_year_name
  FROM 
    classes c
    JOIN academic_years ay ON c.academic_year_id = ay.id
  WHERE 
    c.teacher_id = teacher_id
    AND ay.is_current = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get class fee status
CREATE OR REPLACE FUNCTION get_class_fee_status(class_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  academic_year_id UUID;
  student_record RECORD;
  total_students INTEGER := 0;
  paid_count INTEGER := 0;
  partial_count INTEGER := 0;
  pending_count INTEGER := 0;
  pending_students JSON := '[]';
  student_fees NUMERIC;
  student_paid NUMERIC;
  pending_array JSON[];
BEGIN
  -- Get academic year ID
  SELECT c.academic_year_id INTO academic_year_id
  FROM classes c
  WHERE c.id = class_id;
  
  -- Initialize pending array
  pending_array := ARRAY[]::JSON[];
  
  -- For each student in the class
  FOR student_record IN 
    SELECT s.id, s.student_name, s.admission_number
    FROM students s
    WHERE s.class_id = class_id AND s.status = 'active'
  LOOP
    total_students := total_students + 1;
    
    -- Calculate total fees for this student
    SELECT COALESCE(SUM(amount::NUMERIC), 0) INTO student_fees
    FROM fee_structure
    WHERE class_id = class_id AND academic_year_id = academic_year_id;
    
    -- Calculate paid amount for this student
    SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO student_paid
    FROM fee_payments
    WHERE student_id = student_record.id;
    
    -- Determine fee status
    IF student_paid >= student_fees THEN
      paid_count := paid_count + 1;
    ELSIF student_paid > 0 THEN
      partial_count := partial_count + 1;
      
      -- Add to pending students if significant amount pending
      IF (student_fees - student_paid) > 5000 THEN
        pending_array := array_append(
          pending_array, 
          json_build_object(
            'id', student_record.id,
            'name', student_record.student_name,
            'admissionNumber', student_record.admission_number,
            'outstandingAmount', student_fees - student_paid,
            'dueIn', floor(random() * 7) + 1
          )
        );
      END IF;
    ELSE
      pending_count := pending_count + 1;
      
      -- Add to pending students
      pending_array := array_append(
        pending_array, 
        json_build_object(
          'id', student_record.id,
          'name', student_record.student_name,
          'admissionNumber', student_record.admission_number,
          'outstandingAmount', student_fees,
          'dueIn', floor(random() * 7) + 1
        )
      );
    END IF;
  END LOOP;
  
  -- Convert pending array to JSON
  SELECT json_agg(p) INTO pending_students
  FROM (
    SELECT value
    FROM json_array_elements(to_json(pending_array))
    ORDER BY (value->>'dueIn')::INTEGER
    LIMIT 3
  ) p;
  
  -- Build result JSON
  SELECT json_build_object(
    'total_students', total_students,
    'paid_count', paid_count,
    'partial_count', partial_count,
    'pending_count', pending_count,
    'pending_students', COALESCE(pending_students, '[]'::JSON)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending payments
CREATE OR REPLACE FUNCTION get_pending_payments(academic_year_id UUID, limit_count INTEGER)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admissionNumber TEXT,
  class TEXT,
  outstandingAmount NUMERIC,
  dueIn INTEGER
) AS $$
DECLARE
  student_record RECORD;
  total_fees NUMERIC;
  paid_amount NUMERIC;
  outstanding NUMERIC;
BEGIN
  -- For each active student
  FOR student_record IN 
    SELECT 
      s.id, 
      s.student_name AS name, 
      s.admission_number AS admissionNumber,
      c.name AS class,
      s.class_id
    FROM 
      students s
      JOIN classes c ON s.class_id = c.id
    WHERE 
      s.status = 'active'
      AND c.academic_year_id = academic_year_id
  LOOP
    -- Calculate total fees for this student
    SELECT COALESCE(SUM(amount::NUMERIC), 0) INTO total_fees
    FROM fee_structure
    WHERE class_id = student_record.class_id AND academic_year_id = academic_year_id;
    
    -- Calculate paid amount for this student
    SELECT COALESCE(SUM(amount_paid::NUMERIC), 0) INTO paid_amount
    FROM fee_payments
    WHERE student_id = student_record.id;
    
    -- Calculate outstanding amount
    outstanding := total_fees - paid_amount;
    
    -- If outstanding amount, include in results
    IF outstanding > 0 THEN
      id := student_record.id;
      name := student_record.name;
      admissionNumber := student_record.admissionNumber;
      class := student_record.class;
      outstandingAmount := outstanding;
      dueIn := floor(random() * 7) + 1; -- Mock due days
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;