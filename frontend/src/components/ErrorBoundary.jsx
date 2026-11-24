import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log component stack and technical details to console for diagnosability without showing technical detail to the user
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo?.componentStack || errorInfo);
  }

  handleBackToDashboard = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="error-boundary-panel"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "360px",
            padding: "2rem",
            margin: "1rem 0"
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "520px",
              width: "100%",
              textAlign: "center",
              padding: "2.5rem 2rem",
              background: "var(--surface, #1e293b)",
              border: "1px solid var(--border, #334155)",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)"
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "var(--text, #f8fafc)",
                margin: "0 0 0.75rem 0"
              }}
            >
              Something went wrong while opening this page.
            </h2>
            <p
              className="muted"
              style={{
                fontSize: "0.95rem",
                color: "var(--text-muted, #94a3b8)",
                margin: "0 0 1.75rem 0",
                lineHeight: 1.5
              }}
            >
              An unexpected error occurred in this section. The rest of the application remains active. You can return to your dashboard or choose another page from the sidebar.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <button
                type="button"
                className="primary-btn"
                onClick={this.handleBackToDashboard}
                style={{ padding: "0.65rem 1.5rem", fontSize: "0.95rem", fontWeight: 600 }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
