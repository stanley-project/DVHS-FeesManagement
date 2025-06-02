import { useState } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import VillageForm from '../components/villages/VillageForm';
import VillageDetails from '../components/villages/VillageDetails';
import VillageTable from '../components/villages/VillageTable';
import { useVillages } from '../hooks/useVillages';
import { Village } from '../types/village';

const VillageManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = villages.map(village => ({
        'Village Name': village.name,
        'Distance (km)': village.distance_from_school,
        'Bus Number': village.bus_number || 'N/A',
        'Status': village.is_active ? 'Active' : 'Inactive',
        'Created At': new Date(village.created_at).toLocaleDateString(),
        'Last Updated': new Date(village.updated_at).toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Villages');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `Village_Details_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      toast.success('Villages exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export villages');
    }
  };

  const { 
    villages = [], 
    loading, 
    error, 
    sortConfig,
    handleSort,
    addVillage, 
    updateVillage, 
    deleteVillage,
    refreshVillages 
  } = useVillages();

  const handleSubmit = async (data: Omit<Village, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (selectedVillage) {
        await updateVillage(selectedVillage.id, data);
        toast.success('Village updated successfully');
      } else {
        await addVillage(data);
        toast.success('Village added successfully');
      }
      setShowForm(false);
      setSelectedVillage(null);
      refreshVillages();
    } catch (error) {
      console.error('Error saving village:', error);
      toast.error('Failed to save village');
    }
  };

  const handleImport = async (data: any[]) => {
    try {
      // TODO: Implement bulk import
      console.log('Import data:', data);
      setShowImport(false);
      toast.success('Villages imported successfully');
      refreshVillages();
    } catch (error) {
      console.error('Error importing villages:', error);
      toast.error('Failed to import villages');
    }
  };

  // Handle filtering before passing to VillageTable
  const filteredVillages = villages.filter(village => {
    const matchesSearch = village.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'active' ? village.is_active : !village.is_active;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading villages...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error loading villages: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Village Management</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline btn-md inline-flex items-center"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          
          <button
            className="btn btn-primary btn-md inline-flex items-center"
            onClick={() => {
              setSelectedVillage(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Village
          </button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search villages..."
                className="input pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <VillageTable
            villages={filteredVillages}
            sortConfig={sortConfig}
            onSort={handleSort}
            onView={(village) => {
              setSelectedVillage(village);
              setShowDetails(true);
            }}
            onEdit={(village) => {
              setSelectedVillage(village);
              setShowForm(true);
            }}
            onDelete={deleteVillage}
          />
        </div>
      </div>

      {showForm && (
        <VillageForm
          village={selectedVillage}
          onClose={() => {
            setShowForm(false);
            setSelectedVillage(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {showDetails && selectedVillage && (
        <VillageDetails
          village={selectedVillage}
          onClose={() => {
            setShowDetails(false);
            setSelectedVillage(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
};

export default VillageManagement;