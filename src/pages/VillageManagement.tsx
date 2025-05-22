import { useState } from 'react';
import { Plus, Upload, Download, Search, Filter, Eye, Pencil, ToggleLeft } from 'lucide-react';
import VillageForm from '../components/villages/VillageForm';
import VillageDetails from '../components/villages/VillageDetails';
import VillageTable from '../components/villages/VillageTable';
import VillageImport from '../components/villages/VillageImport';

const VillageManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setShowForm(false);
    setSelectedVillage(null);
  };

  const handleImport = (data: any) => {
    console.log('Import data:', data);
    setShowImport(false);
  };

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

      {showForm ? (
        <div className="bg-card rounded-lg shadow p-6">
          <VillageForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedVillage(null);
            }}
            initialData={selectedVillage}
          />
        </div>
      ) : showDetails ? (
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
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search villages..."
                className="input pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
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

          <VillageTable
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
        </>
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