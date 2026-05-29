// Cliente API centralizado con retry automático y manejo de errores de red

const BASE = '/api';

// Cache en memoria para costos (TTL 5 minutos)
const cache = {
  costos: {},
  historico: {},
};

// Agregar token de autenticación a los headers
function getAuthHeaders() {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function isCacheValid(entry) {
  if (!entry || !entry.data) return false;
  return (Date.now() - entry.timestamp) < entry.ttl;
}

function invalidateCostosCache(cuentaId) {
  if (cuentaId) {
    delete cache.costos[cuentaId];
    delete cache.historico[cuentaId];
  } else {
    cache.costos = {};
    cache.historico = {};
  }
}

// Configuración de retry
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

export const ErrorType = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  SERVER: 'SERVER',
  CLIENT: 'CLIENT',
  PARSE: 'PARSE',
  UNKNOWN: 'UNKNOWN',
};

function classifyError(error, status) {
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return ErrorType.TIMEOUT;
  if (error instanceof TypeError && error.message === 'Failed to fetch') return ErrorType.NETWORK;
  if (status >= 500) return ErrorType.SERVER;
  if (status >= 400) return ErrorType.CLIENT;
  if (error instanceof SyntaxError) return ErrorType.PARSE;
  return ErrorType.UNKNOWN;
}

export function getFriendlyErrorMessage(errorType, status, detail) {
  switch (errorType) {
    case ErrorType.NETWORK:
      return 'Sin conexión al servidor. Verifica tu red o que el backend esté corriendo.';
    case ErrorType.TIMEOUT:
      return 'La solicitud tardó demasiado. El servidor puede estar ocupado. Reintentando...';
    case ErrorType.SERVER:
      if (status === 502) return 'El servidor no está disponible (Bad Gateway). Puede estar reiniciándose.';
      if (status === 503) return 'El servicio no está disponible temporalmente.';
      return `Error interno del servidor (${status}). Por favor intenta más tarde.`;
    case ErrorType.CLIENT:
      if (status === 401) return 'Sesión expirada. Recarga la página para continuar.';
      if (status === 403) return 'No tienes permiso para realizar esta acción.';
      if (status === 404) return 'El recurso solicitado no fue encontrado.';
      if (status === 429) return 'Demasiadas solicitudes. Espera un momento antes de reintentar.';
      return `Error en la solicitud (${status}). ${detail || ''}`;
    case ErrorType.PARSE:
      return 'El servidor respondió con un formato inesperado.';
    default:
      return detail || 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}

function getRetryDelay(attempt) {
  const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(100, delay + jitter);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Request con retry automático
async function request(endpoint, options = {}) {
  const { timeout = 30000, retry = true, retryConfig = RETRY_CONFIG, ...fetchOptions } = options;

  let lastError = null;
  let lastStatus = 0;
  const maxAttempts = retry ? retryConfig.maxRetries + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...fetchOptions.headers },
        signal: controller.signal,
        ...fetchOptions,
      });

      clearTimeout(timeoutId);

      // Si el status amerita retry y no es el último intento
      if (retryConfig.retryOnStatus.includes(res.status) && attempt < maxAttempts - 1) {
        const delay = getRetryDelay(attempt);
        await sleep(delay);
        lastStatus = res.status;
        continue;
      }

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        if (res.status !== 204) {
          throw new SyntaxError('Respuesta no es JSON válido');
        }
        data = { success: true };
      }

      if (!res.ok) {
        const errorType = classifyError(new Error(), res.status);
        const message = data.error || data.message || getFriendlyErrorMessage(errorType, res.status);
        return { success: false, error: message, errorType, status: res.status, data: null };
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      const errorType = classifyError(error, lastStatus);

      if (errorType === ErrorType.CLIENT && !retryConfig.retryOnStatus.includes(lastStatus)) {
        const message = getFriendlyErrorMessage(errorType, lastStatus, error.message);
        return { success: false, error: message, errorType, status: lastStatus, data: null };
      }

      if (attempt === maxAttempts - 1) {
        const message = getFriendlyErrorMessage(errorType, lastStatus, error.message);
        return { success: false, error: message, errorType, status: lastStatus, data: null };
      }

      const delay = getRetryDelay(attempt);
      await sleep(delay);
    }
  }

  return { success: false, error: 'Error desconocido después de reintentos', errorType: ErrorType.UNKNOWN, status: 0, data: null };
}

export const api = {
  health: () => request('/health'),
  dashboard: () => request('/dashboard/resumen'),

  cuentas: () => request('/cuentas'),
  crearCuenta: (data) => request('/cuentas', { method: 'POST', body: JSON.stringify(data) }),
  actualizarCuenta: (id, data) => request(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarCuenta: (id) => request(`/cuentas/${id}`, { method: 'DELETE' }),
  probarCuenta: (id) => request(`/cuentas/${id}/probar`, { method: 'POST' }),

  costos: (cuentaId, { useCache = true } = {}) => {
    if (useCache && isCacheValid(cache.costos[cuentaId])) {
      return Promise.resolve({ success: true, data: cache.costos[cuentaId].data, fromCache: true });
    }
    return request(`/costos/${cuentaId}`).then(r => {
      if (r.success !== false) {
        cache.costos[cuentaId] = { data: r.data || [], timestamp: Date.now(), ttl: 300000 };
      }
      return r;
    });
  },
  costosHistorico: (cuentaId, { useCache = true } = {}) => {
    if (useCache && isCacheValid(cache.historico[cuentaId])) {
      return Promise.resolve({ success: true, data: cache.historico[cuentaId].data, fromCache: true });
    }
    return request(`/costos/${cuentaId}/historico`).then(r => {
      if (r.success !== false) {
        cache.historico[cuentaId] = { data: r.data || [], timestamp: Date.now(), ttl: 300000 };
      }
      return r;
    });
  },
  syncCostos: (cuentaId) => {
    invalidateCostosCache(cuentaId);
    return request(`/sync/costos/${cuentaId}`, { method: 'POST' });
  },

  eventos: (params = {}) => {
    const q = new URLSearchParams({ limite: '200', ...params }).toString();
    return request(`/seguridad/eventos?${q}`);
  },
  seguridadResumen: () => request('/seguridad/resumen'),
  seguridadTendencia: (dias = 7) => request(`/seguridad/tendencia?dias=${dias}`),
  ultimaEvaluacion: () => request('/seguridad/ultima-evaluacion'),
  syncSeguridad: (cuentaId) => request(`/sync/seguridad/${cuentaId}`, { method: 'POST' }),

  notificaciones: () => request('/notificaciones'),
  crearNotif: (data) => request('/notificaciones', { method: 'POST', body: JSON.stringify(data) }),
  eliminarNotif: (id) => request(`/notificaciones/${id}`, { method: 'DELETE' }),
  historialNotif: () => request('/notificaciones/historial'),

  informeDiario: () => request('/informes/diario'),
  informeSemanal: () => request('/informes/semanal'),
  generarInformeDiario: () => request('/informes/diario/generar', { method: 'POST' }),
  generarInformeSemanal: () => request('/informes/semanal/generar', { method: 'POST' }),

  maintenanceStatus: () => request('/mantenimiento/estado'),
  cleanupEvents: (dias, maxTotal) => request('/mantenimiento/limpiar-eventos', {
    method: 'POST',
    body: JSON.stringify({ dias, max_total: maxTotal })
  }),

  auditLog: (limit = 100, offset = 0) => request(`/audit?limit=${limit}&offset=${offset}`),
};
