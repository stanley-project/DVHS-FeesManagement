import { useState, useEffect } from 'react';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Village } from '../../types/village';

interface BusFeeHistoryProps {
  village: Village;
}

const BusFeeHistory = ({ village }: BusFeeHistoryProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeeHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: historyError } = await supabase
          .from('bus_fee_history')
          .select(`
            id,
            previous_amount,
            new_amount,
            change_date,
            changed_by(name),
            reason
          `)
          .eq('village_id', village.id)
          .order('change_date', { ascending: false });

        if (historyError) throw historyError;

        setFeeHistory(data || []);
      } catch (err) {
        console.error('Error fetching fee history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch fee history');
      } finally {
        setLoading(false);
      }
    };

    fetchFeeHistory();
  }, [village.id]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Bus Fee History</h3>
      
      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feeHistory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No fee history available
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">
                <button className="flex items-center gap-1">
                  Change Date
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Previous Amount</th>
              <th className="px-4 py-3 text-right">New Amount</th>
              <th className="px-4 py-3 text-left">Changed By</th>
              <th className="px-4 py-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {feeHistory.map((history) => (
              <tr key={history.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3">{new Date(history.change_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">₹{history.previous_amount}</td>
                <td className="px-4 py-3 text-right">₹{history.new_amount}</td>
                <td className="px-4 py-3">{history.changed_by?.name || 'System'}</td>
                <td className="px-4 py-3">{history.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default BusFeeHistory;