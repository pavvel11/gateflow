import { useState, useCallback } from 'react';

interface TermsState {
  accepted: boolean;
  visible: boolean;
  alreadyHandled: boolean;
}

export function useTerms(initialHandled: boolean = false): TermsState & {
  acceptTerms: () => void;
  setVisible: (visible: boolean) => void;
  setAlreadyHandled: (handled: boolean) => void;
} {
  const [accepted, setAccepted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [alreadyHandled, setAlreadyHandled] = useState(initialHandled);

  const acceptTerms = useCallback(() => {
    setAccepted(true);
    setVisible(false);
  }, []);

  const setVisibleCallback = useCallback((visible: boolean) => {
    setVisible(visible);
  }, []);

  const setAlreadyHandledCallback = useCallback((handled: boolean) => {
    setAlreadyHandled(handled);
  }, []);

  return {
    accepted,
    visible,
    alreadyHandled,
    acceptTerms,
    setVisible: setVisibleCallback,
    setAlreadyHandled: setAlreadyHandledCallback,
  };
}
