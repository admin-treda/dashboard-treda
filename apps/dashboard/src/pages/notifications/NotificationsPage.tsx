import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Mail, MessageSquare, Trash2, TestTube2 } from 'lucide-react'

export function NotificationsPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState<'smtp' | 'telegram' | null>(null)
  const [editingChannel, setEditingChannel] = useState<any>(null)
  const [smtpForm, setSmtpForm] = useState({ name: '', host: 'smtp-relay.gmail.com', port: '587', auth: false, user: '', pass: '', from: '', to: '' })
  const [telegramForm, setTelegramForm] = useState({ name: '', botToken: '', chatId: '' })
  const [saving, setSaving] = useState(false)

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const res = await api.get('/notifications')
      setChannels(res.data?.channels || [])
    } catch { toast.error('Error al cargar canales') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchChannels() }, [])

  const applyGmailPreset = () => {
    setSmtpForm(prev => ({ ...prev, host: 'smtp.gmail.com', port: '587', auth: true }))
    toast.success('Gmail SMTP (requiere App Password)')
  }

  const applyRelayPreset = () => {
    setSmtpForm(prev => ({ ...prev, host: 'smtp-relay.gmail.com', port: '587', auth: false, user: '', pass: '' }))
    toast.success('Google Workspace Relay - sin contraseña')
  }

  const editChannel = (ch: any) => {
    const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {})
    setEditingChannel(ch)
    if (ch.type === 'SMTP') {
      setSmtpForm({
        name: ch.name,
        host: cfg.host || 'smtp-relay.gmail.com',
        port: String(cfg.port || '587'),
        auth: cfg.auth || false,
        user: cfg.user || '',
        pass: cfg.pass || '',
        from: cfg.from || '',
        to: cfg.to || '',
      })
      setOpenDialog('smtp')
    } else {
      setTelegramForm({
        name: ch.name,
        botToken: cfg.botToken || '',
        chatId: cfg.chatId || '',
      })
      setOpenDialog('telegram')
    }
  }

  const handleSaveSmtp = async () => {
    if (!smtpForm.name || !smtpForm.from || !smtpForm.to || (smtpForm.auth && (!smtpForm.user || !smtpForm.pass))) {
      toast.error('Completa los campos requeridos')
      return
    }
    setSaving(true)
    try {
      const payload = { type: 'SMTP', name: smtpForm.name, config: { host: smtpForm.host, port: parseInt(smtpForm.port), secure: smtpForm.port === '465', auth: smtpForm.auth, user: smtpForm.user, pass: smtpForm.pass, from: smtpForm.from, to: smtpForm.to } }
      if (editingChannel) {
        await api.patch('/notifications/' + editingChannel.id, payload)
        toast.success('Canal actualizado')
      } else {
        await api.post('/notifications', payload)
        toast.success('Canal SMTP creado')
      }
      setOpenDialog(null)
      setEditingChannel(null)
      setSmtpForm({ name: '', host: 'smtp-relay.gmail.com', port: '587', auth: false, user: '', pass: '', from: '', to: '' })
      fetchChannels()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleSaveTelegram = async () => {
    if (!telegramForm.name || !telegramForm.botToken || !telegramForm.chatId) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      const payload = { type: 'TELEGRAM', name: telegramForm.name, config: { botToken: telegramForm.botToken, chatId: telegramForm.chatId } }
      if (editingChannel) {
        await api.patch('/notifications/' + editingChannel.id, payload)
        toast.success('Canal actualizado')
      } else {
        await api.post('/notifications', payload)
        toast.success('Canal Telegram creado')
      }
      setOpenDialog(null)
      setEditingChannel(null)
      setTelegramForm({ name: '', botToken: '', chatId: '' })
      fetchChannels()
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const testChannel = async (id: string) => {
    try {
      await api.get(`/notifications/${id}/test`)
      toast.success('Prueba enviada')
    } catch { toast.error('Error al enviar prueba') }
  }

  const toggleChannel = async (id: string) => {
    const ch = channels.find(c => c.id === id)
    if (!ch) return
    try {
      await api.patch(`/notifications/${id}`, { enabled: !ch.enabled })
      setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c))
      toast.success('Estado actualizado')
    } catch { toast.error('Error') }
  }

  const deleteChannel = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setChannels(prev => prev.filter(c => c.id !== id))
      toast.success('Canal eliminado')
    } catch { toast.error('Error') }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated">Notificaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Canales para alertas de seguridad</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setOpenDialog('smtp')}><Mail className="h-4 w-4" /> SMTP</Button>
          <Button variant="outline" className="gap-2" onClick={() => setOpenDialog('telegram')}><MessageSquare className="h-4 w-4" /> Telegram</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : channels.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">Sin canales configurados</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => {
            const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config
            return (
              <Card key={ch.id} className={`glass-card ${!ch.enabled ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ch.type === 'SMTP' ? <Mail className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-sky-500" />}
                    <div>
                      <p className="font-medium text-sm">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ch.type === 'SMTP' ? `${cfg.host} → ${cfg.to || cfg.user}` : `Bot: ${(cfg.botToken || '').slice(0, 12)}...`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editChannel(ch)} title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testChannel(ch.id)} title="Probar"><TestTube2 className="h-4 w-4" /></Button>
                    <Switch checked={ch.enabled} onCheckedChange={() => toggleChannel(ch.id)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-critical hover:text-critical" onClick={() => deleteChannel(ch.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* SMTP Dialog */}
      <Dialog open={openDialog === 'smtp'} onOpenChange={(o) => { if (!o) { setOpenDialog(null); setEditingChannel(null); } }}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> {editingChannel ? 'Editar' : 'Configurar'} Correo SMTP</DialogTitle>
            <DialogDescription>Configura el envío de alertas por correo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Presets</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={applyGmailPreset}>Gmail</Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={applyRelayPreset}>Relay</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nombre del canal</Label>
                <Input placeholder="Alertas seguridad" value={smtpForm.name} onChange={e => setSmtpForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Puerto</Label>
                <select value={smtpForm.port} onChange={e => setSmtpForm(p => ({ ...p, port: e.target.value }))}
                  className="h-8 w-full text-xs rounded-md border bg-transparent px-2">
                  <option value="25">25</option>
                  <option value="465">465 (SSL)</option>
                  <option value="587">587 (TLS)</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Servidor SMTP</Label>
              <Input placeholder="smtp-relay.gmail.com" value={smtpForm.host} onChange={e => setSmtpForm(p => ({ ...p, host: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="auth" checked={smtpForm.auth} onCheckedChange={v => setSmtpForm(p => ({ ...p, auth: v }))} />
              <Label htmlFor="auth" className="text-xs">Requerir autenticación</Label>
            </div>
            {smtpForm.auth && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Usuario</Label>
                  <Input placeholder="tu@dominio.com" value={smtpForm.user} onChange={e => setSmtpForm(p => ({ ...p, user: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contraseña</Label>
                  <Input type="password" placeholder="App Password" value={smtpForm.pass} onChange={e => setSmtpForm(p => ({ ...p, pass: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Correo FROM</Label>
                <Input placeholder="alertas@tudominio.com" value={smtpForm.from} onChange={e => setSmtpForm(p => ({ ...p, from: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">TO (separar con coma)</Label>
                <Input placeholder="admin@treda.com, otro@..." value={smtpForm.to} onChange={e => setSmtpForm(p => ({ ...p, to: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpenDialog(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveSmtp} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram Dialog */}
      <Dialog open={openDialog === 'telegram'} onOpenChange={(o) => { if (!o) { setOpenDialog(null); setEditingChannel(null); } }}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-sky-500" /> {editingChannel ? 'Editar' : 'Configurar'} Telegram</DialogTitle>
            <DialogDescription>Notificaciones vía bot de Telegram</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre del canal</Label>
              <Input placeholder="Alertas" value={telegramForm.name} onChange={e => setTelegramForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bot Token</Label>
              <Input placeholder="123456:ABC-def..." value={telegramForm.botToken} onChange={e => setTelegramForm(p => ({ ...p, botToken: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Chat ID</Label>
              <Input placeholder="-1001234567890" value={telegramForm.chatId} onChange={e => setTelegramForm(p => ({ ...p, chatId: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpenDialog(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveTelegram} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
