import { useState, useEffect } from 'react';

// ── Componente FormField reutilizable con validacion visual ──
export function FormField({
  label,
  name,
  value,
  error,
  touched,
  required,
  type = 'text',
  placeholder,
  helpText,
  onChange,
  onBlur,
  children, // para inputs custom (select, textarea)
  disabled,
}) {
  const showError = touched && error;
  const inputClass = `form-input ${showError ? 'input-error' : ''}`;

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children ? (
        <div className={`${inputClass} p-0 bg-transparent border-0`}>
          {children}
        </div>
      ) : (
        <input
          type={type}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(name, e.target.value) : undefined}
          onBlur={onBlur ? () => onBlur(name, value) : undefined}
          disabled={disabled}
        />
      )}
      {showError && (
        <div className="form-error">
          {error}
        </div>
      )}
      {!showError && helpText && (
        <div className="form-help">
          {helpText}
        </div>
      )}
    </div>
  );
}

// ── Componente FormField para Select ──
export function FormSelect({
  label,
  name,
  value,
  error,
  touched,
  required,
  options,
  placeholder,
  helpText,
  onChange,
  onBlur,
  disabled,
}) {
  const showError = touched && error;
  const selectClass = `form-select ${showError ? 'input-error' : ''}`;

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        className={selectClass}
        value={value}
        onChange={onChange ? (e) => onChange(name, e.target.value) : undefined}
        onBlur={onBlur ? () => onBlur(name, value) : undefined}
        disabled={disabled}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {showError && (
        <div className="form-error">
          {error}
        </div>
      )}
      {!showError && helpText && (
        <div className="form-help">
          {helpText}
        </div>
      )}
    </div>
  );
}
