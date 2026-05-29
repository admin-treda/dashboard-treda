import { createContext, useContext, useState, useCallback } from 'react';
import { ErrorType } from '@/services/api';

const ErrorContext = createContext(null);

// Provider global para manejo de errores
// Permite que cualquier componente registre errores y se muestren de forma centralizada
export function ErrorProvider({ children }) {
  const [errors, setErrors] = useState([]);

  const addError = useCallback((error) => {
    const id = Date.now() + Math.random();
    const newError = {
      id,
      message: error.message || 'Error desconocido',
      type: error.errorType || ErrorType.UNKNOWN,
      timestamp: new Date(),
      dismissed: false,
      ...error,
    };

    setErrors(prev => {
      // Limitar a 5 errores visibles para no saturar
      const filtered = prev.length >= 5 ? prev.slice(1) : prev;
      return [...filtered, newError];
    });

    // Auto-dismiss después de 10 segundos para errores no críticos
    if (newError.type !== ErrorType.SERVER && newError.type !== ErrorType.NETWORK) {
      setTimeout(() => {
        dismissError(id);
      }, 10000);
    }

    return id;
  }, []);

  const dismissError = useCallback((id) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const hasCriticalError = errors.some(
    e => !e.dismissed && (e.type === ErrorType.NETWORK || e.type === ErrorType.SERVER)
  );

  return (
    <ErrorContext.Provider value={{ errors, addError, dismissError, clearErrors, hasCriticalError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError debe usarse dentro de ErrorProvider');
  }
  return context;
}
