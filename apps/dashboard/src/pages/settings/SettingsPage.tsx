import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Users, Settings, Plus, Edit3, Trash2, Shield, ShieldCheck, Eye,
  Key, AlertTriangle, CheckCircle2, Lock, UserPlus,
} from 'lucide-react'
import { api as apiClient } from '@/lib/api'

// ── Role definitions ────────────────────────────────────────
interface RoleDef {
  value: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: any
  description: string
  permissions: string[]
}

const ROLES: RoleDef[] = [
  {
    value: 'admin', label: 'Administrador', color: 'text-[#3B82F6]', bgColor: 'bg-[#3B82F6]/10',
    borderColor: 'border-[#3B82F6]/30', icon: ShieldCheck,
    description: 'Acceso total: usuarios, configuración, pentest, reportes, costos y seguridad.',
    permissions: ['Ver dashboard', 'Ver eventos', 'Ver costos', 'Ver informes', 'Generar informes', 'Pentest', 'Gestionar usuarios', 'Configuración', 'Refrescar datos'],
  },
  {
    value: 'analyst', label: 'Analista', color: 'text-[#1E90FF]', bgColor: 'bg-[#1E90FF]/10',
    borderColor: 'border-[#1E90FF]/30', icon: Shield,
    description: 'Puede ver todo, ejecutar pentest y generar reportes. No gestiona usuarios ni configuración.',
    permissions: ['Ver dashboard', 'Ver eventos', 'Ver costos', 'Ver informes', 'Generar informes', 'Pentest', 'Refrescar datos'],
  },
  {
    value: 'viewer', label: 'Visualizador', color: 'text-[#00E5FF]', bgColor: 'bg-[#00E5FF]/10',
    borderColor: 'border-[#00E5FF]/30', icon: Eye,
    description: 'Solo lectura: puede ver dashboards, eventos, costos e informes.',
    permissions: ['Ver dashboard', 'Ver eventos', 'Ver costos', 'Ver informes'],
  },
]

const roleMap: Record<string, RoleDef> = Object.fromEntries(ROLES.map(r => [r.value, r]))

interface AppUser {
  id: string
  name: string
  email: string
  username?: string
  role: string
}

export function SettingsPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('viewer')

  // Password change
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  // Get current user from JWT
  const [currentUser, setCurrentUser] = useState<any>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users')
      const data = res.data
      if (data?.users) setUsers(data.users)
      else if (Array.isArray(data)) setUsers(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me')
      setCurrentUser(res.data?.user || res.data)
    } catch { /* silent */ }
  }

  useEffect(() => { fetchUsers(); fetchMe() }, [])

  // ── User CRUD ──────────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null)
    setFormName(''); setFormUsername(''); setFormEmail(''); setFormPassword(''); setFormRole('viewer')
    setUserModalOpen(true)
  }

  const openEdit = (user: AppUser) => {
    setEditingUser(user)
    setFormName(user.name); setFormUsername(user.username || ''); setFormEmail(user.email)
    setFormPassword(''); setFormRole(user.role)
    setUserModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!formName.trim() || !formEmail.trim() || !formUsername.trim()) {
      toast.error('Nombre, username y email son obligatorios'); return
    }
    try {
      if (editingUser) {
        const body: any = { name: formName, email: formEmail, role: formRole }
        if (formPassword.trim()) body.password = formPassword
        await api.patch('/users/' + editingUser.id, body)
        toast.success('Usuario actualizado')
      } else {
        if (!formPassword.trim()) { toast.error('Contraseña obligatoria para nuevos usuarios'); return }
        await api.post('/users', { name: formName, username: formUsername, email: formEmail, password: formPassword, role: formRole })
        toast.success('Usuario creado')
      }
      setUserModalOpen(false); fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Error al guardar')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    try {
      await api.delete('/users/' + deleteUser.id)
      toast.success('Usuario eliminado'); setDeleteUser(null); fetchUsers()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error al eliminar') }
  }

  // ── Password change ────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) return toast.error('Completa todos los campos')
    if (newPwd.length < 8) return toast.error('Mínimo 8 caracteres')
    if (newPwd !== confirmPwd) return toast.error('Las contraseñas no coinciden')
    if (currentPwd === newPwd) return toast.error('La nueva contraseña debe ser diferente')
    setChangingPwd(true)
    try {
      await api.post('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd })
      toast.success('Contraseña actualizada correctamente')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña')
    } finally { setChangingPwd(false) }
  }

  const pwdStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
    if (/\d/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 2) return { level: 1, label: 'Débil', color: '#FF4444' }
    if (score <= 3) return { level: 2, label: 'Media', color: '#FFD700' }
    return { level: 3, label: 'Fuerte', color: '#00FF88' }
  }

  const strength = pwdStrength(newPwd)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// CONFIGURACIÓN</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">Administra usuarios, permisos y preferencias</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="users" className="gap-2 text-xs"><Users className="h-4 w-4" /> Usuarios</TabsTrigger>
          <TabsTrigger value="password" className="gap-2 text-xs"><Key className="h-4 w-4" /> Contraseña</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 text-xs"><Shield className="h-4 w-4" /> Permisos</TabsTrigger>
          <TabsTrigger value="general" className="gap-2 text-xs"><Settings className="h-4 w-4" /> General</TabsTrigger>
        </TabsList>

        {/* ─── TAB: USERS ─────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-display text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-4 w-4" /> Usuarios del Sistema
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Gestiona quién tiene acceso al dashboard</CardDescription>
                </div>
                <Button onClick={openCreate} size="sm" className="gap-2 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30 hover:bg-[#3B82F6]/20">
                  <UserPlus className="h-4 w-4" /> Nuevo usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No hay usuarios</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5">
                        <TableHead className="font-display text-[10px] uppercase tracking-wider">Nombre</TableHead>
                        <TableHead className="font-display text-[10px] uppercase tracking-wider">Username</TableHead>
                        <TableHead className="font-display text-[10px] uppercase tracking-wider">Email</TableHead>
                        <TableHead className="font-display text-[10px] uppercase tracking-wider">Rol</TableHead>
                        <TableHead className="text-right font-display text-[10px] uppercase tracking-wider">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const role = roleMap[user.role] || roleMap.viewer
                        const RoleIcon = role.icon
                        return (
                          <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.02]">
                            <TableCell className="font-medium text-sm">{user.name}</TableCell>
                            <TableCell className="text-xs font-mono text-[#00E5FF]">{user.username || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] font-display gap-1 ${role.bgColor} ${role.color} ${role.borderColor}`}>
                                <RoleIcon className="h-3 w-3" /> {role.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#00E5FF]" onClick={() => openEdit(user)}>
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#FF4444] hover:bg-[#FF4444]/10" onClick={() => setDeleteUser(user)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: PASSWORD ──────────────────────── */}
        <TabsContent value="password" className="mt-4">
          <Card className="glass-card max-w-lg border-[#FFD700]/10">
            <CardHeader>
              <CardTitle className="text-xs font-display text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
                <Lock className="h-4 w-4" /> Cambiar Contraseña
              </CardTitle>
              <CardDescription className="text-xs">
                {currentUser ? `Usuario: ${currentUser.username || currentUser.email}` : 'Actualiza tu contraseña de acceso'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Contraseña actual</Label>
                <Input type="password" placeholder="Ingresa tu contraseña actual" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                  className="bg-white/[0.03] border-white/10 font-mono" />
              </div>
              <Separator className="bg-white/5" />
              <div className="space-y-2">
                <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Nueva contraseña</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  className="bg-white/[0.03] border-white/10 font-mono" />
                {newPwd && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= strength.level ? strength.color : 'rgba(255,255,255,0.05)' }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-mono" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Confirmar contraseña</Label>
                <Input type="password" placeholder="Repite la nueva contraseña" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  className="bg-white/[0.03] border-white/10 font-mono" />
                {confirmPwd && confirmPwd !== newPwd && (
                  <p className="text-[10px] text-[#FF4444] font-mono">Las contraseñas no coinciden</p>
                )}
              </div>
              <Button onClick={handleChangePassword} disabled={changingPwd || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
                className="w-full gap-2 bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/20">
                {changingPwd ? <><Key className="h-4 w-4 animate-spin" /> Actualizando...</> : <><Key className="h-4 w-4" /> Actualizar contraseña</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: PERMISSIONS ───────────────────── */}
        <TabsContent value="roles" className="mt-4">
          <div className="space-y-4">
            {ROLES.map((role) => {
              const RoleIcon = role.icon
              const userCount = users.filter(u => u.role === role.value).length
              return (
                <Card key={role.value} className="glass-card border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${role.bgColor} flex items-center justify-center`}>
                          <RoleIcon className={`h-5 w-5 ${role.color}`} />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold font-display ${role.color}`}>{role.label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{userCount} usuario(s)</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {role.permissions.map((perm) => (
                        <span key={perm} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground bg-white/[0.02]">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── TAB: GENERAL ──────────────────────── */}
        <TabsContent value="general" className="mt-4">
          <Card className="glass-card max-w-lg border-white/5">
            <CardHeader>
              <CardTitle className="text-xs font-display text-[#00E5FF] uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4" /> Preferencias Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Organización</p>
                <p className="text-sm font-medium mt-1">Treda Solutions</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Zona Horaria</p>
                <p className="text-sm font-medium mt-1">America/Bogota (COT)</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Versión</p>
                <p className="text-sm font-mono mt-1">Dashboard Treda v2.0 — Cyberpunk Edition</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── CREATE/EDIT USER DIALOG ────────────── */}
      <Dialog open={userModalOpen} onOpenChange={(open) => !open && setUserModalOpen(false)}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {editingUser ? <Edit3 className="h-5 w-5 text-[#00E5FF]" /> : <UserPlus className="h-5 w-5 text-[#3B82F6]" />}
              {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingUser ? 'Modifica los datos del usuario' : 'Completa los campos para crear un usuario'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Nombre completo</Label>
              <Input placeholder="Juan Pérez" value={formName} onChange={e => setFormName(e.target.value)} className="bg-white/[0.03] border-white/10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Username</Label>
              <Input placeholder="juanperez" value={formUsername} onChange={e => setFormUsername(e.target.value)} className="bg-white/[0.03] border-white/10 font-mono" disabled={!!editingUser} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" placeholder="juan@treda.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="bg-white/[0.03] border-white/10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Contraseña</Label>
              <Input type="password" placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'} value={formPassword} onChange={e => setFormPassword(e.target.value)} className="bg-white/[0.03] border-white/10 font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-display uppercase tracking-wider text-muted-foreground">Rol</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="bg-white/[0.03] border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <span className="flex items-center gap-2">
                        <r.icon className={`h-3.5 w-3.5 ${r.color}`} />
                        {r.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Role description */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 mt-1">
                <p className="text-[10px] text-muted-foreground">{roleMap[formRole]?.description}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setUserModalOpen(false)} className="border-white/10">Cancelar</Button>
            <Button size="sm" onClick={handleSaveUser} className="bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30 hover:bg-[#3B82F6]/20">
              {editingUser ? 'Guardar' : 'Crear usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION ─────────────────── */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#FF4444]" /> Eliminar usuario
            </DialogTitle>
            <DialogDescription className="text-xs">
              ¿Eliminar a <strong className="text-[#FF4444]">{deleteUser?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteUser(null)} className="border-white/10">Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteUser}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
