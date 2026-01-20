import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red', fontFamily: 'monospace' }}>
                    <h1>Algo deu errado (Erro de Código)</h1>
                    <pre style={{ background: '#eee', padding: 10, borderRadius: 5 }}>
                        {this.state.error?.toString()}
                    </pre>
                    <p>Tente recarregar a página ou avise o suporte.</p>
                </div>
            );
        }

        return this.props.children;
    }
}
