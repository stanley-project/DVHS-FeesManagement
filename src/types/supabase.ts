export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          phone_number: string
          email: string | null
          is_active: boolean | null
          role: 'administrator' | 'accountant' | 'teacher'
          tc_available: boolean | null
          created_at: string | null
          updated_at: string | null
          login_code: string | null
          code_expires_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone_number: string
          email?: string | null
          is_active?: boolean | null
          role: 'administrator' | 'accountant' | 'teacher'
          created_at?: string | null
          updated_at?: string | null
          login_code?: string | null
          code_expires_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone_number?: string
          email?: string | null
          is_active?: boolean | null
          role?: 'administrator' | 'accountant' | 'teacher'
          created_at?: string | null
          updated_at?: string | null
          login_code?: string | null
          tc_available?: boolean | null
          code_expires_at?: string | null
        }
          tc_available?: boolean | null
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'administrator' | 'accountant' | 'teacher'
      [key: string]: any
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}