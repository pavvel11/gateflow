'use client';

import { Component, ReactNode, Suspense } from 'react';
import PaymentMethodSettings from './PaymentMethodSettings';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PaymentMethodErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PaymentMethodSettings Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">
            Error Loading Payment Method Settings
          </h3>
          <p className="text-red-700 dark:text-red-400">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <pre className="mt-4 p-2 bg-red-50 dark:bg-red-900/50 rounded text-xs overflow-auto">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function PaymentMethodSettingsWrapper() {
  return (
    <PaymentMethodErrorBoundary>
      <Suspense fallback={<div className="p-6 bg-white dark:bg-gray-800 rounded-lg">Loading Payment Method Settings...</div>}>
        <PaymentMethodSettings />
      </Suspense>
    </PaymentMethodErrorBoundary>
  );
}
