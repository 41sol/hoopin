import { Component } from "react";

/* Catches render errors in a screen so one broken screen doesn't blank the
   whole app. Resets when the route key changes. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#B91C1C", fontWeight: 600 }}>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Something went wrong on this screen.</div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--muted)" }}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
