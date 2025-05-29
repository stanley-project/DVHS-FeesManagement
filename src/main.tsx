import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { VillageProvider } from './contexts/VillageContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <VillageProvider>
          <App />
        </VillageProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);