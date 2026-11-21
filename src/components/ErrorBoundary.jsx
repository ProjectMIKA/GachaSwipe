import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[GachaSwipe] Intercepted render crash:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleHardReload = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function' 
                    ? this.props.fallback(this.state.error, this.handleReset)
                    : this.props.fallback;
            }

            return (
                <div style={{
                    width: '100%',
                    minHeight: '100vh',
                    background: '#050308',
                    color: '#EBE3D6',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    boxSizing: 'border-box',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 99999
                }}>
                    <div style={{
                        maxWidth: '440px',
                        width: '100%',
                        background: 'rgba(20, 10, 30, 0.85)',
                        border: '1px solid rgba(0, 229, 255, 0.4)',
                        borderRadius: '16px',
                        padding: '28px 20px',
                        boxShadow: '0 0 30px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(255, 16, 122, 0.1)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '36px', filter: 'drop-shadow(0 0 12px rgba(255,16,122,0.8))' }}>
                            ⚠️
                        </div>
                        <div style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: '#00E5FF',
                            letterSpacing: '0.1em',
                            textShadow: '0 0 10px rgba(0,229,255,0.6)'
                        }}>
                            &gt; NEURAL_MATRIX_DESYNC
                        </div>
                        <p style={{
                            fontSize: '11.5px',
                            lineHeight: '1.5',
                            color: '#888888',
                            margin: 0
                        }}>
                            A visual compositing or render exception occurred. M.I.K.A. intercepted the crash before the webview terminated.
                        </p>

                        {this.state.error && (
                            <div style={{
                                width: '100%',
                                background: 'rgba(0, 0, 0, 0.6)',
                                border: '1px dashed rgba(255, 16, 122, 0.4)',
                                borderRadius: '8px',
                                padding: '10px',
                                fontSize: '10.5px',
                                color: '#FF107A',
                                textAlign: 'left',
                                overflowX: 'auto',
                                maxHeight: '100px',
                                wordBreak: 'break-all'
                            }}>
                                {this.state.error.message || String(this.state.error)}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    flex: 1,
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #00E5FF',
                                    background: 'rgba(0, 229, 255, 0.15)',
                                    color: '#00E5FF',
                                    fontFamily: "inherit",
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 0 12px rgba(0, 229, 255, 0.3)',
                                    transition: '0.2s'
                                }}
                            >
                                &gt; REBOOT_DECK
                            </button>
                            <button
                                onClick={this.handleHardReload}
                                style={{
                                    flex: 1,
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 16, 122, 0.4)',
                                    background: 'rgba(255, 16, 122, 0.1)',
                                    color: '#FF107A',
                                    fontFamily: "inherit",
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: '0.2s'
                                }}
                            >
                                &gt; RESYNC_SYSTEM
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
