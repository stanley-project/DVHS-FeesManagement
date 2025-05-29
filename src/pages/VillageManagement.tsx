import { useState } from 'react';
import { Plus, Upload, Download, Search } from 'lucide-react';
import VillageForm from '../components/villages/VillageForm';
import VillageDetails from '../components/villages/VillageDetails';
import VillageTable from '../components/villages/VillageTable';
import VillageImport from '../components/villages/VillageImport';
import { useVillages } from '../hooks/useVillages';
import { Village } from '../types/village';
import { toast } from 'react-hot-toast';

const VillageManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { 
    villages, 
    loading, 
    error, 
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

  const handleDelete = async (id: string) => {
    try {
      await deleteVillage(id);
      toast.success('Village deleted successfully');
      refreshVillages();
    } catch (error) {
      console.error('Error deleting village:', error);
      toast.error('Failed to delete village');
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
            onClick={() => setShowImport(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Villages
          </button>
          
          <button
            className="btn btn-outline btn-md inline-flex items-center"
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
            onView={(village) => {
              setSelectedVillage(village);
              setShowDetails(true);
            }}
            onEdit={(village) => {
              setSelectedVillage(village);
              setShowForm(true);
            }}
            onDelete={handleDelete}
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

      {showImport && (
        <VillageImport
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
};

export default VillageManagement;