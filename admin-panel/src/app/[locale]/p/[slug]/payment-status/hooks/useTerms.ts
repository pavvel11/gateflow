import { useState, useCallback } from 'react';

interface TermsState {
  accepted: boolean;
  visible: boolean;
}

export function useTerms(): TermsState & {
  acceptTerms: () => void;
  setVisible: (visible: boolean) => void;
} {
  const [accepted, setAccepted] = useState(false);
  const [visible, setVisible] = useState(false);

  const acceptTerms = useCallback(() => {
    setAccepted(true);
    setVisible(false);
  }, []);

  const setVisibleCallback = useCallback((visible: boolean) => {
    setVisible(visible);
  }, []);

  return {
    accepted,
    visible,
    acceptTerms,
    setVisible: setVisibleCallback,
  };
}
