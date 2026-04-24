import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dbApi } from './db/storage';
import { initAuth } from './lib/firebase';

// Initialize the local database and backend
const start = async () => {
  await initAuth();
  dbApi.init();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

start();
