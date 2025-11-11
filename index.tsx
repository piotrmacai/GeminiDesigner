import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initI18n } from './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Render a simple loading state initially
root.render(
  <div className="h-screen bg-[#131314] flex items-center justify-center text-white">
    <div className="initial-loader"></div>
  </div>
);

// Initialize i18n and then render the main app
initI18n().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(error => {
    console.error("Failed to initialize the app:", error);
    root.render(
      <div className="h-screen bg-[#131314] flex items-center justify-center text-red-500">
        Failed to load application.
      </div>
    );
});