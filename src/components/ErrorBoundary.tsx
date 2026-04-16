import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-slate-950 p-6 text-center">
            <div className="max-w-xs flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                    ⚠
                </div>
                <h2 className="text-white font-black uppercase tracking-tighter italic">
                    {this.props.fallbackTitle || 'Component Error'}
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    The module failed to initialize core resources (WebGL/Camera).
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all rounded-full"
                >
                    Hard Reboot System
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
