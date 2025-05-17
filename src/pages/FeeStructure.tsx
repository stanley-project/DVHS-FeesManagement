import React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';

const FeeStructure = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1>Fee Structure</h1>
        
        <button className="btn btn-primary btn-md inline-flex items-center">
          <Plus className="mr-2 h-4 w-4" />
          Add Fee Structure
        </button>
      </div>
      
      {/* Fee Structure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Classes (I-V) */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Primary Classes (I-V)</h2>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-primary-foreground/10 rounded">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-1 hover:bg-primary-foreground/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm opacity-90">Academic Year 2025-2026</p>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Fee Component</span>
                <span className="font-medium">Amount (₹)</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Admission Fee (One Time)</span>
                <span>₹10,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Tuition Fee (Per Term)</span>
                <span>₹12,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Development Fee (Per Term)</span>
                <span>₹2,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Computer Lab Fee (Per Term)</span>
                <span>₹1,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Library Fee (Per Term)</span>
                <span>₹1,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Sports & Activities (Per Term)</span>
                <span>₹1,500</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total (Per Term)</span>
                <span className="font-semibold">₹19,000</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Annual Fee (3 Terms)</span>
                <span className="font-semibold">₹57,000</span>
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
        
        {/* Middle Classes (VI-VIII) */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-secondary text-secondary-foreground p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Middle Classes (VI-VIII)</h2>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-secondary-foreground/10 rounded">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-1 hover:bg-secondary-foreground/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm opacity-90">Academic Year 2025-2026</p>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Fee Component</span>
                <span className="font-medium">Amount (₹)</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Admission Fee (One Time)</span>
                <span>₹12,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Tuition Fee (Per Term)</span>
                <span>₹15,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Development Fee (Per Term)</span>
                <span>₹3,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Computer Lab Fee (Per Term)</span>
                <span>₹2,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Library Fee (Per Term)</span>
                <span>₹1,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Sports & Activities (Per Term)</span>
                <span>₹2,000</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total (Per Term)</span>
                <span className="font-semibold">₹23,500</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Annual Fee (3 Terms)</span>
                <span className="font-semibold">₹70,500</span>
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
        
        {/* Secondary Classes (IX-X) */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-accent text-accent-foreground p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Secondary Classes (IX-X)</h2>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-accent-foreground/10 rounded">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-1 hover:bg-accent-foreground/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm opacity-90">Academic Year 2025-2026</p>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Fee Component</span>
                <span className="font-medium">Amount (₹)</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Admission Fee (One Time)</span>
                <span>₹15,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Tuition Fee (Per Term)</span>
                <span>₹18,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Development Fee (Per Term)</span>
                <span>₹3,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Computer Lab Fee (Per Term)</span>
                <span>₹2,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Library Fee (Per Term)</span>
                <span>₹2,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Sports & Activities (Per Term)</span>
                <span>₹2,500</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total (Per Term)</span>
                <span className="font-semibold">₹28,500</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Annual Fee (3 Terms)</span>
                <span className="font-semibold">₹85,500</span>
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
        
        {/* Senior Secondary Classes (XI-XII) */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Senior Secondary (XI-XII)</h2>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-primary-foreground/10 rounded">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="p-1 hover:bg-primary-foreground/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm opacity-90">Academic Year 2025-2026</p>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium">Fee Component</span>
                <span className="font-medium">Amount (₹)</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Admission Fee (One Time)</span>
                <span>₹20,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Tuition Fee (Per Term)</span>
                <span>₹22,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Development Fee (Per Term)</span>
                <span>₹4,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Lab Fee - Science (Per Term)</span>
                <span>₹3,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Computer Lab Fee (Per Term)</span>
                <span>₹3,000</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Library Fee (Per Term)</span>
                <span>₹2,500</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Sports & Activities (Per Term)</span>
                <span>₹3,000</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total (Per Term)</span>
                <span className="font-semibold">₹38,000</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Annual Fee (3 Terms)</span>
                <span className="font-semibold">₹114,000</span>
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
      </div>
    </div>
  );
};

export default FeeStructure;