import { useState } from 'react';
import { api } from '@/services/api';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { FormField, FormSelect } from '@/components/FormField';

// Schema de validacion para el formulario de cuentas
const awsSchema = {
  nombre: [validators.required, validators.minLength(2)],
  access_key_id: [validators.required, validators.awsAccessKey],
  secret_access_key: [validators.required, validators.awsSecretKey],
  region: [validators.required, validators.awsRegion],
};

const azureSchema = {
  nombre: [validators.required, validators.minLength(2)],
  tenant_id: [validators.required, validators.uuid],
  client_id: [validators.required, validators.uuid],
  client_secret: [validators.required, validators.azureClientSecret],
};

export function CuentaModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    proveedor: 'aws',
    nombre: '',
    access_key_id: '',
    secret_access_key: '',
    region: 'us-east-1',
    tenant_id: '',
    client_id: '',
    client_secret: '',
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Seleccionar schema segun proveedor
  const schema = form.proveedor === 'aws' ? awsSchema : azureSchema;
  const { errors, touched, validateAll, touchField, clearErrors } = useFormValidation(schema);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (touched[key]) {
      // Re-validar en tiempo real si ya fue tocado
      setTimeout(() => touchField(key, value), 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validar todos los campos
    const isValid = validateAll(form);
    if (!isValid) return; // Los errores se muestran automaticamente

    setSaving(true);

    const credenciales = form.proveedor === 'aws'
      ? { access_key_id: form.access_key_id.trim(), secret_access_key: form.secret_access_key.trim() }
      : { tenant_id: form.tenant_id.trim(), client_id: form.client_id.trim(), client_secret: form.client_secret.trim() };

    try {
      const body = {
        proveedor: form.proveedor,
        nombre: form.nombre.trim(),
        credenciales,
        region: form.proveedor === 'aws' ? form.region.trim() : '',
      };
      await api.crearCuenta(body);
      onSave && onSave();
      onClose();
    } catch (e) {
      setSubmitError(e.message || 'Error al guardar la cuenta. Verifica los datos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const providerOptions = [
    { value: 'aws', label: 'AWS' },
    { value: 'azure_m365', label: 'Azure / Microsoft 365' },
  ];

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Agregar Cuenta Cloud</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="alert-box alert-error">
              {submitError}
            </div>
          )}

          <FormSelect
            label="Proveedor"
            name="proveedor"
            value={form.proveedor}
            options={providerOptions}
            onChange={(key, value) => {
              setForm(prev => ({ ...prev, [key]: value }));
              clearErrors(); // Limpiar errores al cambiar de proveedor
            }}
          />

          <FormField
            label="Nombre de la cuenta"
            name="nombre"
            value={form.nombre}
            error={errors.nombre}
            touched={touched.nombre}
            required
            placeholder="Ej: Produccion AWS"
            helpText="Un nombre descriptivo para identificar esta cuenta"
            onChange={handleChange}
            onBlur={touchField}
          />

          {form.proveedor === 'aws' ? (
            <>
              <FormField
                label="Access Key ID"
                name="access_key_id"
                value={form.access_key_id}
                error={errors.access_key_id}
                touched={touched.access_key_id}
                required
                placeholder="AKIAIOSFODNN7EXAMPLE"
                helpText="Se encuentra en IAM > Users > Security credentials"
                onChange={handleChange}
                onBlur={touchField}
              />
              <FormField
                label="Secret Access Key"
                name="secret_access_key"
                type="password"
                value={form.secret_access_key}
                error={errors.secret_access_key}
                touched={touched.secret_access_key}
                required
                placeholder="••••••••••••••••"
                helpText="Se muestra solo al crear la key. Guardala en un lugar seguro."
                onChange={handleChange}
                onBlur={touchField}
              />
              <FormField
                label="Region"
                name="region"
                value={form.region}
                error={errors.region}
                touched={touched.region}
                required
                placeholder="us-east-1"
                helpText="Ej: us-east-1, eu-west-1, sa-east-1"
                onChange={handleChange}
                onBlur={touchField}
              />
            </>
          ) : (
            <>
              <FormField
                label="Tenant ID"
                name="tenant_id"
                value={form.tenant_id}
                error={errors.tenant_id}
                touched={touched.tenant_id}
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                helpText="Azure Active Directory > Properties > Tenant ID"
                onChange={handleChange}
                onBlur={touchField}
              />
              <FormField
                label="Client ID (Application ID)"
                name="client_id"
                value={form.client_id}
                error={errors.client_id}
                touched={touched.client_id}
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                helpText="Azure AD > App registrations > Application (client) ID"
                onChange={handleChange}
                onBlur={touchField}
              />
              <FormField
                label="Client Secret"
                name="client_secret"
                type="password"
                value={form.client_secret}
                error={errors.client_secret}
                touched={touched.client_secret}
                required
                placeholder="••••••••••••••••"
                helpText="Azure AD > App registrations > Certificates & secrets"
                onChange={handleChange}
                onBlur={touchField}
              />
            </>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
