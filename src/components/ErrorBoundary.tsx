import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in [${this.props.sectionName || 'Section'}]:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-slate-900 border border-red-500/40 rounded-2xl shadow-xl text-slate-100 space-y-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold text-white">
              Something went wrong in {this.props.sectionName || 'this section'}
            </h3>
          </div>
          <p className="text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-red-300 overflow-x-auto">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
