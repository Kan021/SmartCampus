import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initDb } from './services/mockDb.ts'
import { detectMode } from './services/mode.ts'

// 1. Detect whether the backend is reachable (sets isOffline() flag)
// 2. Seed mock DB on first ever load
detectMode().finally(() => {
  if (!localStorage.getItem('sc_mock_db_v2')) {
    initDb();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
