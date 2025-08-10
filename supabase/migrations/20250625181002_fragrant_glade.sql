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