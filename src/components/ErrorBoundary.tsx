import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.label || 'app'}]`, error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary__icon">!</div>
          <div className="error-boundary__title">
            Algo falló en {this.props.label || 'este panel'}
          </div>
          <pre className="error-boundary__msg">
            {String(this.state.error.message || this.state.error)}
          </pre>
          <button className="btn btn--primary" onClick={this.reset}>
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
