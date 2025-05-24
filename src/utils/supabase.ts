import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const validateConfig = () => {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not configured');
  }
  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not configured');
  }
  
  try {
    new URL(supabaseUrl);
  } catch (e) {
    throw new Error('VITE_SUPABASE_URL is not a valid URL');
  }
};

validateConfig();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'dvhs-fees-management'
    }
  }
});