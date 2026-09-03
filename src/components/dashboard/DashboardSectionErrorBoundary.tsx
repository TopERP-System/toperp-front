import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
};

type State = { hasError: boolean };

/**
 * Isola falhas de render para um bloco do Dashboard não derrubar a página inteira.
 */
export class DashboardSectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[Dashboard] falha em ${this.props.label ?? 'seção'}`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
            Não foi possível exibir esta seção. Recarregue a página ou tente novamente.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
