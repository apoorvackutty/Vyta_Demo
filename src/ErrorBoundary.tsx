import { Component, type ReactNode } from 'react';
import { useDemo } from './state/store';

// One per screen (TRD §5). Friendly words for the room; the technical detail stays folded away for us.
export class ErrorBoundary extends Component<{ children: ReactNode; compact?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="m-6 flex flex-col items-center gap-3 rounded-card border border-line bg-paper p-8 text-center text-plum-900 shadow-card">
        <img src="/assets/botanical-clover.png" alt="" className="h-20 w-20 object-contain mix-blend-multiply" />
        <p className="font-display text-2xl font-semibold text-plum-700">This screen didn't load</p>
        <p className="max-w-sm text-sm text-muted">Nothing you entered is lost. Try again, or reset the demo to start from the beginning.</p>
        <div className="mt-2 flex gap-2">
          <button className="rounded-lg border border-plum-700 bg-paper px-4 py-2 text-sm font-medium text-plum-700 hover:bg-plum-100" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="rounded-lg bg-plum-700 px-4 py-2 text-sm font-medium text-paper hover:bg-plum-800" onClick={() => { useDemo.getState().reset(); this.setState({ error: null }); window.location.href = '/'; }}>Reset demo</button>
        </div>
        <details className="mt-2 text-left text-xs text-muted"><summary className="cursor-pointer">Technical detail</summary><p className="mt-1 font-mono">{this.state.error.message}</p></details>
      </div>
    );
  }
}
