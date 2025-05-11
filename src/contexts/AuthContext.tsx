"use client";

import type { User } from '@/types';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  isLoading: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user from session/localStorage
    try {
      const storedUser = localStorage.getItem('globalfam-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('globalfam-user');
    }
    setIsLoading(false);
  }, []);

  const login = (name: string, email: string) => {
    const mockUser: User = {
      id: 'mock-user-id-' + Math.random().toString(36).substring(7),
      name,
      email,
      avatarUrl: `https://picsum.photos/seed/${name}/100/100`,
    };
    setUser(mockUser);
    localStorage.setItem('globalfam-user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('globalfam-user');
    // Potentially redirect to home or login page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
