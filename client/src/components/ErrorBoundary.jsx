import { Component } from "react";
import { Link } from "react-router-dom";
import GlassCard from "./ui/GlassCard";
import NeonButton from "./ui/NeonButton";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <GlassCard className="max-w-lg text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Unexpected Error</p>
            <h1 className="mt-2 font-display text-4xl">Something went wrong</h1>
            <p className="mt-4 text-text-muted">
              A JavaScript error interrupted this screen. Try refreshing or head back to safety.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <NeonButton onClick={() => window.location.reload()}>Reload Page</NeonButton>
              <Link className="rounded-xl border border-white/10 px-4 py-2 text-sm" to="/">
                Back Home
              </Link>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
