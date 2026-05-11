import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const stored = await AsyncStorage.getItem('token');
      if (stored) {
        setToken(stored);
        const res = await authAPI.me();
        setUser(res.data.user);
      }
    } catch {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    await AsyncStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const signup = async (name, email, password) => {
    const res = await authAPI.signup({ name, email, password });
    await AsyncStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
