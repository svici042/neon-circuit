import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000008",
            fontFamily: "'Courier New', monospace",
            color: "#ffffff",
            flexDirection: "column",
            gap: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, color: "#00eeff", marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#00eeff", letterSpacing: 2 }}>
            WEBGL REQUIRED
          </div>
          <div style={{ fontSize: 14, color: "#ffffff88", maxWidth: 400, lineHeight: 1.7 }}>
            This game requires WebGL support. Please open it in a modern browser like Chrome or Firefox with
            hardware acceleration enabled.
          </div>
          <div style={{ fontSize: 11, color: "#ffffff33", marginTop: 8 }}>
            {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
