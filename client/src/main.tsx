import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initDb } from './services/mockDb.ts'

/**
 * SmartCampus — Frontend-only mode.
 * No backend required. All data is stored in localStorage.
 * Ensure the mock DB is seeded BEFORE mounting React so no
 * component ever encounters a "DB not ready" error.
 */
async function bootstrap() {
  // Always seed/initialise the local DB first
  if (!localStorage.getItem('sc_mock_db_v2')) {
    await initDb();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
