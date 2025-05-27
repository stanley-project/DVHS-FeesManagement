// src/main.tsx (or index.js)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom'; // Assuming you import Router here
import App from './App';
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import './index.css'; // Your global styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      {/* AuthProvider MUST wrap App */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);