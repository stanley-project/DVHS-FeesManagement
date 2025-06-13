import { useState } from 'react';
import { toast } from 'react-hot-toast';
import MiscellaneousChargesTable from '../components/fees/MiscellaneousChargesTable';
import MiscellaneousChargesForm from '../components/fees/MiscellaneousChargesForm';
import MiscellaneousChargeDetails from '../components/fees/MiscellaneousChargeDetails';
import MiscellaneousChargePayment from '../components/fees/MiscellaneousChargePayment';
import { MiscellaneousCharge } from '../types/fees';

const MiscellaneousCharges = () => {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<MiscellaneousCharge | null>(null);

  const handleAddCharge = () => {
    setSelectedCharge(null);
    setShowForm(true);
  };

  const handleViewCharge = (charge: MiscellaneousCharge) => {
    setSelectedCharge(charge);
    setShowDetails(true);
  };

  const handleEditCharge = (charge: MiscellaneousCharge) => {
    setSelectedCharge(charge);
    setShowForm(true);
  };

  const handleProcessPayment = (charge: MiscellaneousCharge) => {
    setSelectedCharge(charge);
    setShowPayment(true);
  };

  const handleFormSubmit = (data: any) => {
    toast.success('Charges created successfully');
    setShowForm(false);
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment processed successfully');
    setShowPayment(false);
    setShowDetails(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Miscellaneous Charges</h1>
      </div>

      {showForm ? (
        <div className="bg-card rounded-lg shadow p-6">
          <MiscellaneousChargesForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            studentId={selectedCharge?.student_id}
          />
        </div>
      ) : (
        <MiscellaneousChargesTable
          onAddCharge={handleAddCharge}
          onViewCharge={handleViewCharge}
          onEditCharge={handleEditCharge}
          onProcessPayment={handleProcessPayment}
        />
      )}

      {showDetails && selectedCharge && (
        <MiscellaneousChargeDetails
          charge={selectedCharge}
          onClose={() => setShowDetails(false)}
          onProcessPayment={
            !selectedCharge.is_paid 
              ? () => {
                  setShowDetails(false);
                  setShowPayment(true);
                }
              : undefined
          }
        />
      )}

      {showPayment && selectedCharge && (
        <MiscellaneousChargePayment
          charge={selectedCharge}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default MiscellaneousCharges;