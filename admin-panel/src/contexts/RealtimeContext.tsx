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
  const listenersRef = React.useRef<(() => void)[]>([]);

  const addRefreshListener = useCallback((listener: () => void) => {
    listenersRef.current.push(listener);
  }, []);

  const removeRefreshListener = useCallback((listener: () => void) => {
    listenersRef.current = listenersRef.current.filter(l => l !== listener);
  }, []);

  // Stable context value
  const contextValue = React.useMemo(() => ({
    addRefreshListener,
    removeRefreshListener
  }), [addRefreshListener, removeRefreshListener]);

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
              // Access current listeners from ref
              listenersRef.current.forEach(listener => listener());

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
  }, []); // Only run once on mount

  return (
    <RealtimeContext.Provider value={contextValue}>
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
