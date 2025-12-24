'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { updateUserPreferences } from '@/lib/actions/preferences';

interface UserPreferencesContextProps {
  hideValues: boolean;
  toggleHideValues: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextProps | undefined>(undefined);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export const UserPreferencesProvider = ({ 
  children, 
  initialHideValues = false 
}: { 
  children: ReactNode, 
  initialHideValues?: boolean 
}) => {
  const [hideValues, setHideValues] = useState(initialHideValues);

  const toggleHideValues = useCallback(async () => {
    const newValue = !hideValues;
    setHideValues(newValue); // Optimistic update
    
    try {
      await updateUserPreferences({ hideValues: newValue });
    } catch (error) {
      console.error('Failed to save preference:', error);
      setHideValues(!newValue); // Revert on error
    }
  }, [hideValues]);

  return (
    <UserPreferencesContext.Provider value={{ hideValues, toggleHideValues }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};
