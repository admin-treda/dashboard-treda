import { useState, useEffect, useCallback, useRef } from 'react';

// Hook para llamadas API con loading/error state y retry automático
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (!mountedRef.current) return;
      if (result.success !== false) {
        setData(result.data || result);
      } else {
        setError(result.error || 'Error desconocido');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e.message || 'Error inesperado');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para polling automático
export function usePolling(fn, interval = 60000, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const result = await fn();
      if (!mountedRef.current) return;
      if (result.success !== false) {
        setData(result.data || result);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para reloj en tiempo real (Colombia)
export function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}
