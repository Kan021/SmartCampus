import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: isDark
          ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
          : 'linear-gradient(135deg, #1e293b, #334155)',
        border: '2px solid',
        borderColor: isDark ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.2)',
        boxShadow: isDark
          ? '0 4px 16px rgba(251,191,36,0.3)'
          : '0 4px 16px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        transition: 'all 0.3s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
      onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
