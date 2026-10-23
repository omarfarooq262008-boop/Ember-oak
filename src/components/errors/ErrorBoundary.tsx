import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback: (args: { resetError: () => void }) => ReactNode
}

type State = { error: Error | null }

/**
 * Lightweight error boundary so `@sentry/react` stays out of the first paint.
 * Sentry still captures via its global handlers once `initSentry()` loads.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught', error, info.componentStack)
  }

  resetError = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return this.props.fallback({ resetError: this.resetError })
    }
    return this.props.children
  }
}
