import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isTecnico: boolean;
  isRecepcionista: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('autogestion_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { usuario } = await api.getMe();
        setUser(usuario);
      } catch (err) {
        console.error('Error restaurando sesión:', err);
        localStorage.removeItem('autogestion_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    localStorage.setItem('autogestion_token', data.token);
    setToken(data.token);
    setUser(data.usuario);
  };

  const logout = () => {
    localStorage.removeItem('autogestion_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.rol === 'admin';
  const isTecnico = user?.rol === 'tecnico';
  const isRecepcionista = user?.rol === 'recepcionista';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
        isTecnico,
        isRecepcionista,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
