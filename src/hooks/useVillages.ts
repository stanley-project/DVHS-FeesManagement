import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Village } from '../types/village';

interface SortConfig {
  column: keyof Village;
  direction: 'asc' | 'desc';
}

export function useVillages() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'name',
    direction: 'asc'
  });
  const [villageStats, setVillageStats] = useState<Record<string, { totalStudents: number, busStudents: number }>>({});
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchVillages = async (sort?: SortConfig) => {
    try {
      setLoading(true);
      setError(null); // Reset error state before fetching

      console.log('Fetching villages with auth...');
      
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .select('*')
        .order(sort?.column || sortConfig.column, { 
          ascending: sort?.direction === 'asc' || sortConfig.direction === 'asc'
        });

      console.log('Villages response:', { data, error: supabaseError });
      
      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(supabaseError.message);
      }

      // Add null check for data
      if (!data) {
        throw new Error('No data received from database');
      }

      console.log('Fetched villages:', data); // Debug log
      
      setVillages(data);
      setError(null);
      
      // Fetch student statistics for all villages
      fetchVillageStats(data);
    } catch (err) {
      console.error('Error in fetchVillages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch villages'));
      setVillages([]); // Reset villages on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch student statistics for all villages
  const fetchVillageStats = async (villageData: Village[] = villages) => {
    if (villageData.length === 0) {
        setLoadingStats(false);
        return;
    };
    
    try {
      setLoadingStats(true);
      
      // Initialize stats for all villages with zeros
      const initialStats: Record<string, { totalStudents: number, busStudents: number }> = {};
      villageData.forEach(village => {
        initialStats[village.id] = { totalStudents: 0, busStudents: 0 };
      });
      
      // Set initial zeros immediately to prevent prolonged loading state
      setVillageStats(initialStats);
      
      // Get current academic year with proper error handling
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (yearError) {
        console.error('Error fetching current academic year:', yearError);
        setLoadingStats(false);
        return;
      }
      
      if (!currentYear) {
        console.log('No current academic year found');
        setLoadingStats(false);
        return;
      }
      
      // Get all students with their village_id and has_school_bus status
      const { data: studentData, error: studentsError } = await supabase
        .from('students')
        .select('village_id, has_school_bus')
        .eq('status', 'active');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        setLoadingStats(false);
        return;
      }
      
      // Process student statistics by village
      const stats = { ...initialStats };
      
      // Count students for each village
      studentData?.forEach(student => {
        if (!student.village_id) return;
        
        if (!stats[student.village_id]) {
          stats[student.village_id] = { totalStudents: 0, busStudents: 0 };
        }
        
        stats[student.village_id].totalStudents++;
        
        if (student.has_school_bus) {
          stats[student.village_id].busStudents++;
        }
      });
      
      console.log('Village stats calculated:', stats);
      setVillageStats(stats);
      
    } catch (error) {
      console.error('Error fetching village stats:', error);
      // Don't reset stats on error, keep the initial zeros
    } finally {
      setLoadingStats(false); // Ensure loading state is reset even on error
    }
  };

  const addVillage = async (village: Omit<Village, 'id' | 'created_at' | 'updated_at'>): Promise<Village> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .insert([{
          name: village.name,
          distance_from_school: village.distance_from_school,
          is_active: village.is_active,
          bus_number: village.bus_number
        }])
        .select()
        .single();

      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        if (supabaseError.code === '23505') {
          throw new Error('A village with this name already exists');
        } else {
          throw new Error(supabaseError.message);
        }
      }

      if (!data) {
        throw new Error('No data returned from insert operation');
      }

      setVillages(prev => [...prev, data]);
      
      // Initialize stats for new village
      setVillageStats(prev => ({
        ...prev,
        [data.id]: { totalStudents: 0, busStudents: 0 }
      }));
      
      return data;
    } catch (err) {
      console.error('Error in addVillage:', err);
      throw err instanceof Error ? err : new Error('Failed to add village');
    }
  };

  const updateVillage = async (id: string, villageUpdate: Partial<Village>): Promise<Village> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('villages')
        .update(villageUpdate)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data) {
        throw new Error('No data returned from update operation');
      }

      setVillages(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch (err) {
      console.error('Error in updateVillage:', err);
      throw err instanceof Error ? err : new Error('Failed to update village');
    }
  };

  const deleteVillage = async (id: string): Promise<void> => {
    try {
      const { error: supabaseError } = await supabase
        .from('villages')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setVillages(prev => prev.filter(v => v.id !== id));
      
      // Remove stats for deleted village
      setVillageStats(prev => {
        const newStats = { ...prev };
        delete newStats[id];
        return newStats;
      });
    } catch (err) {
      console.error('Error in deleteVillage:', err);
      throw err instanceof Error ? err : new Error('Failed to delete village');
    }
  };

  const handleSort = async (column: keyof Village) => {
    const direction = sortConfig.column === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const newConfig = { column, direction };
    setSortConfig(newConfig);
    await fetchVillages(newConfig);
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  return {
    villages,
    loading,
    error,
    sortConfig,
    villageStats,
    loadingStats,
    handleSort,
    addVillage,
    updateVillage,
    deleteVillage,
    refreshVillages: fetchVillages,
    refreshVillageStats: fetchVillageStats
  };
}