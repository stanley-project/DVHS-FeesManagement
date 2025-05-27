import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { VillageProvider } from './contexts/VillageContext';
import { VillageProvider } from './contexts/VillageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VillageProvider>
        <VillageProvider>
          <App />
        </VillageProvider>
        </VillageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);