import { useEffect, useState } from 'react';

export function useMarginPreview(payload: Record<string, any> | null) {
  const [requiredMargin, setRequiredMargin] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!payload?.instrumentToken || !payload?.symbol || !payload?.side || !payload?.quantity || !payload.orderType) {
      setRequiredMargin(0);
      return;
    }

    const controller = new AbortController();
    
    async function fetchMargin() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/trading/margin-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch margin');
        }
        
        const data = await response.json();
        setRequiredMargin(data.requiredMargin);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setRequiredMargin(0);
        }
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce the call
    const timer = setTimeout(fetchMargin, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    payload?.instrumentToken,
    payload?.symbol,
    payload?.side,
    payload?.quantity,
    payload?.orderType,
    payload?.limitPrice,
    payload?.productType,
    payload?.leverage
  ]);

  return { requiredMargin, isLoading, error };
}
