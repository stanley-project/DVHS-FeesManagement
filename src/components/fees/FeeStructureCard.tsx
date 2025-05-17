import { Pencil, Trash2 } from 'lucide-react';

interface FeeStructureCardProps {
  title: string;
  year: string;
  color: string;
  components: Array<{
    name: string;
    amount: string;
  }>;
  totalPerTerm: string;
  annualFee: string;
}

const FeeStructureCard = ({ 
  title, 
  year, 
  color, 
  components, 
  totalPerTerm, 
  annualFee 
}: FeeStructureCardProps) => {
  return (
    <div className="bg-card rounded-lg shadow overflow-hidden">
      <div className={`${color} p-4`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          <div className="flex gap-2">
            <button className="p-1 hover:bg-primary-foreground/10 rounded">
              <Pencil className="h-4 w-4" />
            </button>
            <button className="p-1 hover:bg-primary-foreground/10 rounded">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm opacity-90">{year}</p>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="font-medium">Fee Component</span>
            <span className="font-medium">Amount (₹)</span>
          </div>
          
          {components.map((component, index) => (
            <div key={index} className="flex justify-between items-center">
              <span>{component.name}</span>
              <span>{component.amount}</span>
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Total (Per Term)</span>
            <span className="font-semibold">{totalPerTerm}</span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Annual Fee (3 Terms)</span>
            <span className="font-semibold">{annualFee}</span>
          </div>
        </div>
        
        <div className="mt-6 p-3 bg-muted rounded-md text-sm">
          <p className="font-medium mb-1">Payment Schedule:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Term 1: 15th June</li>
            <li>Term 2: 15th September</li>
            <li>Term 3: 15th December</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FeeStructureCard;