export interface FeeType {
  id: string;
  name: string;
  description?: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  category: 'school' | 'bus';
  is_monthly: boolean;
  is_for_new_students_only: boolean;
  effective_from?: string;
  effective_to?: string;
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeStructure {
  id?: string;
  class_id: string;
  fee_type_id: string;
  amount: number;
  academic_year_id: string;
  due_date: string;
  applicable_to_new_students_only: boolean;
  is_recurring_monthly: boolean;
  notes?: string;
  last_updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeStructureWithDetails extends FeeStructure {
  class?: {
    id: string;
    name: string;
  };
  fee_type?: FeeType;
}

export interface BusFeeStructure {
  id: string;
  village_id: string;
  fee_amount: number;
  academic_year_id: string;
  effective_from_date: string;
  effective_to_date: string;
  is_active: boolean;
  notes?: string;
  last_updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  student_id: string;
  bus_fee_amount: number;
  school_fee_amount: number;
  allocation_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeePayment {
  id: string;
  student_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: 'cash' | 'online';
  transaction_id?: string;
  receipt_number: string;
  notes?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  allocation?: PaymentAllocation;
}

export interface FeeStructureHistory {
  id: string;
  fee_structure_id?: string;
  previous_amount?: number;
  new_amount: number;
  change_date: string;
  changed_by?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusFeeHistory {
  id: string;
  village_id: string;
  previous_amount?: number;
  new_amount: number;
  change_date: string;
  changed_by?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeCalculation {
  student_id: string;
  academic_year_id: string;
  total_school_fees: number;
  total_bus_fees: number;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  last_payment_date?: string;
  next_due_date?: string;
}

export interface FeeWaiver {
  id: string;
  student_id: string;
  fee_type_id: string;
  waiver_amount: number;
  waiver_percentage?: number;
  reason: string;
  approved_by: string;
  academic_year_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FeeStatus {
  student_id: string;
  total_fees: number;
  total_paid: number;
  outstanding: number;
  last_payment_date?: string;
  status: 'paid' | 'partial' | 'pending';
}