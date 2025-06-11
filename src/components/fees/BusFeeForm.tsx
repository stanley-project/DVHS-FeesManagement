import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useVillages } from '../../hooks/useVillages';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  bus_number: string;
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
  const [formData, setFormData] = useState<FormData>({ fees: [] });
  const [loadingFees, setLoadingFees] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const { isAuthenticated, authLoading } = useAuth();

  // Filter for active villages
  const activeVillages = useMemo(() => {
    return villages.filter(village => village.is_active);
  }, [villages]);

  // Fetch current bus fees
  const fetchCurrentFees = useCallback(async () => {
    if (!isAuthenticated || activeVillages.length === 0) {
      return;
    }

    try {
      setLoadingFees(true);
      setFeeError(null);

      // Get current academic year
      const { data: currentAcademicYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id, year_name')
        .eq('is_current', true)
        .maybeSingle();

      if (yearError) {
        throw new Error('Failed to fetch current academic year');
      }

      if (!currentAcademicYear) {
        // Try to get the latest academic year
        const { data: latestYear, error: latestError } = await supabase
          .from('academic_years')
          .select('id, year_name')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError || !latestYear) {
          throw new Error('No academic year found');
        }
      }

      const academicYearId = currentAcademicYear?.id || '';

      // Get current bus fees
      const { data: feeData, error: feeError } = await supabase
        .from('bus_fee_structure')
        .select('village_id, fee_amount')
        .eq('academic_year_id', academicYearId)
        .eq('is_active', true);

      if (feeError) {
        throw feeError;
      }

      // Create fee map
      const feeMap: Record<string, number> = {};
      if (feeData && feeData.length > 0) {
        feeData.forEach(fee => {
          const feeAmount = typeof fee.fee_amount === 'string'
            ? parseFloat(fee.fee_amount)
            : fee.fee_amount;
          feeMap[fee.village_id] = isNaN(feeAmount) ? 0 : feeAmount;
        });
      }

      setCurrentFees(feeMap);

      // Initialize form data
      const initialFees = activeVillages.map(village => ({
        village_id: village.id,
        fee_amount: feeMap[village.id] || 0,
        effective_from_date: new Date().toISOString().split('T')[0],
        effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        is_active: true
      }));

      setFormData({ fees: initialFees });

    } catch (err: any) {
      setFeeError(err.message || 'Failed to load current fees');
    } finally {
      setLoadingFees(false);
    }
  }, [activeVillages, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && activeVillages.length > 0) {
      fetchCurrentFees();
    }
  }, [activeVillages, fetchCurrentFees, isAuthenticated, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.fees.length === 0) {
      setFeeError('No fee data to submit');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onSubmit(formData);
    setShowConfirmation(false);
  };

  const handleFeeChange = (villageId: string, newAmountStr: string) => {
    const newAmount = parseFloat(newAmountStr);
    if (isNaN(newAmount) && newAmountStr !== '') {
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
      newFees.push({
        village_id: villageId,
        fee_amount: newAmountStr === '' ? 0 : newAmount,
        effective_from_date: new Date().toISOString().split('T')[0],
        effective_to_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        is_active: true
      });
    }

    setFormData({ ...formData, fees: newFees });
  };

  if (villagesLoading || authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading villages...</span>
      </div>
    );
  }

  if (villagesError) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Error Loading Villages</p>
        </div>
        <p className="mt-1">{villagesError.message}</p>
      </div>
    );
  }

  if (activeVillages.length === 0) {
    return (
      <div className="bg-warning/10 border border-warning/30 text-warning rounded-md p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">No Active Villages</p>
        </div>
        <p className="mt-1">There are no active villages to configure bus fees for. Please add or activate villages first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">Bus Fee Structure</h3>
            <p className="text-sm text-muted-foreground">Academic Year: {academicYear}</p>
          </div>
        </div>

        {feeError && (
          <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{feeError}</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="bg-error/10 border border-error/30 text-error rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{submitError}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {loadingFees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading current fees...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Village</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Distance (km)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Bus Number</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Monthly Fee (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeVillages.map((village) => {
                    const feeEntry = formData.fees.find(f => f.village_id === village.id);
                    
                    return (
                      <tr key={village.id} className="hover:bg-muted/25">
                        <td className="px-4 py-3">
                          <div className="font-medium">{village.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {village.distance_from_school}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {village.bus_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <div className="flex rounded-md shadow-sm max-w-32">
                              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground text-sm">
                                ₹
                              </span>
                              <input
                                type="number"
                                className="input rounded-l-none text-right"
                                value={feeEntry?.fee_amount ?? ''}
                                onChange={(e) => handleFeeChange(village.id, e.target.value)}
                                min="0"
                                step="any"
                                disabled={submitting}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            type="button"
            className="btn btn-outline btn-md"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-md"
            disabled={submitting || activeVillages.length === 0 || loadingFees}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Bus Fee Structure'
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
              <h3 className="text-lg font-semibold">Confirm Changes</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to update the bus fee structure for {academicYear}?
              {formData.fees.length > 0 && formData.fees[0]?.effective_from_date &&
                ` This will affect all bus fee calculations from ${formData.fees[0].effective_from_date}.`
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
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