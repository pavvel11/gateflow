'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import NewOrderNotification from '@/components/dashboard/NewOrderNotification';

interface NewOrder {
  amount: string;
  currency: string;
  id: string;
}

interface RealtimeContextProps {
  addRefreshListener: (listener: () => void) => void;
  removeRefreshListener: (listener: () => void) => void;
}

const RealtimeContext = createContext<RealtimeContextProps | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null);
  const [listeners, setListeners] = useState<(() => void)[]>([]);

  const addRefreshListener = useCallback((listener: () => void) => {
    setListeners(prev => [...prev, listener]);
  }, []);

  const removeRefreshListener = useCallback((listener: () => void) => {
    setListeners(prev => prev.filter(l => l !== listener));
  }, []);

  const notifyListeners = () => {
    listeners.forEach(listener => listener());
  };

  useEffect(() => {
    let channel: any = null;

    const setupSubscription = async () => {
      const client = await createClient();
      
      channel = client
        .channel('global-admin-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payment_transactions' },
          (payload: any) => {
            if (payload.new?.status === 'completed') {
              // 1. Notify all components to refresh their data
              notifyListeners();

              // 2. Trigger the visual notification
              const amount = (payload.new.amount / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: payload.new.currency || 'USD',
              });
              setNewOrder({
                amount,
                currency: payload.new.currency || 'USD',
                id: payload.new.id || Date.now().toString(),
              });
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        createClient().then(client => client.removeChannel(channel));
      }
    };
  }, [listeners]); // Re-subscribing when listeners change is not ideal, but simple for this case

  return (
    <RealtimeContext.Provider value={{ addRefreshListener, removeRefreshListener }}>
      {children}
      {newOrder && (
        <NewOrderNotification
          key={newOrder.id}
          amount={newOrder.amount}
          currency={newOrder.currency}
          onClose={() => setNewOrder(null)}
        />
      )}
    </RealtimeContext.Provider>
  );
};
