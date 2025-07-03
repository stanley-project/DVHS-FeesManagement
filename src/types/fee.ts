export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  class_id: string;
  status: 'paid' | 'partial' | 'pending' | 'error';
  pending: string;
  pendingAmount: number;
  totalFees: number;
  totalPaid: number;
  registrationType: 'new' | 'continuing';
  has_school_bus: boolean;
  village_id?: string;
  bus_start_date?: string;
}

export interface FeeStatus {
  total_bus_fees: number;
  total_school_fees: number;
  total_fees: number;
  paid_bus_fees: number;
  paid_school_fees: number;
  total_paid: number;
  pending_bus_fees: number;
  pending_school_fees: number;
  total_pending: number;
  monthly_bus_fee: number;
  monthly_school_fee: number;
}

export interface PaymentData {
  student_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: 'cash' | 'online';
  receipt_number: string;
  notes?: string;
  created_by?: string;
  academic_year_id?: string;
  bus_fee_amount: number;
  school_fee_amount: number;
  transaction_id?: string;
}

export interface PaymentHistoryItem {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: 'cash' | 'online';
  manual_payment_allocation?: {
    bus_fee_amount: number;
    school_fee_amount: number;
  }[];
  payment_allocation?: {
    bus_fee_amount: number;
    school_fee_amount: number;
  }[];
  metadata?: {
    bus_fee_amount?: number;
    school_fee_amount?: number;
  };
  created_at: string;
  created_by_user?: {
    name: string;
  };
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  student: {
    name: string;
    admissionNumber: string;
    class: string;
    section: string;
  };
  busAmount?: number;
  schoolAmount?: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  collectedBy?: string;
}