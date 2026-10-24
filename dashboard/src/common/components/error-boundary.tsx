import { Component, ErrorInfo, ReactNode, createRef } from "react";
import { ErrorBoundaryFallback } from "./error-boundary-fallback";

interface Props {
  children: ReactNode;
  /** Custom fallback UI; when omitted the localized default panel is shown */
  fallback?: ReactNode;
  /**
   * Recovery to run before Try Again re-renders the children, e.g. rerunning
   * the route loader whose failure was caught here. Without it, Try Again
   * only clears this boundary, which cannot recover a failed loader (w4/264).
   */
  onRetry?: () => unknown;
  /** A change (e.g. the location) clears a caught error. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** An awaited recovery is running; Try Again is busy until it settles. */
  retrying: boolean;
}

const CLEARED = {
  hasError: false,
  error: null,
  errorInfo: null,
  retrying: false,
} as const;

/**
 * Error boundary that degrades a single panel instead of blanking the app.
 * Logs the full error for debugging; the localized fallback keeps the same
 * details behind a disclosure the reader can copy to support.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { ...CLEARED };
  }

  /** The default fallback's Try Again, for the focus handback below. */
  private retryButton = createRef<HTMLButtonElement>();
  /** The commit after a recovery settles decides where focus goes. */
  private settlingRetry = false;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] React error caught:", {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      location: typeof window !== "undefined" ? window.location.href : "ssr",
      timestamp: new Date().toISOString(),
    });

    this.setState({ errorInfo });
  }

  componentDidUpdate(previous: Props) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ ...CLEARED });
    }
    // A recovery whose loader failed again re-throws on the next render, and
    // the fallback that catches it is a new one: the Try Again the reader
    // pressed is gone. Hand focus to its replacement, unless the reader moved
    // it meanwhile (w4/1046).
    if (this.settlingRetry) {
      this.settlingRetry = false;
      const active = document.activeElement;
      if (this.state.hasError && (!active || active === document.body)) {
        this.retryButton.current?.focus();
      }
    }
  }

  handleRetry = async () => {
    // A plain panel retry stays immediate; only a recovery is awaited.
    if (!this.props.onRetry) return this.setState({ ...CLEARED });
    // One recovery at a time: a second Enter while it runs sends nothing.
    if (this.state.retrying) return;
    const resetKey = this.props.resetKey;
    this.setState({ retrying: true });
    try {
      await this.props.onRetry();
    } finally {
      // Leaving the route while it ran already cleared this boundary; the
      // abandoned recovery neither clears nor focuses anything there.
      if (resetKey === this.props.resetKey) {
        this.settlingRetry = true;
        this.setState({ ...CLEARED });
      }
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => void this.handleRetry()}
          retrying={this.state.retrying}
          retryRef={this.retryButton}
        />
      );
    }

    return this.props.children;
  }
}
