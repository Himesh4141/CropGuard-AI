import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public override componentDidCatch(
    error: Error,
    errorInfo: ErrorInfo,
  ): void {
    console.error(
      "Unhandled CropGuard UI error:",
      error,
      errorInfo,
    );
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="center-screen">
          <section
            className="panel"
            role="alert"
            aria-live="assertive"
          >
            <h1>
              Something went wrong
            </h1>

            <p>
              CropGuard encountered an unexpected interface
              error. Reload the application and try again.
            </p>

            <button
              type="button"
              className="button primary"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}