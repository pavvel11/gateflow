import { useState, useCallback } from 'react';

interface TurnstileState {
  token: string | null;
  isVisible: boolean;
  error: string | null;
  timeout: boolean;
  showInteractiveWarning: boolean;
}

export function useTurnstile(): TurnstileState & {
  setToken: (token: string) => void;
  setVisible: (visible: boolean) => void;
  setError: (error: string | null) => void;
  setTimeout: (timeout: boolean) => void;
  setShowInteractiveWarning: (show: boolean) => void;
  reset: () => void;
} {
  const [token, setTokenState] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeout, setTimeoutState] = useState(false);
  const [showInteractiveWarning, setShowInteractiveWarningState] = useState(false);

  const setToken = useCallback((token: string) => {
    setTokenState(token);
    setError(null);
  }, []);

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  const setErrorCallback = useCallback((error: string | null) => {
    setError(error);
  }, []);

  const setTimeoutCallback = useCallback((timeout: boolean) => {
    setTimeoutState(timeout);
  }, []);

  const setShowInteractiveWarning = useCallback((show: boolean) => {
    setShowInteractiveWarningState(show);
  }, []);

  const reset = useCallback(() => {
    setTokenState(null);
    setError(null);
    setIsVisible(false);
    setTimeoutState(false);
    setShowInteractiveWarningState(false);
  }, []);

  return {
    token,
    isVisible,
    error,
    timeout,
    showInteractiveWarning,
    setToken,
    setVisible,
    setError: setErrorCallback,
    setTimeout: setTimeoutCallback,
    setShowInteractiveWarning,
    reset,
  };
}
