import { Component, type ReactNode } from 'react';
import { useDemo } from './state/store';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-8 rounded-card border border-line bg-paper p-6 text-plum-900">
        <p className="font-display text-2xl text-plum-700">Something went wrong in this screen.</p>
        <p className="mt-2 text-sm text-muted">{this.state.error.message}</p>
        <button className="mt-4 rounded-lg bg-plum-700 px-4 py-2 text-sm text-paper" onClick={() => { useDemo.getState().reset(); this.setState({ error: null }); window.location.href = '/'; }}>Reset demo</button>
      </div>
    );
  }
}
