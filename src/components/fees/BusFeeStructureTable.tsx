import { useState, useEffect } from 'react';
import { ArrowUpDown, Edit, Trash2, Bus, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface BusFeeStructure {
  id: string;
  village_id: string;
  fee_amount: number;
  effective_from_date: string;
  effective_to_date: string;
  is_active: boolean;
  village?: {
    id: string;
    name: string;
    distance_from_school: number;
    bus_number: string;
  };
}

interface BusFeeStructureTableProps {
  academicYearId: string;
  onEdit: (fee: BusFeeStructure) => void;
  onDelete: (id: string) => Promise<void>;
}

const BusFeeStructureTable = ({ academicYearId, onEdit, onDelete }: BusFeeStructureTableProps) => {
  const [busFees, setBusFees] = useState<BusFeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('distance_from_school');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchBusFees();
  }, [academicYearId, sortField, sortDirection]);

  const fetchBusFees = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!academicYearId) {
        setError('No academic year selected');
        return;
      }

      console.log('Fetching bus fees for academic year:', academicYearId);
      
      const { data, error } = await supabase
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

      if (error) throw error;

      console.log('Fetched bus fees data:', data);

      // Sort the data based on the selected field and direction
      const sortedData = [...(data || [])].sort((a, b) => {
        if (!a.village || !b.village) return 0;

        if (sortField === 'village_name') {
          return sortDirection === 'asc'
            ? a.village.name.localeCompare(b.village.name)
            : b.village.name.localeCompare(a.village.name);
        }
        
        if (sortField === 'distance_from_school') {
          return sortDirection === 'asc'
            ? a.village.distance_from_school - b.village.distance_from_school
            : b.village.distance_from_school - a.village.distance_from_school;
        }
        
        if (sortField === 'bus_number') {
          return sortDirection === 'asc'
            ? a.village.bus_number.localeCompare(b.village.bus_number)
            : b.village.bus_number.localeCompare(a.village.bus_number);
        }
        
        if (sortField === 'fee_amount') {
          const aAmount = parseFloat(a.fee_amount.toString());
          const bAmount = parseFloat(b.fee_amount.toString());
          return sortDirection === 'asc' ? aAmount - bAmount : bAmount - aAmount;
        }
        
        return 0;
      });

      console.log('Sorted bus fees:', sortedData);
      setBusFees(sortedData);
    } catch (err) {
      console.error('Error fetching bus fees:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bus fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast.success('Bus fee deleted successfully');
      fetchBusFees();
    } catch (err) {
      console.error('Error deleting bus fee:', err);
      toast.error('Failed to delete bus fee');
    }
  };

  const handleEdit = (fee: BusFeeStructure) => {
    console.log('Editing bus fee:', fee);
    onEdit(fee);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading bus fee structure...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        {error}
      </div>
    );
  }

  if (busFees.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No bus fee structure items found.</p>
        <p className="text-sm text-muted-foreground mt-2">Click "Add Bus Fee" to create one.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <button 
                onClick={() => handleSort('village_name')}
                className="flex items-center gap-1 hover:text-primary"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Village Name
                <ArrowUpDown className={`h-4 w-4 ${sortField === 'village_name' ? 'text-primary' : ''}`} />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <button 
                onClick={() => handleSort('distance_from_school')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Distance (km)
                <ArrowUpDown className={`h-4 w-4 ${sortField === 'distance_from_school' ? 'text-primary' : ''}`} />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              <button 
                onClick={() => handleSort('bus_number')}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Bus className="h-4 w-4 mr-1" />
                Bus Number
                <ArrowUpDown className={`h-4 w-4 ${sortField === 'bus_number' ? 'text-primary' : ''}`} />
              </button>
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              <button 
                onClick={() => handleSort('fee_amount')}
                className="flex items-center gap-1 ml-auto hover:text-primary"
              >
                Fee Amount (₹)
                <ArrowUpDown className={`h-4 w-4 ${sortField === 'fee_amount' ? 'text-primary' : ''}`} />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Monthly</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {busFees.map((fee) => (
            <tr key={fee.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 font-medium">{fee.village?.name || 'Unknown'}</td>
              <td className="px-4 py-3">{fee.village?.distance_from_school || 'N/A'}</td>
              <td className="px-4 py-3">{fee.village?.bus_number || 'N/A'}</td>
              <td className="px-4 py-3 text-right">₹{parseFloat(fee.fee_amount.toString()).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3">{new Date(fee.effective_from_date).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Yes
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(fee)}
                    className="p-1 hover:bg-muted rounded-md"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(fee.id)}
                    className="p-1 hover:bg-muted rounded-md text-error"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BusFeeStructureTable;