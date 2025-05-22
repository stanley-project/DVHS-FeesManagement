import { X, MapPin, Users, Bus, CircleDollarSign, Pencil } from 'lucide-react';
import BusFeeHistory from './BusFeeHistory';
import StudentList from './StudentList';

interface VillageDetailsProps {
  village: any;
  onClose: () => void;
  onEdit: () => void;
  onSetBusFee: () => void;
}

const VillageDetails = ({ village, onClose, onEdit, onSetBusFee }: VillageDetailsProps) => {
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
              <p className="text-2xl font-bold">{village.total_students}</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Bus className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Bus Students</p>
              </div>
              <p className="text-2xl font-bold">{village.bus_students}</p>
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Current Bus Fee</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {village.current_bus_fee ? `₹${village.current_bus_fee}` : '-'}
                </p>
                <button
                  onClick={onSetBusFee}
                  className="btn btn-outline btn-xs"
                >
                  Set Fee
                </button>
              </div>
            </div>
          </div>

          {/* Bus Fee History */}
          <BusFeeHistory village={village} />

          {/* Students List */}
          <StudentList village={village} />
        </div>
      </div>
    </div>
  );
};

export default VillageDetails;