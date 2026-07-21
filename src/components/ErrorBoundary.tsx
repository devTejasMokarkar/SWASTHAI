import * as React from "react";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null, 
      showDetails: false 
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    // Attempt back to safer route or reload
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-container"
          className="my-8 p-8 md:p-12 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-950/40 rounded-3xl shadow-xl shadow-red-950/5 dark:shadow-black/30 flex flex-col items-center text-center max-w-2xl mx-auto space-y-6"
        >
          {/* Warning Icon Emblem */}
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
            <AlertCircle className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-on-surface dark:text-slate-100 tracking-tight">
              An unexpected event occurred
            </h2>
            <p className="text-sm text-on-surface-variant dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Our clinical AI interface encountered an unresolved state runtime boundary. Try resetting the current view state or reloading the component.
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md shadow-red-500/10 hover:shadow-red-500/25 active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
            id="error-boundary-recover-btn"
          >
            <RefreshCw className="w-4 h-4" />
            Restore View & Refresh
          </button>

          {/* Collapsible Diagnostics Details */}
          {this.state.error && (
            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="w-full flex justify-between items-center text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest hover:text-primary transition-colors py-2 cursor-pointer"
                id="error-boundary-details-toggle"
              >
                <span>Diagnostic Logs</span>
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {this.state.showDetails && (
                <div 
                  className="mt-3 p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-900 rounded-2xl text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-48 whitespace-pre-wrap leading-normal"
                  id="error-boundary-details-log"
                >
                  <p className="font-bold mb-2">Error: {this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <p className="text-on-surface-variant dark:text-slate-500 text-[10px] mt-1 select-all">
                      {this.state.errorInfo.componentStack}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
