import { useState, useCallback } from 'react';

// ── Validadores reutilizables ──
export const validators = {
  required: (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return 'Este campo es requerido';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null; // solo validar si hay valor (usar con required si es obligatorio)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(String(value).trim())) {
      return 'Formato de email invalido (ej: usuario@dominio.com)';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (String(value).trim().length < min) {
      return `Minimo ${min} caracteres (actual: ${String(value).trim().length})`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (String(value).trim().length > max) {
      return `Maximo ${max} caracteres (actual: ${String(value).trim().length})`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(String(value).trim())) {
      return message || 'Formato invalido';
    }
    return null;
  },

  // AWS Access Key: empieza con AKIA (20 chars) o ASIA (temporary)
  awsAccessKey: (value) => {
    if (!value) return null;
    const v = String(value).trim();
    if (!/^(AKIA|ASIA)[A-Z0-9]{16}$/.test(v)) {
      return 'Access Key invalida: debe empezar con AKIA o ASIA y tener 20 caracteres alfanumericos';
    }
    return null;
  },

  // AWS Secret Key: 40 chars base64
  awsSecretKey: (value) => {
    if (!value) return null;
    const v = String(value).trim();
    if (v.length < 20) {
      return 'Secret Access Key muy corta (minimo 20 caracteres)';
    }
    return null;
  },

  // AWS region formato
  awsRegion: (value) => {
    if (!value) return null;
    const v = String(value).trim();
    if (!/^[a-z]{2}-[a-z]+-\d+$/.test(v)) {
      return 'Region AWS invalida (ej: us-east-1, eu-west-2)';
    }
    return null;
  },

  // UUID formato (para tenant_id, client_id de Azure)
  uuid: (value) => {
    if (!value) return null;
    const v = String(value).trim();
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)) {
      return 'UUID invalido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)';
    }
    return null;
  },

  // Azure Client Secret: minimo 32 chars
  azureClientSecret: (value) => {
    if (!value) return null;
    const v = String(value).trim();
    if (v.length < 8) {
      return 'Client Secret muy corta (minimo 8 caracteres)';
    }
    return null;
  },

  // Combinador: ejecuta multiples validadores en orden
  all: (...validators) => (value) => {
    for (const fn of validators) {
      const err = fn(value);
      if (err) return err;
    }
    return null;
  },
};

// ── Hook principal ──
export function useFormValidation(schema) {
  // schema: { campo: [validadorFn, ...] }
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validar un solo campo
  const validateField = useCallback((name, value) => {
    const fieldValidators = schema[name];
    if (!fieldValidators || fieldValidators.length === 0) return null;

    for (const fn of fieldValidators) {
      const err = fn(value);
      if (err) return err;
    }
    return null;
  }, [schema]);

  // Validar todos los campos de un formulario
  const validateAll = useCallback((formData) => {
    const newErrors = {};
    let isValid = true;

    for (const name of Object.keys(schema)) {
      const err = validateField(name, formData[name]);
      if (err) {
        newErrors[name] = err;
        isValid = false;
      }
    }

    setErrors(newErrors);
    // Marcar todos como touched al intentar submit
    const allTouched = {};
    for (const name of Object.keys(schema)) {
      allTouched[name] = true;
    }
    setTouched(allTouched);

    return isValid;
  }, [schema, validateField]);

  // Marcar campo como touched y validar onBlur
  const touchField = useCallback((name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  }, [validateField]);

  // Limpiar errores
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  // Limpiar error de un campo
  const clearFieldError = useCallback((name) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    touchField,
    clearErrors,
    clearFieldError,
    isValid: Object.keys(errors).length === 0,
  };
}
