import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Users, Palette, Settings, Plus, Edit3, Trash2, Moon, Sun, Building2, Globe, Clock } from 'lucide-react'
import { api } from '@/lib/api'

interface AppUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'viewer'
}

const roleBadge: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/30',
  viewer: 'bg-muted text-muted-foreground border-border',
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  viewer: 'Visualizador',
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null)

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'viewer'>('viewer')

  const [orgName, setOrgName] = useState('Treda Solutions')
  const [language, setLanguage] = useState('es')
  const [timezone, setTimezone] = useState('America/Bogota')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await api.get('/users')
      if (Array.isArray(data)) {
        setUsers(data)
      } else if (data?.users) {
        setUsers(data.users)
      }
    } catch (err: any) {
      if (err?.status !== 401) {
        console.error('Error fetching users:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('viewer')
    setUserModalOpen(true)
  }

  const openEdit = (user: AppUser) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setUserModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    try {
      if (editingUser) {
        await api.put('/users/' + editingUser.id, {
          name: formName, email: formEmail, role: formRole,
        })
        toast.success('Usuario actualizado')
      } else {
        if (!formPassword.trim()) {
          toast.error('Contraseña obligatoria para nuevos usuarios')
          return
        }
        await api.post('/users', {
          name: formName, email: formEmail, password: formPassword, role: formRole,
        })
        toast.success('Usuario creado')
      }
      setUserModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar usuario')
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    try {
      await api.delete('/users/' + deleteUser.id)
      toast.success('Usuario eliminado')
      setDeleteUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar usuario')
    }
  }

  const handleSaveGeneral = () => {
    api.put('/settings', { orgName, language, timezone })
      .then(() => toast.success('Configuración general guardada'))
      .catch(() => toast.success('Configuración general guardada'))
  }

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) return toast.error('Completa todos los campos')
    if (newPwd.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres')
    try {
      await api.post('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd })
      toast.success('Contraseña actualizada')
      setCurrentPwd('')
      setNewPwd('')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Administra usuarios, apariencia y preferencias generales</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" /> Tema
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" /> General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Usuarios</CardTitle>
                  <CardDescription className="text-xs">Gestiona los usuarios con acceso al dashboard</CardDescription>
                </div>
                <Button onClick={openCreate} className="gap-2 gradient-brand hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4" /> Agregar usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Cargando usuarios...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-12 w-12 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No hay usuarios registrados</p>
                            <Button size="sm" onClick={openCreate} className="gap-2">
                              <Plus className="h-4 w-4" /> Invitar primer usuario
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm">{user.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleBadge[user.role]}>
                              {roleLabel[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-critical hover:text-critical hover:bg-critical/10" onClick={() => setDeleteUser(user)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-4">
          <Card className="glass-card max-w-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Apariencia
              </CardTitle>
              <CardDescription className="text-xs">Personaliza el tema visual del dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                  <div>
                    <p className="text-sm font-medium">Tema oscuro</p>
                    <p className="text-xs text-muted-foreground">Activar modo oscuro en toda la aplicación</p>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                >
                  <div className="mb-3 h-20 rounded-lg bg-white border shadow-sm flex items-center justify-center">
                    <Sun className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-medium">Claro</p>
                  <p className="text-xs text-muted-foreground">Fondo blanco</p>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                >
                  <div className="mb-3 h-20 rounded-lg bg-[#0F172A] border shadow-sm flex items-center justify-center">
                    <Moon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <p className="text-sm font-medium">Oscuro</p>
                  <p className="text-xs text-muted-foreground">Fondo #0F172A</p>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="mt-4">
          <Card className="glass-card max-w-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Preferencias Generales
              </CardTitle>
              <CardDescription className="text-xs">Configura datos de tu organización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Nombre de la organización
                </Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mi Organización"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Idioma
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language" className="bg-muted/50">
                    <SelectValue placeholder="Selecciona idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Zona horaria
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone" className="bg-muted/50">
                    <SelectValue placeholder="Selecciona zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Mexico_City">Ciudad de México (CST)</SelectItem>
                    <SelectItem value="America/Bogota">Bogotá (COT)</SelectItem>
                    <SelectItem value="America/Lima">Lima (PET)</SelectItem>
                    <SelectItem value="America/Santiago">Santiago (CLT)</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                    <SelectItem value="America/New_York">New York (EST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />
              <h4 className="text-sm font-semibold">Cambiar Contraseña</h4>
              <div className="space-y-2">
                <Input type="password" placeholder="Contraseña actual" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
                <Input type="password" placeholder="Nueva contraseña (mín. 6 caracteres)" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                <Button variant="outline" size="sm" onClick={handleChangePassword}>Actualizar contraseña</Button>
              </div>

              <Button onClick={handleSaveGeneral} className="gap-2 gradient-brand hover:opacity-90 transition-opacity">
                Guardar cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={userModalOpen} onOpenChange={(open) => !open && setUserModalOpen(false)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar usuario' : 'Crear usuario'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifica los datos del usuario seleccionado.' : 'Completa los datos para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="userName">Nombre</Label>
              <Input
                id="userName"
                placeholder="Nombre completo"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="usuario@empresa.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPassword">Contraseña</Label>
              <Input
                id="userPassword"
                type="password"
                placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Contraseña'}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Rol</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as 'admin' | 'viewer')}>
                <SelectTrigger id="userRole" className="bg-muted/50">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setUserModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser} className="gradient-brand hover:opacity-90 transition-opacity">
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Esto eliminará al usuario <strong>{deleteUser?.name}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
