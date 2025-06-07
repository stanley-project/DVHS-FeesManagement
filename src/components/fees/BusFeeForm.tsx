// src/components/fees/BusFeeForm.tsx - Debug Version
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useVillages } from '../../hooks/useVillages';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
}

interface BusFeeFormProps {
  academicYear: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onCopyFromPrevious?: () => Promise<any>;
  loading?: boolean;
  error?: string;
}

interface BusFee {
  village_id: string;
  fee_amount: number;
  effective_from_date: string;
  effective_to_date: string;
  is_active: boolean;
}

interface FormData {
  fees: BusFee[];
}

const BusFeeForm = ({
  academicYear,
  onSubmit,
  onCancel,
  loading: submitting,
  error: submitError
}: BusFeeFormProps) => {
  const { villages, loading: villagesLoading, error: villagesError } = useVillages();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentFees, setCurrentFees] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<FormData>({
    fees: []
  });
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { isAuthenticated, authLoading, resetSession } = useAuth();

  // Filter for active villages (memoized)
  const activeVillages = useMemo(() => {
    return villages.filter(village => village.is_active);
  }, [villages]);

  // Fetch current bus fees (memoized)
  const fetchCurrentFees = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Not authenticated, skipping fetchCurrentFees');
      return;
    }

    try {
      console.log('🔍 Starting to fetch current fees...');
      setDebugInfo(null);

      let effectiveAcademicYear: { id: string; year_name: string } | null = null;

      // 1. Try to get the academic year marked as 'is_current'
      const { data: currentAcademicYearData, error: currentYearError } = await supabase
        .from('academic_years')
        .select('id, year_name')
        .eq('is_current', true)
        .single();

      console.log('📅 Initial current academic year query result:', { data: currentAcademicYearData, error: currentYearError });

      if (currentYearError || !currentAcademicYearData) {
        console.warn('⚠️ Could not fetch current academic year (or none marked as current). Attempting to fetch the latest one.', currentYearError);

        // 2. If not found or error, get the most recent academic year
        const { data: latestAcademicYearData, error: latestYearError } = await supabase
          .from('academic_years')
          .select('id, year_name')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestYearError || !latestAcademicYearData) {
          console.error('❌ Error fetching latest academic year, or no academic years exist in the table:', latestYearError);
          setDebugInfo({ error: 'Failed to determine an academic year. No current or latest academic year found.' });
          return;
        }
        console.log('📅 Using latest academic year:', latestAcademicYearData);
        effectiveAcademicYear = latestAcademicYearData;
      } else {
        console.log('📅 Using explicitly current academic year:', currentAcademicYearData);
        effectiveAcademicYear = currentAcademicYearData;
      }

      if (!effectiveAcademicYear || !effectiveAcademicYear.id) {
        console.error('❌ Critical: No valid academic year ID available to fetch fees.');
        setDebugInfo({ error: 'Critical: No academic year ID available to fetch fees.' });
        return;
      }

      console.log(`ℹ️ Fetching fees for Academic Year ID: ${effectiveAcademicYear.id} (Name: ${effectiveAcademicYear.year_name})`);

      // 3. Get current bus fees for the determined academic year
      const { data: feeData, error: feeError } = await supabase
        .from('bus_fee_structure')
        .select('village_id, fee_amount, academic_year_id, effective_from_date, effective_to_date, is_active')
        .eq('academic_year_id', effectiveAcademicYear.id);

      console.log('💰 Fee data query result:', { feeData, feeError });
      console.log('💰 Fee data length:', feeData?.length || 0);

      // Log the entire feeData array
      console.log('💰 Full feeData:', feeData);

      if (feeError) {
        console.error('❌ Error fetching fees:', feeError);
        setDebugInfo({ error: `Error fetching fees: ${feeError.message}`, academicYearUsed: effectiveAcademicYear });
        throw feeError;
      }

      // Create a map of village_id to fee_amount
      const feeMap: Record<string, number> = {};
      if (feeData && feeData.length > 0) {
        feeData.forEach(fee => {
          const feeAmount = typeof fee.fee_amount === 'string'
            ? parseFloat(fee.fee_amount)
            : fee.fee_amount;
          if (isNaN(feeAmount)) {
            console.warn(`⚠️ Found NaN fee_amount for village ${fee.village_id}. Original: ${fee.fee_amount}. Using 0.`);
            feeMap[fee.village_id] = 0;
          } else {
            console.log(`🗺️ Mapping village ${fee.village_id} to fee ${feeAmount} (original: ${fee.fee_amount})`);
            feeMap[fee.village_id] = feeAmount;
          }
        });
      } else {
        console.log('ℹ️ No active fee data found for the academic year. Fees will be initialized to 0 or be empty.');
      }

      console.log('🗺️ Final fee map (currentFees state will be set to this):', feeMap);
      setCurrentFees(feeMap);

      // Initialize form data with current fees or default to 0
      const initialFees = activeVillages.map(village => {
        const existingFeeAmount = feeMap[village.id];
        const feeAmountToSet = existingFeeAmount !== undefined ? existingFeeAmount : 0;

        console.log(`🏘️ Village ${village.name} (ID: ${village.id}): mapped fee = ${existingFeeAmount}, setting form fee to = ${feeAmountToSet}`);
        return {
          village_id: village.id,
          fee_amount: feeAmountToSet,
          effective_from_date: new Date().toISOString().split('T')[0],
          effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          is_active: true
        };
      });

      console.log('📋 Initial form data fees being set:', initialFees);
      setFormData({
        fees: initialFees
      });

      setDebugInfo({
        determinedAcademicYear: effectiveAcademicYear,
        fetchedFeeData: feeData,
        processedFeeMap: feeMap,
        activeVillagesCount: activeVillages.length,
        initializedFormFees: initialFees,
        rawVillagesData: villages,
      });

    } catch (err: any) {
      console.error('💥 Error in fetchCurrentFees process:', err);
      setDebugInfo(prev => ({ ...prev, error: `Overall error in fetchCurrentFees: ${err.message || err}` }));
    }
  }, [activeVillages, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && activeVillages.length > 0) {
      console.log('🏘️ Active villages loaded, count:', activeVillages.length, '. Triggering fee fetch.');
      fetchCurrentFees();
    } else if (villagesLoading) {
      console.log('⏳ Villages are still loading...');
    } else if (!isAuthenticated && !authLoading) {
      console.log('Not authenticated.  Waiting for authentication...');
    }
     else {
      console.log('ℹ️ No active fee data found, or villages data is empty. Not fetching fees.');
      setDebugInfo({ message: "No active villages to process.", activeVillagesCount: 0, villagesLoading });
    }
  }, [activeVillages, villagesLoading, fetchCurrentFees, isAuthenticated, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation: ensure at least one fee is set or all are 0
    const allFeesZero = formData.fees.every(f => f.fee_amount === 0);
    const someFeeSet = formData.fees.some(f => f.fee_amount > 0);

    if (formData.fees.length === 0 && activeVillages.length > 0) {
      console.warn("Form submitted but formData.fees is empty. This might be an issue.");
      // Optionally show an error to the user
    }

    // Add any other validation as needed here
    console.log("Submitting form data:", formData);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  const handleFeeChange = (villageId: string, newAmountStr: string) => {
    console.log(`💱 Attempting to change fee for village ${villageId} to (string): "${newAmountStr}"`);

    const newAmount = parseFloat(newAmountStr);
    if (isNaN(newAmount) && newAmountStr !== '') {
      console.warn(`⚠️ Invalid number input "${newAmountStr}" for village ${villageId}. Not updating.`);
      return;
    }

    const newFees = formData.fees.map(fee => {
      if (fee.village_id === villageId) {
        return { ...fee, fee_amount: newAmountStr === '' ? 0 : newAmount };
      }
      return fee;
    });

    const villageExistsInForm = newFees.some(f => f.village_id === villageId);
    if (!villageExistsInForm && activeVillages.some(v => v.id === villageId)) {
      console.log(`➕ Village ${villageId} not found in form, adding new fee entry.`);
      newFees.push({
        village_id: villageId,
        fee_amount: newAmountStr === '' ? 0 : newAmount,
        effective_from_date: new Date().toISOString().split('T')[0],
        effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        is_active: true
      });
    }

    console.log(`✅ Updated fees for village ${villageId}:`, newFees.find(f => f.village_id === villageId));
    setFormData({ ...formData, fees: newFees });
  };

  if (villagesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading villages...</div>
      </div>
    );
  }

  if (villagesError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 rounded-md p-4" role="alert">
        <p className="font-bold">Error</p>
        <p>Failed to load villages: {villagesError.message}</p>
      </div>
    );
  }

  if (!villagesLoading && activeVillages.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md p-4" role="alert">
        <p className="font-bold">No Villages</p>
        <p>There are no active villages to display fees for. Please add or activate villages first.</p>
        {debugInfo && (
          <div className="bg-gray-100 dark:bg-gray-700 p-2 mt-2 rounded-md text-xs text-gray-800 dark:text-gray-200">
            <h4 className="font-semibold mb-1">🐛 Debug Information:</h4>
            <pre className="whitespace-pre-wrap overflow-x-auto max-h-48">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Debug Information Panel */}
      {debugInfo && (
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-xs text-gray-800 dark:text-gray-200">
          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">🐛 Debug Information:</h4>
          <pre className="whitespace-pre-wrap overflow-x-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Bus Fee Structure</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Academic Year: {academicYear}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Village</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Distance (km)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bus Number</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Monthly Fee</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Debug Values</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {activeVillages.map((village) => {
                  const feeEntry = formData.fees.find(f => f.village_id === village.id);
                  const existingFeeFromDB = currentFees[village.id];

                  return (
                    <tr key={village.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{village.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{village.distance_from_school}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{village.bus_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex rounded-md shadow-sm justify-end">
                          <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-3 text-gray-600 dark:text-gray-300 text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            className="input block w-32 rounded-l-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-right"
                            value={feeEntry?.fee_amount ?? ''}
                            onChange={(e) => handleFeeChange(village.id, e.target.value)}
                            min="0"
                            step="any"
                            disabled={submitting}
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-center text-gray-400 dark:text-gray-500 hidden md:table-cell">
                        <div>Form: {feeEntry?.fee_amount ?? 'N/A'}</div>
                        <div>DB: {existingFeeFromDB ?? 'N/A'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 rounded-md p-3 text-sm" role="alert">
              {submitError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="btn btn-outline btn-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={submitting || activeVillages.length === 0}
          >
            {submitting ? 'Saving...' : 'Save Bus Fee Structure'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Changes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to update the bus fee structure for {academicYear}?
              {formData.fees.length > 0 && formData.fees[0]?.effective_from_date &&
                ` This will affect all bus fee calculations from ${formData.fees[0].effective_from_date}.`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm px-3 py-1.5 border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusFeeForm;