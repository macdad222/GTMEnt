import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  setPassword: (userId: string, password: string, confirmPassword: string) => Promise<SetPasswordResult>;
  clearPasswordChangeRequired: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const userData = JSON.parse(storedSession);
        setUser(userData);
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<LoginResult> => {
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
        localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
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
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const setPassword = async (
    userId: string,
    password: string,
    confirmPassword: string
  ): Promise<SetPasswordResult> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm_password: confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update user to clear requiresPasswordChange
        if (user) {
          const updatedUser = { ...user, requiresPasswordChange: false };
          setUser(updatedUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        }
        return { success: true };
      } else {
        return { success: false, message: data.detail || 'Failed to set password' };
      }
    } catch (error) {
      console.error('Set password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const clearPasswordChangeRequired = () => {
    if (user) {
      const updatedUser = { ...user, requiresPasswordChange: false };
      setUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setPassword,
        clearPasswordChangeRequired,
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

