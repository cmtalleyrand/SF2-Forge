import React from 'react';

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-6 text-center p-8">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-[#ff6b6b]">Something went wrong</h1>
          <p className="text-[#888] max-w-md">{this.state.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload(); }}
            className="bg-[#bb86fc] text-black font-bold py-2 px-6 rounded-lg hover:bg-[#a370f7] transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
