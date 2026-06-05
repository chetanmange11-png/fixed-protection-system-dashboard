import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dbApi } from './db/storage';
import { initAuth } from './lib/firebase';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Initialize the local database and backend
const start = async () => {
  try {
    await initAuth();
    dbApi.init(); // don't await so it doesn't block render
    
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error: any) {
    document.getElementById('root')!.innerHTML = 
      `<div style="color: red; padding: 20px;">
         <h2>Error rendering application</h2>
         <pre>${error.stack || error.message || String(error)}</pre>
       </div>`;
  }
};

start();
