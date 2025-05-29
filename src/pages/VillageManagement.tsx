// src/contexts/VillageContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useVillages } from 'src/hooks/useVillages'; // Ensure this path is correct for your project structure
import { useAuth } from './AuthContext'; // Ensure this path is correct

// The VillageContextType will infer its structure from the return type of useVillages
// and add an isInitialized flag.
// This means whatever useVillages returns (e.g., villages, loading, error, addVillage, etc.)
// will be part of this type, plus our additional isInitialized.
export interface VillageContextType extends ReturnType<typeof useVillages> {
  /**
   * Indicates if the authentication process has completed.
   * True when authLoading (from AuthContext) is false.
   * This helps components determine if they can reliably check isAuthenticated.
   */
  isInitialized: boolean;
}

const VillageContext = createContext<VillageContextType | undefined>(undefined);

interface VillageProviderProps {
  children: ReactNode;
}

export function VillageProvider({ children }: VillageProviderProps) {
  const { authLoading } = useAuth(); // We primarily need authLoading to determine initialization.
                                     // isAuthenticated is used internally by useVillages.
  
  const villagesHookData = useVillages(); // This hook manages fetching villages based on auth state

  // The value provided by the context.
  // It includes all data and functions returned by useVillages,
  // plus the isInitialized flag.
  const contextValue: VillageContextType = {
    ...villagesHookData,
    isInitialized: !authLoading, // True once authentication loading is finished
  };

  return (
    <VillageContext.Provider value={contextValue}>
      {children}
    </VillageContext.Provider>
  );
}

/**
 * Custom hook to consume the VillageContext.
 * Provides access to village data, loading states, error states,
 * and village-related actions.
 */
export function useVillageContext() {
  const context = useContext(VillageContext);
  if (context === undefined) {
    throw new Error('useVillageContext must be used within a VillageProvider. Ensure VillageProvider wraps the component tree.');
  }
  
  // Components using this hook can check:
  // 1. context.isInitialized: To know if auth state is settled.
  // 2. context.loading: For village data loading state.
  // 3. context.error: For errors during village data operations.
  // 4. context.villages: The actual village data.
  // 5. context.isAuthenticated (from useAuth, if needed directly, though useVillages handles it)
  return context;
}