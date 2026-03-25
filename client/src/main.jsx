import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Mount to #tag-connections-root (WordPress embed) or #root (standalone)
const rootEl =
  document.getElementById('tag-connections-root') ||
  document.getElementById('root');

// Use HashRouter when embedded in WordPress (no server-side routing)
// Use BrowserRouter for standalone deployment
const isEmbedded = !!document.getElementById('tag-connections-root');
const Router = isEmbedded ? HashRouter : BrowserRouter;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
