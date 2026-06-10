import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Shield, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="relative">
          <h1 className="text-[120px] font-bold font-display gradient-animated leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="h-16 w-16 text-muted-foreground/10" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-display text-neon-cyan tracking-wider">SECCIÓN NO ENCONTRADA</h2>
          <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto">
            La ruta que buscas no existe o fue movida a otra ubicación.
          </p>
        </div>
        <Link to="/dashboard">
          <Button className="btn-gradient font-display tracking-wider uppercase gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
