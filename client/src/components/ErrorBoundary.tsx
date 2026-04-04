import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRemoveChildError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isRemoveChildError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isRemoveChildError =
      error.message?.includes("removeChild") ||
      error.message?.includes("NotFoundError") ||
      error.name === "NotFoundError";
    return { hasError: true, error, isRemoveChildError };
  }

  componentDidCatch(error: Error) {
    // Auto-recover silently from DOM reconciliation errors (removeChild)
    if (
      error.message?.includes("removeChild") ||
      error.message?.includes("NotFoundError") ||
      error.name === "NotFoundError"
    ) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null, isRemoveChildError: false });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // Auto-recover from removeChild: render nothing briefly
      if (this.state.isRemoveChildError) {
        return null;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">Ocurrió un error inesperado.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.message}
              </pre>
            </div>

            <button
              onClick={() => this.setState({ hasError: false, error: null, isRemoveChildError: false })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Intentar de nuevo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
