/*
  # Miscellaneous Charges Data Population

  This migration populates the miscellaneous charges system with initial data:
  
  1. Fee Type Creation
    - Insert the Miscellaneous Charges fee type with ad_hoc frequency
  
  2. Charge Categories
    - Insert common charge categories like Books, Uniforms, etc.
    - Set appropriate default amounts for each category
*/

-- Insert the Miscellaneous Charges fee type
-- This is done in a separate migration to ensure the enum value is committed
INSERT INTO fee_types (
  name,
  description,
  frequency,
  category,
  is_monthly,
  is_for_new_students_only,
  effective_from,
  created_at,
  updated_at
) VALUES (
  'Miscellaneous Charges',
  'Variable expenses including books, uniforms, additional educational materials, and other incidental expenses',
  'ad_hoc',
  'school',
  false,
  false,
  CURRENT_DATE,
  now(),
  now()
) ON CONFLICT (name) DO NOTHING;

-- Insert common charge categories
INSERT INTO charge_categories (name, description, default_amount, is_active) VALUES
  ('Books', 'Textbooks and educational materials', 500.00, true),
  ('Uniforms', 'School uniforms and accessories', 800.00, true),
  ('Stationery', 'Notebooks, pens, and other stationery items', 200.00, true),
  ('Sports Equipment', 'Sports gear and equipment', 300.00, true),
  ('Laboratory Materials', 'Science lab materials and equipment', 400.00, true),
  ('Art Supplies', 'Art and craft materials', 250.00, true),
  ('Field Trip', 'Educational excursions and field trips', 1000.00, true),
  ('Extra Classes', 'Additional coaching or tutorial classes', 600.00, true),
  ('Examination Fees', 'External examination and certification fees', 350.00, true),
  ('Other', 'Other miscellaneous expenses', 0.00, true)
ON CONFLICT (name) DO NOTHING;