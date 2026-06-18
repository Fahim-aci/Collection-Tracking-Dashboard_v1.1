// /src/app/components/ui/ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Generic React Error Boundary.
// Wraps dashboard widgets so a single component failure never blanks the whole
// dashboard — the failing widget shows a compact error card instead.
// ─────────────────────────────────────────────────────────────────────────────

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback card (e.g. "KPI Cards") */
  label?: string;
}

interface State {
  hasError: boolean;
  message:  string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] ${this.props.label ?? 'component'} threw:`,
      error,
      info.componentStack,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="bg-white rounded-2xl border border-[#FECDCA] p-5 flex flex-col gap-2"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[16px]">⚠️</span>
          <span className="text-[13px] font-semibold text-[#B42318]">
            {this.props.label ?? 'Widget'} failed to render
          </span>
        </div>
        <p className="text-[11px] text-[#667085] leading-relaxed break-words">
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="self-start mt-1 px-3 py-1.5 text-[11px] font-semibold text-[#B42318] border border-[#FECDCA] rounded-lg hover:bg-[#FEF3F2] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
}
