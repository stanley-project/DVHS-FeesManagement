import React, { createContext, useContext } from 'react';
import { useVillages } from '../hooks/useVillages';

const VillageContext = createContext<ReturnType<typeof useVillages> | undefined>(undefined);

export function VillageProvider({ children }: { children: React.ReactNode }) {
  const villages = useVillages();
  return <VillageContext.Provider value={villages}>{children}</VillageContext.Provider>;
}

export function useVillageContext() {
  const context = useContext(VillageContext);
  if (context === undefined) {
    throw new Error('useVillageContext must be used within a VillageProvider');
  }
  return context;
}