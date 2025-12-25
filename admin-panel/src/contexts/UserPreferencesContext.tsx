'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { updateUserPreferences } from '@/lib/actions/preferences';

export type CurrencyViewMode = 'grouped' | 'converted';

interface UserPreferencesContextProps {
  hideValues: boolean;
  toggleHideValues: () => Promise<void>;
  displayCurrency: string | null;
  setDisplayCurrency: (currency: string | null) => Promise<void>;
  currencyViewMode: CurrencyViewMode;
  setCurrencyViewMode: (mode: CurrencyViewMode) => Promise<void>;
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
  initialHideValues = false,
  initialDisplayCurrency = null,
  initialCurrencyViewMode = 'grouped' as CurrencyViewMode
}: {
  children: ReactNode;
  initialHideValues?: boolean;
  initialDisplayCurrency?: string | null;
  initialCurrencyViewMode?: CurrencyViewMode;
}) => {
  const [hideValues, setHideValues] = useState(initialHideValues);
  const [displayCurrency, setDisplayCurrencyState] = useState<string | null>(initialDisplayCurrency);
  const [currencyViewMode, setCurrencyViewModeState] = useState<CurrencyViewMode>(initialCurrencyViewMode);

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

  const setDisplayCurrency = useCallback(async (currency: string | null) => {
    setDisplayCurrencyState(currency); // Optimistic update

    try {
      await updateUserPreferences({ displayCurrency: currency });
    } catch (error) {
      console.error('Failed to save display currency preference:', error);
      setDisplayCurrencyState(displayCurrency); // Revert on error
    }
  }, [displayCurrency]);

  const setCurrencyViewMode = useCallback(async (mode: CurrencyViewMode) => {
    setCurrencyViewModeState(mode); // Optimistic update

    try {
      await updateUserPreferences({ currencyViewMode: mode });
    } catch (error) {
      console.error('Failed to save currency view mode preference:', error);
      setCurrencyViewModeState(currencyViewMode); // Revert on error
    }
  }, [currencyViewMode]);

  return (
    <UserPreferencesContext.Provider value={{
      hideValues,
      toggleHideValues,
      displayCurrency,
      setDisplayCurrency,
      currencyViewMode,
      setCurrencyViewMode
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};
