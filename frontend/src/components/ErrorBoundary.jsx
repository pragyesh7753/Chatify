import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
          <div className="card bg-base-200 w-full max-w-md shadow-xl">
            <div className="card-body text-center">
              <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
              
              <h2 className="card-title justify-center text-error mb-2">
                Oops! Something went wrong
              </h2>
              
              <p className="text-sm opacity-70 mb-4">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="text-left bg-base-300 rounded p-3 mb-4 text-xs">
                  <summary className="cursor-pointer font-semibold">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="space-y-2">
                <button 
                  className="btn btn-primary w-full"
                  onClick={this.handleReload}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Reload Page
                </button>
                
                <button 
                  className="btn btn-ghost w-full"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
