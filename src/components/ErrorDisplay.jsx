import { useError } from '@/context/ErrorContext';
import { ErrorType } from '@/services/api';

// Toast/notification para errores globales
export function ErrorToast() {
  const { errors, dismissError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {errors.map(error => (
        <ErrorNotification key={error.id} error={error} onDismiss={() => dismissError(error.id)} />
      ))}
    </div>
  );
}

function ErrorNotification({ error, onDismiss }) {
  const iconMap = {
    [ErrorType.NETWORK]: '🌐',
    [ErrorType.TIMEOUT]: '⏱️',
    [ErrorType.SERVER]: '🔴',
    [ErrorType.CLIENT]: '⚠️',
    [ErrorType.PARSE]: '📄',
    [ErrorType.UNKNOWN]: '❓',
  };

  const colorMap = {
    [ErrorType.NETWORK]: 'border-red-500/40 bg-red-500/10',
    [ErrorType.TIMEOUT]: 'border-orange-500/40 bg-orange-500/10',
    [ErrorType.SERVER]: 'border-red-500/40 bg-red-500/10',
    [ErrorType.CLIENT]: 'border-yellow-500/40 bg-yellow-500/10',
    [ErrorType.PARSE]: 'border-purple-500/40 bg-purple-500/10',
    [ErrorType.UNKNOWN]: 'border-gray-500/40 bg-gray-500/10',
  };

  const timeAgo = getTimeAgo(error.timestamp);

  return (
    <div className={`border rounded-lg p-3 shadow-lg backdrop-blur-sm animate-slide-in ${colorMap[error.type] || colorMap[ErrorType.UNKNOWN]}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{iconMap[error.type] || '❓'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-text-0 mb-0.5">
            {getErrorTitle(error.type)}
          </div>
          <div className="text-[11px] text-text-2 leading-relaxed break-words">
            {error.message}
          </div>
          <div className="text-[9px] text-text-3 mt-1">{timeAgo}</div>
        </div>
        <button
          className="text-text-3 hover:text-text-1 text-xs shrink-0 leading-none"
          onClick={onDismiss}
          title="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function getErrorTitle(type) {
  switch (type) {
    case ErrorType.NETWORK: return 'Error de conexión';
    case ErrorType.TIMEOUT: return 'Tiempo agotado';
    case ErrorType.SERVER: return 'Error del servidor';
    case ErrorType.CLIENT: return 'Error de solicitud';
    case ErrorType.PARSE: return 'Error de formato';
    default: return 'Error';
  }
}

function getTimeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 5) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;
  return `Hace ${Math.floor(minutes / 60)}h`;
}

// Componente de error inline para usar dentro de páginas/secciones
export function ErrorMessage({ error, onRetry, compact = false }) {
  if (!error) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-red-500/8 border border-red-500/20 rounded-md text-xs text-red-400">
        <span>⚠️</span>
        <span className="flex-1">{error}</span>
        {onRetry && (
          <button className="btn btn-ghost btn-xs text-red-400 hover:text-red-300" onClick={onRetry}>
            🔄 Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-4xl mb-3 opacity-60">⚠️</div>
      <h3 className="text-sm font-semibold text-text-1 mb-1">Error al cargar datos</h3>
      <p className="text-xs text-text-3 mb-4 max-w-xs">{error}</p>
      {onRetry && (
        <button className="btn btn-primary btn-sm" onClick={onRetry}>
          🔄 Reintentar
        </button>
      )}
    </div>
  );
}

// Banner de error de conexión (full-width, para cuando no hay conexión al servidor)
export function ConnectionBanner({ onRetry }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-center gap-3">
      <span className="text-2xl">🔌</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-red-400">Sin conexión al servidor</div>
        <div className="text-xs text-text-3 mt-0.5">
          No se puede comunicar con el backend. Verifica que el servidor esté corriendo.
        </div>
      </div>
      {onRetry && (
        <button className="btn btn-primary btn-sm shrink-0" onClick={onRetry}>
          🔄 Reintentar
        </button>
      )}
    </div>
  );
}
