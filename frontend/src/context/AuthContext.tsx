import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  requiresPasswordChange: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  setPassword: (userId: string, password: string, confirmPassword: string) => Promise<SetPasswordResult>;
  clearPasswordChangeRequired: () => void;
  /** Returns headers with Authorization bearer token included. */
  authHeaders: () => Record<string, string>;
}

interface LoginResult {
  success: boolean;
  message?: string;
  requiresPasswordChange?: boolean;
}

interface SetPasswordResult {
  success: boolean;
  message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'gtm_user_session';
const TOKEN_KEY = 'gtm_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedSession && storedToken) {
      try {
        const userData = JSON.parse(storedSession);
        setUser(userData);
        setToken(storedToken);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        const userData: User = {
          id: data.user_id,
          username: data.username,
          name: data.name,
          role: data.role,
          requiresPasswordChange: data.requires_password_change || false,
        };
        setUser(userData);
        setToken(data.token || null);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
        }
        return {
          success: true,
          requiresPasswordChange: data.requires_password_change,
        };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const setPassword = useCallback(async (
    userId: string,
    password: string,
    confirmPassword: string
  ): Promise<SetPasswordResult> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password, confirm_password: confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user to clear requiresPasswordChange
        setUser(prev => {
          if (!prev) return prev;
          const updatedUser = { ...prev, requiresPasswordChange: false };
          localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
          return updatedUser;
        });
        return { success: true };
      } else {
        return { success: false, message: data.detail || 'Failed to set password' };
      }
    } catch (error) {
      console.error('Set password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  }, [authHeaders]);

  const clearPasswordChangeRequired = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = { ...prev, requiresPasswordChange: false };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        setPassword,
        clearPasswordChangeRequired,
        authHeaders,
      }}
    >
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

