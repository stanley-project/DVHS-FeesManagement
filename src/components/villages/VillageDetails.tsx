import { useState, useEffect } from 'react';
import { X, MapPin, Users, Bus, CircleDollarSign, Pencil, AlertCircle } from 'lucide-react';
import BusFeeHistory from './BusFeeHistory';
import StudentList from './StudentList';
import { supabase } from '../../lib/supabase';
import { Village } from '../../types/village';

interface VillageDetailsProps {
  village: Village;
  onClose: () => void;
  onEdit: () => void;
  villageStats?: { totalStudents: number, busStudents: number };
}

const VillageDetails = ({ village, onClose, onEdit, villageStats }: VillageDetailsProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCurrentYear, setNoCurrentYear] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: villageStats?.totalStudents || 0,
    busStudents: villageStats?.busStudents || 0,
    currentBusFee: null as number | null
  });

  useEffect(() => {
    // If villageStats is provided, use it
    if (villageStats) {
      setStats(prev => ({
        ...prev,
        totalStudents: villageStats.totalStudents,
        busStudents: villageStats.busStudents
      }));
    }
    
    fetchBusFee();
  }, [village.id, villageStats]);

  const fetchBusFee = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoCurrentYear(false);

      // Get current academic year
      const { data: currentYear, error: yearError } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      if (yearError) throw new Error('Failed to fetch current academic year');
      
      if (!currentYear) {
        setNoCurrentYear(true);
        return;
      }

      // Get current bus fee
      const { data: busFee, error: busFeeError } = await supabase
        .from('bus_fee_structure')
        .select('fee_amount')
        .eq('village_id', village.id)
        .eq('academic_year_id', currentYear.id)
        .eq('is_active', true)
        .maybeSingle();

      if (busFeeError && !busFeeError.message.includes('No rows found')) {
        throw new Error('Failed to fetch bus fee');
      }

      setStats(prev => ({
        ...prev,
        currentBusFee: busFee?.fee_amount || null
      }));
    } catch (err) {
      console.error('Error fetching village stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-4xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">{village.name}</h2>
            <p className="text-sm text-muted-foreground">Village Details</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="btn btn-outline btn-sm"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Village
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {noCurrentYear && (
            <div className="bg-warning/10 border border-warning text-warning rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">No Current Academic Year Set</p>
                <p className="text-sm">Please set a current academic year in Academic Year Management to view statistics.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-md p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Village Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Distance</p>
                  </div>
                  <p className="text-2xl font-bold">{village.distance_from_school} km</p>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Total Students</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Bus className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Bus Students</p>
                  </div>
                  <p className="text-2xl font-bold">{stats.busStudents}</p>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Current Bus Fee</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.currentBusFee ? `₹${stats.currentBusFee}` : '-'}
                  </p>
                </div>
              </div>

              {/* Only show these components if there is a current academic year */}
              {!noCurrentYear && (
                <>
                  {/* Bus Fee History */}
                  <BusFeeHistory village={village} />

                  {/* Students List */}
                  <StudentList village={village} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VillageDetails;