import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const useBusFees = () => {
  const [busFees, setBusFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBusFees = async (academicYearId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching bus fees for academic year:', academicYearId);
      
      const { data, error: supabaseError } = await supabase
        .from('bus_fee_structure')
        .select(`
          *,
          village:village_id(
            id,
            name,
            distance_from_school,
            bus_number
          )
        `)
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true);

      if (supabaseError) {
        throw supabaseError;
      }

      console.log('useBusFees: Fetched bus fees:', data); 
      setBusFees(data || []);
      return data;
    } catch (err: any) {
      console.error('Error fetching bus fees:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveBusFees = async (fees: any[]) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Saving bus fees:', fees);
      
      // First, validate all fees
      for (const fee of fees) {
        if (!fee.village_id) {
          throw new Error('Village is required for all bus fees');
        }
        if (!fee.fee_amount || fee.fee_amount <= 0) {
          throw new Error('Valid fee amount is required for all bus fees');
        }
        if (!fee.effective_from_date) {
          throw new Error('Effective from date is required for all bus fees');
        }
        if (!fee.effective_to_date) {
          throw new Error('Effective to date is required for all bus fees');
        }
        
        // Check date order
        const fromDate = new Date(fee.effective_from_date);
        const toDate = new Date(fee.effective_to_date);
        if (fromDate >= toDate) {
          throw new Error('Effective to date must be after effective from date');
        }
      }

      // Process each fee
      const results = [];
      for (const fee of fees) {
        if (fee.id) {
          // Update existing fee
          console.log('Updating existing fee:', fee);
          const { data, error } = await supabase
            .from('bus_fee_structure')
            .update({
              fee_amount: fee.fee_amount,
              effective_from_date: fee.effective_from_date,
              effective_to_date: fee.effective_to_date,
              is_active: fee.is_active,
              academic_year_id: fee.academic_year_id
            })
            .eq('id', fee.id)
            .select();
            
          if (error) {
            console.error('Error updating bus fee:', error);
            throw error;
          }
          
          console.log('Update result:', data);
          results.push(data);
        } else {
          // Insert new fee
          console.log('Inserting new fee:', fee);
          const { data, error } = await supabase
            .from('bus_fee_structure')
            .insert([{
              village_id: fee.village_id,
              fee_amount: fee.fee_amount,
              effective_from_date: fee.effective_from_date,
              effective_to_date: fee.effective_to_date,
              is_active: fee.is_active,
              academic_year_id: fee.academic_year_id
            }])
            .select();
            
          if (error) {
            console.error('Error inserting bus fee:', error);
            throw error;
          }
          
          console.log('Insert result:', data);
          results.push(data);
        }
      }
      
      // Refresh the bus fees list
      if (fees.length > 0) {
        await fetchBusFees(fees[0].academic_year_id);
      }
      
      toast.success('Bus fees saved successfully');
      return results;
    } catch (err: any) {
      console.error('Error saving bus fees:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const copyFromPreviousYear = async (academicYearId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get the previous academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('previous_year_id, start_date, end_date')
        .eq('id', academicYearId)
        .single();

      if (yearError) throw yearError;
      if (!currentYear?.previous_year_id) {
        throw new Error('No previous academic year found');
      }

      // Get bus fees from previous year
      const { data: previousFees, error: feeError } = await supabase
        .from('bus_fee_structure')
        .select(`
          *,
          village:village_id(name)
        `)
        .eq('academic_year_id', currentYear.previous_year_id)
        .eq('is_active', true);

      if (feeError) throw feeError;
      if (!previousFees?.length) {
        throw new Error('No bus fee structure found for previous year');
      }

      // Adjust dates for the new academic year
      const newFees = previousFees.map(fee => ({
        ...fee,
        id: undefined, // Remove ID for new insertion
        academic_year_id: academicYearId,
        effective_from_date: currentYear.start_date,
        effective_to_date: currentYear.end_date
      }));

      // Insert new fees
      const results = [];
      for (const fee of newFees) {
        const { data, error } = await supabase
          .from('bus_fee_structure')
          .insert([{
            village_id: fee.village_id,
            fee_amount: fee.fee_amount,
            effective_from_date: fee.effective_from_date,
            effective_to_date: fee.effective_to_date,
            is_active: true,
            academic_year_id: academicYearId
          }])
          .select();
          
        if (error) throw error;
        results.push(data);
      }

      // Refresh the fees list
      await fetchBusFees(academicYearId);
      return newFees;
    } catch (err: any) {
      console.error('Error copying from previous year:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    busFees,
    loading,
    error,
    fetchBusFees,
    saveBusFees,
    copyFromPreviousYear,
  };
};