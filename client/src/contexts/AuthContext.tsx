import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'faculty' | 'admin';
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Small retry loop in case the mock DB is initialising async
      let attempts = 0;
      while (attempts < 3) {
        try {
          const response = await authApi.me();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            localStorage.removeItem('accessToken');
            setUser(null);
          }
          break; // success — exit loop
        } catch (err: any) {
          if (err?.message === 'DB not ready' && attempts < 2) {
            // Wait 150ms and retry — DB may still be seeding
            await new Promise(r => setTimeout(r, 150));
            attempts++;
          } else {
            // Token invalid or any other error — clear it cleanly
            localStorage.removeItem('accessToken');
            setUser(null);
            break;
          }
        }
      }
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (accessToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue regardless
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
