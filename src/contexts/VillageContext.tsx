import React, { createContext, useContext } from 'react';
import { useVillages } from '../hooks/useVillages';
import { useAuth } from './AuthContext';

interface VillageContextType extends ReturnType<typeof useVillages> {
  isInitialized: boolean;
}

const VillageContext = createContext<VillageContextType | undefined>(undefined);

export function VillageProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const villages = useVillages();

  const contextValue: VillageContextType = {
    ...villages,
    isInitialized: isAuthenticated
  };

  return (
    <VillageContext.Provider value={contextValue}>
      {children}
    </VillageContext.Provider>
  );
}

export function useVillageContext() {
  const context = useContext(VillageContext);
  if (context === undefined) {
    throw new Error('useVillageContext must be used within a VillageProvider and after authentication is initialized');
  }
  return context;
}