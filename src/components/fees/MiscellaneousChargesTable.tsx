import { useState, useEffect } from 'react';
import { ArrowUpDown, Eye, Pencil, Trash2, CircleDollarSign, AlertCircle, Loader2, Filter, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useMiscellaneousCharges } from '../../hooks/useMiscellaneousCharges';
import { MiscellaneousCharge } from '../../types/fees';
import SearchInput from '../shared/SearchInput';

interface MiscellaneousChargesTableProps {
  onAddCharge: () => void;
  onViewCharge: (charge: MiscellaneousCharge) => void;
  onEditCharge: (charge: MiscellaneousCharge) => void;
  onProcessPayment: (charge: MiscellaneousCharge) => void;
}

const MiscellaneousChargesTable = ({
  onAddCharge,
  onViewCharge,
  onEditCharge,
  onProcessPayment
}: MiscellaneousChargesTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const itemsPerPage = 10;

  const { 
    charges, 
    chargeCategories,
    loading, 
    error, 
    fetchCharges, 
    deleteCharge 
  } = useMiscellaneousCharges();

  // Fetch academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const { data, error } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (error) throw error;
        setAcademicYears(data || []);
        
        // Set current academic year as default
        const currentYear = data?.find(year => year.is_current);
        if (currentYear) {
          setAcademicYearId(currentYear.id);
        } else if (data && data.length > 0) {
          setAcademicYearId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching academic years:', err);
        toast.error('Failed to fetch academic years');
      }
    };

    fetchAcademicYears();
  }, []);

  // Fetch charges when filters change
  useEffect(() => {
    if (academicYearId) {
      const filters: any = { academicYearId };
      
      if (selectedStatus === 'paid') {
        filters.isPaid = true;
      } else if (selectedStatus === 'unpaid') {
        filters.isPaid = false;
      }
      
      fetchCharges(filters);
    }
  }, [fetchCharges, academicYearId, selectedStatus]);

  // Handle charge deletion
  const handleDelete = async (charge: MiscellaneousCharge) => {
    if (!confirm(`Are you sure you want to delete this charge? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCharge(charge.id);
      fetchCharges({ academicYearId: academicYearId || undefined });
    } catch (err) {
      // Error is handled in the hook
    }
  };

  // Filter charges based on search query and category
  const filteredCharges = charges.filter(charge => {
    const matchesSearch = 
      charge.student?.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charge.student?.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      charge.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      charge.charge_category?.id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Paginate charges
  const paginatedCharges = filteredCharges.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCharges.length / itemsPerPage);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 text-error rounded-md p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">Error Loading Charges</p>
        </div>
        <p className="mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by student name, admission number, or description..."
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="input"
            value={academicYearId || ''}
            onChange={(e) => setAcademicYearId(e.target.value)}
          >
            <option value="">Select Academic Year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year_name} {year.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
          
          <select
            className="input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {chargeCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          
          <select
            className="input"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          
          <button className="btn btn-outline btn-icon" title="Export">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          className="btn btn-primary btn-md inline-flex items-center"
          onClick={onAddCharge}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Charge
        </button>
      </div>

      {/* Charges Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading charges...</span>
          </div>
        ) : paginatedCharges.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">No charges found</div>
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' ? (
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={onAddCharge}
              >
                Add your first charge
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1">
                        Student
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1">
                        Category
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      <button className="flex items-center gap-1 ml-auto">
                        Amount
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <button className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCharges.map((charge) => (
                    <tr key={charge.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{charge.student?.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {charge.student?.admission_number} | {charge.student?.class?.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {charge.charge_category?.name || 'Custom'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm line-clamp-2">{charge.description}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">₹{charge.amount}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(charge.charge_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          charge.is_paid 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {charge.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button 
                            className="p-1 hover:bg-muted rounded-md" 
                            title="View Details"
                            onClick={() => onViewCharge(charge)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {!charge.is_paid && (
                            <>
                              <button 
                                className="p-1 hover:bg-muted rounded-md" 
                                title="Edit"
                                onClick={() => onEditCharge(charge)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              
                              <button 
                                className="p-1 hover:bg-muted rounded-md text-primary" 
                                title="Process Payment"
                                onClick={() => onProcessPayment(charge)}
                              >
                                <CircleDollarSign className="h-4 w-4" />
                              </button>
                              
                              <button 
                                className="p-1 hover:bg-muted rounded-md text-error" 
                                title="Delete"
                                onClick={() => handleDelete(charge)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCharges.length)} of {filteredCharges.length} charges
                </p>
                <div className="flex gap-1">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MiscellaneousChargesTable;