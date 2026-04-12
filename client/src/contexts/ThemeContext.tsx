import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light', toggleTheme: () => {}, isDark: false,
});

// ─── Dynamic dark mode overrides ──────────────────────────────────
// This injects a <style> tag that uses !important to override ALL
// inline white backgrounds, borders, and text colors across every page.
const DARK_STYLE_ID = 'sc-dark-overrides';

const DARK_CSS = `
/* ═══════════════════════════════════════════════════════════════
   GLOBAL DARK MODE — runtime injection
   Overrides ALL inline white surfaces, text, borders
   ═══════════════════════════════════════════════════════════════ */

/* ─── Force dark on html/body ──────────────────────────────── */
html[data-theme="dark"],
html[data-theme="dark"] body {
  background: #0f1117 !important;
  color: #e8eaf0 !important;
  color-scheme: dark;
}

/* ─── ALL white/light background surfaces ──────────────────── */
/* React renders style={{ background: '#fff' }} as rgb(255,255,255) */
[data-theme="dark"] [style*="background"][style*="rgb(255"],
[data-theme="dark"] [style*="background"][style*="rgb(248"],
[data-theme="dark"] [style*="background"][style*="rgb(244"],
[data-theme="dark"] [style*="background"][style*="rgb(240"],
[data-theme="dark"] [style*="background"][style*="rgb(245"],
[data-theme="dark"] [style*="background"][style*="rgb(250"],
[data-theme="dark"] [style*="background"][style*="rgb(247"],
[data-theme="dark"] [style*="background"][style*="rgb(246"],
[data-theme="dark"] [style*="background"][style*="rgb(249"],
[data-theme="dark"] [style*="background"][style*="rgb(252"] {
  background: #1e2130 !important;
}

/* Slightly lighter surfaces (filter bars, input areas) */
[data-theme="dark"] [style*="background"][style*="rgb(240, 242, 245)"],
[data-theme="dark"] [style*="background"][style*="rgb(248, 249, 251)"],
[data-theme="dark"] [style*="background"][style*="rgb(244, 246, 250)"] {
  background: #252834 !important;
}

/* Hex fallbacks (some browsers keep hex in style attr) */
[data-theme="dark"] [style*="background"][style*="#fff"],
[data-theme="dark"] [style*="background"][style*="#FFF"],
[data-theme="dark"] [style*="background"][style*="#ffffff"],
[data-theme="dark"] [style*="background"][style*="#FFFFFF"],
[data-theme="dark"] [style*="background"][style*="#f0f2f5"],
[data-theme="dark"] [style*="background"][style*="#f8f9fb"],
[data-theme="dark"] [style*="background"][style*="#f4f6fa"],
[data-theme="dark"] [style*="background"][style*="#f5f5f5"] {
  background: #1e2130 !important;
}

/* rgba white backgrounds */
[data-theme="dark"] [style*="background"][style*="rgba(255, 255, 255"],
[data-theme="dark"] [style*="background"][style*="rgba(255,255,255"] {
  background: rgba(30, 33, 48, 0.95) !important;
}

/* ─── Dark text → light text ───────────────────────────────── */
[data-theme="dark"] [style*="color: rgb(26, 26, 46)"],
[data-theme="dark"] [style*="color: rgb(0, 0, 0)"],
[data-theme="dark"] [style*="color: rgb(26,"],
[data-theme="dark"] [style*="color: #1a1a2e"],
[data-theme="dark"] [style*="color: #000"],
[data-theme="dark"] [style*="color: black"],
[data-theme="dark"] [style*="color:#1a1a2e"],
[data-theme="dark"] [style*="color:#000"] {
  color: #e8eaf0 !important;
}

[data-theme="dark"] [style*="color: rgb(85, 85, 85)"],
[data-theme="dark"] [style*="color: #555"],
[data-theme="dark"] [style*="color:#555"],
[data-theme="dark"] [style*="color: rgb(74, 85, 104)"],
[data-theme="dark"] [style*="color: #4a5568"] {
  color: #a0a8b8 !important;
}

[data-theme="dark"] [style*="color: rgb(136"],
[data-theme="dark"] [style*="color: #888"],
[data-theme="dark"] [style*="color:#888"],
[data-theme="dark"] [style*="color: rgb(153"],
[data-theme="dark"] [style*="color: #999"],
[data-theme="dark"] [style*="color:#999"],
[data-theme="dark"] [style*="color: rgb(148, 163, 184)"] {
  color: #636b7e !important;
}

/* ─── Black borders → subtle ───────────────────────────────── */
[data-theme="dark"] [style*="border"][style*="rgb(0, 0, 0)"],
[data-theme="dark"] [style*="border"][style*="#000"],
[data-theme="dark"] [style*="border"][style*="black"],
[data-theme="dark"] [style*="border-color"][style*="rgb(0, 0, 0)"],
[data-theme="dark"] [style*="border-color"][style*="#000"] {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

/* ─── Borders with rgba black ──────────────────────────────── */
[data-theme="dark"] [style*="border"][style*="rgba(0, 0, 0"],
[data-theme="dark"] [style*="border"][style*="rgba(0,0,0"],
[data-theme="dark"] [style*="border-color"][style*="rgba(0, 0, 0"],
[data-theme="dark"] [style*="border-bottom"][style*="rgba(0, 0, 0"],
[data-theme="dark"] [style*="border-top"][style*="rgba(0, 0, 0"] {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

/* ─── Box shadows with black ───────────────────────────────── */
[data-theme="dark"] [style*="box-shadow"][style*="rgba(0, 0, 0, 0.1)"],
[data-theme="dark"] [style*="box-shadow"][style*="rgba(0, 0, 0, 0.12)"],
[data-theme="dark"] [style*="box-shadow"][style*="rgba(0, 0, 0, 0.15)"] {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
}

/* ─── Form elements (select, input, textarea) ──────────────── */
[data-theme="dark"] input,
[data-theme="dark"] select,
[data-theme="dark"] textarea {
  background: #252834 !important;
  color: #e8eaf0 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}
[data-theme="dark"] input::placeholder,
[data-theme="dark"] textarea::placeholder {
  color: #636b7e !important;
}
[data-theme="dark"] input:focus,
[data-theme="dark"] select:focus,
[data-theme="dark"] textarea:focus {
  border-color: rgba(79, 195, 247, 0.5) !important;
  outline-color: rgba(79, 195, 247, 0.3) !important;
}
[data-theme="dark"] option {
  background: #252834 !important;
  color: #e8eaf0 !important;
}

/* ─── Tables ───────────────────────────────────────────────── */
[data-theme="dark"] table { border-color: rgba(255,255,255,0.08) !important; }
[data-theme="dark"] th {
  background: #252834 !important;
  color: #a0a8b8 !important;
  border-color: rgba(255,255,255,0.08) !important;
}
[data-theme="dark"] td {
  background: transparent !important;
  color: #c8cdd8 !important;
  border-color: rgba(255,255,255,0.06) !important;
}
[data-theme="dark"] tr:nth-child(even) td {
  background: rgba(255,255,255,0.02) !important;
}
[data-theme="dark"] tr:hover td {
  background: rgba(79, 195, 247, 0.05) !important;
}

/* ─── Headings inside pages ────────────────────────────────── */
[data-theme="dark"] h1, [data-theme="dark"] h2,
[data-theme="dark"] h3, [data-theme="dark"] h4 {
  color: #e8eaf0 !important;
}
[data-theme="dark"] p, [data-theme="dark"] span, [data-theme="dark"] label {
  color: inherit;
}
`;

function injectDarkCSS() {
  if (!document.getElementById(DARK_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = DARK_STYLE_ID;
    style.textContent = DARK_CSS;
    document.head.appendChild(style);
  }
}

function removeDarkCSS() {
  const el = document.getElementById(DARK_STYLE_ID);
  if (el) el.remove();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('sc-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sc-theme', theme);
    if (theme === 'dark') {
      injectDarkCSS();
    } else {
      removeDarkCSS();
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
