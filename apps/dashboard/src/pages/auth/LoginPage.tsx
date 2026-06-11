import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Shield, Eye, EyeOff, KeyRound } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload: any = { username, password }
      if (mfaRequired && mfaCode) {
        payload.mfaCode = mfaCode
      }

      const res = await api.post('/auth/login', payload)
      const { token, user } = res.data
      setAuth(user, token)
      toast.success('Inicio de sesión exitoso')
      navigate('/dashboard')
    } catch (err: any) {
      const data = err.response?.data
      if (data?.mfaRequired) {
        setMfaRequired(true)
        toast.info('Código MFA requerido')
      } else {
        toast.error(data?.error || 'Error al iniciar sesión')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center login-bg bg-gradient-to-br from-slate-950 via-[#150f23] to-[#1f1633] p-4">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl gradient-brand mx-auto flex items-center justify-center shadow-lg shadow-primary/20 mb-4 glow-purple">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-animated font-display">Dashboard Treda</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm">Dashboard Unificado Multi-Cloud</p>
        </div>

        <Card className="glass-card border-neon-cyan/10">
          <CardHeader>
            <CardTitle className="font-display tracking-wider">
              {mfaRequired ? (
                <span className="flex items-center gap-2 text-neon-yellow">
                  <KeyRound className="h-5 w-5" />
                  Verificación MFA
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {mfaRequired
                ? 'Ingresa el código de tu aplicador de autenticación'
                : 'Ingresa tus credenciales para continuar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!mfaRequired ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-display uppercase tracking-wider">Usuario</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      className="bg-muted/50 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-display uppercase tracking-wider">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-muted/50 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-cyan transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="mfaCode" className="text-xs font-display uppercase tracking-wider text-neon-yellow">
                    Código MFA (6 dígitos)
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="bg-muted/50 font-mono text-center text-2xl tracking-[0.5em] border-neon-yellow/30 focus:border-neon-yellow"
                  />
                  <button
                    type="button"
                    onClick={() => { setMfaRequired(false); setMfaCode('') }}
                    className="text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
                  >
                    ← Volver al login
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gradient font-display tracking-wider uppercase"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner" /> {mfaRequired ? 'Verificando...' : 'Ingresando...'}
                  </span>
                ) : (
                  mfaRequired ? 'Verificar Código' : 'Ingresar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 font-mono">
          Treda Solutions © 2026 — Seguridad Cloud
        </p>
      </div>
    </div>
  )
}
