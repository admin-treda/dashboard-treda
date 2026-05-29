import { Component } from 'react';

// Error Boundary - captura errores de renderizado en React
// Muestra una UI amigable en lugar de pantalla en blanco
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onErrorReset) {
      this.props.onErrorReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.handleReset,
        });
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-0 mb-2">Algo salió mal</h2>
          <p className="text-sm text-text-2 mb-6 max-w-md">
            Ocurrió un error inesperado en la interfaz. Puedes intentar recargar la página
            o volver al inicio.
          </p>
          {this.state.error && (
            <details className="mb-6 max-w-lg w-full text-left">
              <summary className="text-xs text-text-3 cursor-pointer hover:text-text-2 mb-2">
                Detalles técnicos (para soporte)
              </summary>
              <pre className="text-[10px] bg-bg-3 border border-border rounded-md p-3 overflow-auto max-h-48 text-red-400 whitespace-pre-wrap break-all">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && `\n\n${this.state.errorInfo.componentStack}`}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
            >
              🔄 Reintentar
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >
              🔃 Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
