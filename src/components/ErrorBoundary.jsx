import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6">
          <div className="bg-white border border-border rounded-[16px] p-6 sm:p-8 max-w-md w-full text-center shadow-card space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">
                Connection or Display Error
              </h2>
              <p className="text-xs text-muted-gray mt-1.5 leading-relaxed">
                {this.state.error?.message ||
                  'An issue occurred while communicating with the backend server.'}
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-sage hover:bg-sage-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-[0.98] w-full"
            >
              <RefreshCw size={14} />
              Retry Connection
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
