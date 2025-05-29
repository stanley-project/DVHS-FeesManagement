import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/user'; // Ensure this path is correct

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

      // --- STEP 1: Fetch data from public.users table ---
      let publicUsersQuery = supabase
        .from('users')
        .select('*', { count: 'exact' }); // Select all columns from public.users

      // Apply filters to public.users
      if (options.search) {
        publicUsersQuery = publicUsersQuery.or(`name.ilike.%${options.search}%,phone_number.ilike.%${options.search}%`);
      }
      if (options.role) {
        publicUsersQuery = publicUsersQuery.eq('role', options.role);
      }
      if (options.status) {
        publicUsersQuery = publicUsersQuery.eq('is_active', options.status === 'active');
      }

      // Apply sorting to public.users
      if (options.sortBy) {
        publicUsersQuery = publicUsersQuery.order(options.sortBy, {
          ascending: options.sortOrder === 'asc'
        });
      }

      // Apply pagination to public.users
      if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        publicUsersQuery = publicUsersQuery.range(from, to);
      }

      const { data: publicUsersData, error: publicUsersError, count } = await publicUsersQuery;

      if (publicUsersError) {
        throw new Error(`Failed to fetch public users: ${publicUsersError.message}`);
      }

      if (!publicUsersData || publicUsersData.length === 0) {
        setUsers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // --- STEP 2: Fetch corresponding data from auth.users for enrichment ---
      const userIds = publicUsersData.map(user => user.id);
      
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users') // Changed: Use public.users since we can't directly query auth.users
        .select('id, last_sign_in_at, created_at, email, phone') // Select only the fields you need
        .in('id', userIds); // Fetch auth data only for the users we got from public.users

      if (authUsersError) {
        console.warn('Warning: Could not fetch all auth user data:', authUsersError.message);
        // Do not throw error here, continue with partial data if auth data is not critical for display
        // Or handle this more strictly based on your application's requirements
      }

      // --- STEP 3: Merge the data ---
      const mergedUsers: User[] = publicUsersData.map(publicUser => {
        const authUser = authUsersData?.find(au => au.id === publicUser.id);
        
        return {
          id: publicUser.id,
          name: publicUser.name,
          email: publicUser.email,
          phone_number: publicUser.phone_number,
          is_active: publicUser.is_active,
          role: publicUser.role,
          created_at: publicUser.created_at,
          updated_at: publicUser.updated_at,
          lastLogin: authUser?.last_sign_in_at, // Map auth.users.last_sign_in_at to lastLogin
          status: publicUser.is_active ? 'active' : 'inactive', // Derived status
          assignedClasses: publicUser.assignedClasses || [], // Assuming it might exist or default to empty array
        };
      });

      setUsers(mergedUsers);
      setTotalCount(count || 0);

    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'An unexpected error occurred while fetching users.');
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserById = async (id: string): Promise<User | null> => {
    try {
      // Fetch from public.users first
      const { data: publicUserData, error: publicUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (publicUserError) {
        throw new Error(`Failed to fetch public user by ID: ${publicUserError.message}`);
      }
      if (!publicUserData) return null;

      // Fetch corresponding auth.users data
      const { data: authUserData, error: authUserError } = await supabase
        .from('auth.users')
        .select('id, last_sign_in_at, created_at, email, phone')
        .eq('id', id)
        .single();

      if (authUserError) {
        console.warn(`Warning: Could not fetch auth user data for ID ${id}:`, authUserError.message);
      }

      // Merge data
      const mergedUser: User = {
        id: publicUserData.id,
        name: publicUserData.name,
        email: publicUserData.email,
        phone_number: publicUserData.phone_number,
        is_active: publicUserData.is_active,
        role: publicUserData.role,
        created_at: publicUserData.created_at,
        updated_at: publicUserData.updated_at,
        lastLogin: authUserData?.last_sign_in_at,
        status: publicUserData.is_active ? 'active' : 'inactive',
        assignedClasses: publicUserData.assignedClasses || [],
      };

      return mergedUser;
    } catch (err: any) {
      console.error('Error fetching user by ID:', err);
      setError(err.message || 'An unexpected error occurred while fetching user by ID.');
      return null;
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Note: Real-time subscriptions only work on tables you have RLS SELECT permission on.
    // They also don't automatically trigger when auth.users changes (like last_sign_in_at).
    // If you need real-time updates for auth.users changes, you'd need a more complex setup
    // (e.g., database triggers on auth.users writing to a public table, or polling).
    const subscription = supabase
      .channel('users_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users' // Only listening to public.users changes
        },
        () => {
          console.log('Real-time change detected in public.users, refreshing...');
          fetchUsers(); // Refresh data when public.users changes
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from users_channel.');
      subscription.unsubscribe();
    };
  }, [options.page, options.limit, options.search, options.role, options.status, options.sortBy, options.sortOrder]); // Add options to dependency array for re-subscription if filter/sort changes

  // Initial fetch
  useEffect(() => {
    console.log('Initial fetch or options change detected for users.');
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