import { useState } from 'react';
import { usePolling } from '@/hooks/useApi';
import { api } from '@/services/api';
import { Topbar } from '@/components/Layout';
import { Spinner, EmptyState, StatusIndicator } from '@/components/ui';
import { fmtDate } from '@/utils/format';
import { useToast } from '@/hooks/useToast';
import { BellIcon, PlusIcon, XIcon, TrashIcon } from '@/components/icons';

const SMTP_PROVIDERS = [
  { value: 'smtp', label: 'SMTP Tradicional' },
  { value: 'google-relay', label: 'Google SMTP Relay' },
];

export function NotificacionesPage() {
  const { data: notifs } = usePolling(api.notificaciones, 60000);
  const { data: historial } = usePolling(api.historialNotif, 60000);
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    canal: 'telegram',
    proveedor_smtp: 'smtp',
    bot_token: '',
    chat_id: '',
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from_email: '',
    to_email: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let credenciales;
      if (form.canal === 'telegram') {
        if (!form.bot_token || !form.chat_id) throw new Error('Bot Token y Chat ID son requeridos');
        credenciales = { bot_token: form.bot_token.trim(), chat_id: form.chat_id.trim() };
      } else {
        if (!form.from_email || !form.to_email) throw new Error('Email origen y destino son requeridos');
        if (form.proveedor_smtp === 'google-relay') {
          credenciales = {
            service: 'google-relay',
            host: form.host || 'smtp-relay.gmail.com',
            port: parseInt(form.port) || 587,
            from_email: form.from_email.trim(),
            to_email: form.to_email.trim(),
          };
        } else {
          if (!form.host || !form.user || !form.pass) throw new Error('Host, usuario y contraseña son requeridos para SMTP tradicional');
          credenciales = {
            host: form.host.trim(),
            port: parseInt(form.port) || 587,
            secure: form.secure === true || form.secure === 'true',
            user: form.user.trim(),
            pass: form.pass.trim(),
            from_email: form.from_email.trim(),
            to_email: form.to_email.trim(),
          };
        }
      }
      await api.crearNotif({ canal: form.canal, credenciales });
      addToast('Canal de notificación creado correctamente', 'success');
      setShowForm(false);
      setForm({ canal: 'telegram', proveedor_smtp: 'smtp', bot_token: '', chat_id: '', host: '', port: '587', secure: false, user: '', pass: '', from_email: '', to_email: '' });
    } catch (e) {
      addToast('Error al crear canal: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este canal?')) return;
    try {
      await api.eliminarNotif(id);
      addToast('Canal eliminado correctamente', 'success');
    } catch (e) {
      addToast('Error al eliminar: ' + e.message, 'error');
    }
  };

  return (
    <div className="page active">
      <Topbar
        title={<><BellIcon size={16} /> Notificaciones</>}
        subtitle="Alertas inmediatas para eventos CRÍTICO y ALTO"
        rightContent={
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <><XIcon size={12} /> Cancelar</> : <><PlusIcon size={12} /> Agregar Canal</>}
          </button>
        }
      />

      {/* Formulario para agregar canal */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title"><PlusIcon size={14} /> Nuevo Canal de Notificación</div></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Selección de canal */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Tipo de Canal</label>
                <select className="form-select" value={form.canal} onChange={e => handleChange('canal', e.target.value)}>
                  <option value="telegram">Telegram Bot</option>
                  <option value="smtp">Correo SMTP</option>
                </select>
              </div>

              {/* Campos Telegram */}
              {form.canal === 'telegram' && (
                <>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Bot Token <span className="text-red-400">*</span></label>
                    <input className="form-input" type="text" value={form.bot_token} onChange={e => handleChange('bot_token', e.target.value)} placeholder="123456:ABC-DEF..." />
                    <span className="form-help">Obtenible desde @BotFather en Telegram</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Chat ID <span className="text-red-400">*</span></label>
                    <input className="form-input" type="text" value={form.chat_id} onChange={e => handleChange('chat_id', e.target.value)} placeholder="-1001234567890" />
                    <span className="form-help">ID del chat o grupo donde se enviarán las alertas</span>
                  </div>
                </>
              )}

              {/* Campos SMTP */}
              {form.canal === 'smtp' && (
                <>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Proveedor SMTP</label>
                    <select className="form-select" value={form.proveedor_smtp} onChange={e => handleChange('proveedor_smtp', e.target.value)}>
                      {SMTP_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  {form.proveedor_smtp === 'google-relay' ? (
                    <>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Email Origen (From) <span className="text-red-400">*</span></label>
                        <input className="form-input" type="email" value={form.from_email} onChange={e => handleChange('from_email', e.target.value)} placeholder="alertas@midominio.com" />
                        <span className="form-help">Debe ser un email verificado en Google Workspace</span>
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Email Destino (To) <span className="text-red-400">*</span></label>
                        <input className="form-input" type="email" value={form.to_email} onChange={e => handleChange('to_email', e.target.value)} placeholder="admin@midominio.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Host (opcional)</label>
                        <input className="form-input" type="text" value={form.host} onChange={e => handleChange('host', e.target.value)} placeholder="smtp-relay.gmail.com" />
                        <span className="form-help">Default: smtp-relay.gmail.com</span>
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Puerto (opcional)</label>
                        <input className="form-input" type="text" value={form.port} onChange={e => handleChange('port', e.target.value)} placeholder="587" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Host SMTP <span className="text-red-400">*</span></label>
                        <input className="form-input" type="text" value={form.host} onChange={e => handleChange('host', e.target.value)} placeholder="smtp.gmail.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Puerto</label>
                        <input className="form-input" type="text" value={form.port} onChange={e => handleChange('port', e.target.value)} placeholder="587" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Usuario <span className="text-red-400">*</span></label>
                        <input className="form-input" type="text" value={form.user} onChange={e => handleChange('user', e.target.value)} placeholder="tu@gmail.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Contraseña <span className="text-red-400">*</span></label>
                        <input className="form-input" type="password" value={form.pass} onChange={e => handleChange('pass', e.target.value)} placeholder="••••••••" />
                        <span className="form-help">Para Gmail: usar App Password (no la contraseña normal)</span>
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Email Origen (From) <span className="text-red-400">*</span></label>
                        <input className="form-input" type="email" value={form.from_email} onChange={e => handleChange('from_email', e.target.value)} placeholder="tu@gmail.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Email Destino (To) <span className="text-red-400">*</span></label>
                        <input className="form-input" type="email" value={form.to_email} onChange={e => handleChange('to_email', e.target.value)} placeholder="admin@empresa.com" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">
                          <input type="checkbox" checked={form.secure} onChange={e => handleChange('secure', e.target.checked)} style={{ marginRight: 6 }} />
                          Usar TLS/SSL (puerto 465)
                        </label>
                      </div>
                    </>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : '💾 Guardar Canal'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title"><BellIcon size={14} /> Canales Configurados</div></div>
          <div className="card-body">
            {(notifs?.data || []).length > 0 ? (notifs.data || []).map(c => (
              <div key={c.id} className="notif-card">
                <div className="notif-icon" style={{ background: c.canal === 'telegram' ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)' }}>
                  {c.canal === 'telegram' ? '📱' : '📧'}
                </div>
                <div className="notif-body">
                  <div className="notif-title">{c.canal === 'telegram' ? 'Telegram Bot' : 'Correo SMTP'}</div>
                  <div className="notif-sub"><StatusIndicator status={c.activo ? 'conectado' : 'error'} /> {c.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
                <button className="btn btn-danger btn-xs" onClick={() => handleDelete(c.id)}><TrashIcon size={10} /></button>
              </div>
            )) : <EmptyState icon={<BellIcon size={24} />} message="No hay canales configurados" />}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Historial de Envíos</div></div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {(historial?.data || []).length > 0 ? (historial.data || []).map(h => (
              <div key={h.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className={`badge ${h.estado === 'enviado' ? 'badge-green' : 'badge-red'}`}>{h.estado}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{fmtDate(h.fecha_envio)}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>
                  {h.canal}: {h.tipo_evento || 'N/A'} ({h.severidad || '—'})
                </div>
                {h.mensaje_error && <div style={{ fontSize: 9, color: 'var(--red)', marginTop: 2 }}>{h.mensaje_error}</div>}
              </div>
            )) : <EmptyState icon="📭" message="Sin historial de envíos" />}
          </div>
        </div>
      </div>
    </div>
  );
}
