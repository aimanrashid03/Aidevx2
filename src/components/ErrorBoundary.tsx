import { Component, type ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: (error: Error) => ReactNode
}

interface State {
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    render() {
        if (this.state.error) {
            if (this.props.fallback) return this.props.fallback(this.state.error)
            return (
                <div className="p-3 text-[11px] text-red-600 bg-red-50 rounded border border-red-200">
                    <p className="font-semibold mb-1">Rendering error</p>
                    <p className="font-mono text-[10px] text-red-500">{this.state.error.message}</p>
                </div>
            )
        }
        return this.props.children
    }
}
