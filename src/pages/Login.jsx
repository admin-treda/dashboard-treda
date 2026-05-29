import { useState } from 'react';
import { CloudIcon, LockIcon } from '@/components/icons';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.status === 401) {
        setError('Credenciales inválidas');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError('Error del servidor. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Guardar token y recargar para que App.jsx lo detecte
      localStorage.setItem('auth_token', data.token);
      window.location.reload();
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <CloudIcon size={32} />
          </div>
          <h1>Cloud Dashboard</h1>
          <p>Security & Cost Monitor</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <div className="login-field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <div className="login-field-icon">
              <LockIcon size={16} />
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading || !username || !password}>
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
