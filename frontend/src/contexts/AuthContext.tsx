import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '../config/api';

export interface User {
  username: string;
  uid: number;
  homeDirectory: string;
  projectsPath: string;
  authenticated: true;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  originalUser: User | null; // Track the original login user
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        if (!storedToken) {
          setIsLoading(false);
          return;
        }
        
        setToken(storedToken);

        const response = await fetch(getApiUrl('/api/auth/verify'), {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Load original user from localStorage
          const storedOriginalUser = localStorage.getItem('original_user');
          if (storedOriginalUser) {
            setOriginalUser(JSON.parse(storedOriginalUser));
          } else {
            // If no stored original user, current user is the original
            setOriginalUser(userData);
            localStorage.setItem('original_user', JSON.stringify(userData));
          }
        } else {
          // Invalid token, remove it
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('auth_token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store the auth token
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      
      // Set user data
      setUser(data.user);
      
      // Store original user on first login
      setOriginalUser(data.user);
      localStorage.setItem('original_user', JSON.stringify(data.user));
    } catch (error) {
      // Clear any existing auth data on login failure
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('original_user');
    setToken(null);
    setUser(null);
    setOriginalUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    originalUser,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}