import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="glass-card max-w-md w-full p-8 text-center space-y-6 animate-scale-in">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-neon-red/10 border border-neon-red/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-neon-red" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Error inesperado</h2>
              <p className="text-sm text-text-muted">
                Algo salió mal al cargar este componente. Puedes intentar de nuevo o volver al inicio.
              </p>
            </div>

            {/* Error details */}
            {this.state.error && (
              <div className="text-left p-3 rounded-lg bg-muted/30 border border-border/30 max-h-32 overflow-auto">
                <p className="text-xs font-mono text-neon-red/80 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="gap-2 border-border/40 hover:border-neon-cyan/30"
              >
                <Home className="h-4 w-4" />
                Inicio
              </Button>
              <Button 
                onClick={this.handleReset}
                className="gap-2 bg-neon-cyan/10 hover:bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
