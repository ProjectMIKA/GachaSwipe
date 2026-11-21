import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import * as LaylaModule from '@layla-network/sdk';
import JSZip from 'jszip';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

window.LaylaSDK = LaylaModule.LaylaSDK || LaylaModule.default || LaylaModule;
window.installLaylaMock = LaylaModule.installLaylaMock;
window.JSZip = JSZip;
window.dispatchEvent(new Event('layla-sdk-ready'));

// The original file used ReactDOM.createRoot(document.getElementById('root')).render(<App />);
// which might already be at the end of App.jsx. Let's remove it from App.jsx and put it here.

const bootApp = () => {
    try {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
            <ErrorBoundary>
                <LanguageProvider>
                    <App />
                </LanguageProvider>
            </ErrorBoundary>
        );
    } catch (error) {
        if (document.body) {
            document.body.innerHTML = `<div style="color:red; background:white; padding:20px; font-family:monospace; z-index:999999; position:absolute; top:0; left:0; width:100%; height:100%;">
                <h3>BOOT FAILURE</h3>
                <p>${error.message}</p>
                <pre>${error.stack}</pre>
            </div>`;
        } else {
            console.error("CRITICAL BOOT FAILURE:", error);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
} else {
    bootApp();
}
