import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic mb-4">
              Something went wrong
            </h1>
            <p className="text-[#1D1D1D]/60 mb-8">
              Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#1D1D1D] text-white px-8 py-4 text-sm font-black uppercase tracking-widest rounded-xl"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
