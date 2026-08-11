import React from 'react';
import toast from 'react-hot-toast';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);

    // Show toast notification
    toast.error('Something went wrong. Please try refreshing the page.', {
      duration: 5000,
      position: 'bottom-center'
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Premium fallback UI — centered, no harsh borders, calming design
      return (
        <div className="flex items-center justify-center w-full min-h-[70vh] px-4">
          <div className="flex flex-col items-center text-center max-w-md w-full">

            {/* Animated pulsing icon container */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 flex items-center justify-center shadow-sm">
                <svg
                  className="w-8 h-8 text-amber-500 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-lg font-semibold text-ink mb-2 tracking-tight">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="text-sm text-ink-muted leading-relaxed mb-8 max-w-sm">
              We hit an unexpected issue loading this section. A quick refresh usually fixes it.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="tracker-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-tracker-md shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.97]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Refresh Page
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-ink-subtle bg-surface hover:bg-surface-1/60 border border-hairline rounded-tracker-md transition-all duration-200 active:scale-[0.97]"
              >
                Try Again
              </button>
            </div>

            {/* Subtle error hint — only in dev */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 w-full text-left">
                <summary className="text-[11px] text-ink-muted/60 cursor-pointer hover:text-ink-muted transition-colors select-none">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 text-[10px] text-ink-muted bg-surface-1/40 rounded-tracker-md overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {this.state.error?.message || 'Unknown error'}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
