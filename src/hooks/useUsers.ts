import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/user';

interface FetchUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refreshUsers: () => Promise<void>;
  fetchUserById: (id: string) => Promise<User | null>;
}

export function useUsers(options: FetchUsersOptions = {}): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start building the query
      let query = supabase
        .from('users')
        .select('*, auth.users!inner(*)', { count: 'exact' });

      // Apply filters
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,phone_number.ilike.%${options.search}%`);
      }
      if (options.role) {
        query = query.eq('role', options.role);
      }
      if (options.status) {
        query = query.eq('is_active', options.status === 'active');
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, {
          ascending: options.sortOrder === 'asc'
        });
      }

      // Apply pagination
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserById = async (id: string): Promise<User | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*, auth.users!inner(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      console.error('Error fetching user by ID:', err);
      setError(err.message);
      return null;
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('users_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [options.page, options.limit, options.search, options.role, options.status, options.sortBy, options.sortOrder]);

  return {
    users,
    loading,
    error,
    totalCount,
    refreshUsers: fetchUsers,
    fetchUserById
  };
}