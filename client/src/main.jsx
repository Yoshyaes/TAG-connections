import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Mount to #tag-connections-root (WordPress embed or WP admin page)
// Falls back to #root for standalone dev
const rootEl =
  document.getElementById('tag-connections-root') ||
  document.getElementById('root');

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
}
