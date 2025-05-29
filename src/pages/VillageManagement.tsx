import { useState } from 'react';
import { Plus, Upload, Download, Search, Filter, Eye, Pencil, ToggleLeft } from 'lucide-react';
import VillageForm from '../components/villages/VillageForm';
import VillageDetails from '../components/villages/VillageDetails';
import VillageTable from '../components/villages/VillageTable';
import VillageImport from '../components/villages/VillageImport';
import { useVillages } from '../contexts/VillageContext';
import { Village } from '../types/village';

const VillageManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { villages, loading, error, addVillage, updateVillage } = useVillages();

  const handleSubmit = async (data: Village) => {
    try {
      if (selectedVillage) {
        await updateVillage(selectedVillage.id, data);
      } else {
        await addVillage(data);
      }
      setShowForm(false);
      setSelectedVillage(null);
    } catch (error) {
      console.error('Error saving village:', error);
      // TODO: Add error toast notification
    }
  };

  const handleImport = async (data: any) => {
    try {
      // TODO: Implement bulk import
      console.log('Import data:', data);
      setShowImport(false);
    } catch (error) {
      console.error('Error importing villages:', error);
      // TODO: Add error toast notification
    }
  };

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
        <h1>Village Management</h1>
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
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search villages..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Villages Table */}
          <VillageTable
            villages={villages}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onView={(village) => {
              setSelectedVillage(village);
              setShowDetails(true);
            }}
            onEdit={(village) => {
              setSelectedVillage(village);
              setShowForm(true);
            }}
          />
        </div>
      </div>

      {/* Village Form Modal */}
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

      {/* Village Details Modal */}
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

      {/* Import Modal */}
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