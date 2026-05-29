import { useState, useEffect, useRef, useCallback } from 'react';

const INITIAL_INTERVAL = 60000; // 60s
const MAX_INTERVAL = 300000; // 300s
const MAX_RETRIES = 5;

function calcNextInterval(current) {
  const next = current * 2;
  return next > MAX_INTERVAL ? MAX_INTERVAL : next;
}

export function usePollingWithBackoff(fetchFn, options = {}) {
  const {
    initialInterval = INITIAL_INTERVAL,
    maxRetries = MAX_RETRIES,
    enabled = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(initialInterval);

  const intervalRef = useRef(initialInterval);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const doFetch = useCallback(async (isManualRetry = false) => {
    if (!mountedRef.current) return;

    if (isManualRetry) {
      retryRef.current = 0;
      intervalRef.current = initialInterval;
      setRetryCount(0);
      setCurrentInterval(initialInterval);
      setIsPaused(false);
      setIsOffline(false);
      setError(null);
    }

    try {
      setLoading(true);
      const result = await fetchFnRef.current();
      if (!mountedRef.current) return;

      setData(result);
      setError(null);

      // Reset backoff on success
      retryRef.current = 0;
      intervalRef.current = initialInterval;
      setRetryCount(0);
      setCurrentInterval(initialInterval);
      setIsOffline(false);
      setIsPaused(false);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e);
      setIsOffline(true);

      const newRetry = retryRef.current + 1;
      retryRef.current = newRetry;
      setRetryCount(newRetry);

      if (newRetry >= maxRetries) {
        setIsPaused(true);
        return; // Don't schedule next poll
      }

      intervalRef.current = calcNextInterval(intervalRef.current);
      setCurrentInterval(intervalRef.current);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [initialInterval, maxRetries]);

  const retry = useCallback(() => {
    clearTimer();
    doFetch(true);
  }, [clearTimer, doFetch]);

  // Start/restart polling when enabled changes
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      clearTimer();
      return;
    }

    // Initial fetch
    doFetch();

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [enabled, clearTimer, doFetch]);

  // Schedule next poll after each fetch completes
  useEffect(() => {
    if (!enabled || isPaused || loading) return;

    clearTimer();

    const scheduleNext = () => {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current && !isPaused) {
          doFetch();
        }
      }, intervalRef.current);
    };

    scheduleNext();

    return clearTimer;
  }, [enabled, isPaused, loading, currentInterval, clearTimer, doFetch]);

  return {
    data,
    loading,
    error,
    isOffline,
    isPaused,
    retryCount,
    currentInterval,
    retry,
  };
}
