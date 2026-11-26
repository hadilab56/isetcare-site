import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api, { TOKEN_KEY, setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';

/** Inscription libre : le serveur crée toujours un compte déclarant. */
export interface RegisterInput {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  departement: string | null;
  fonction: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Au chargement : si un token existe, on récupère l'utilisateur connecté
  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return () => setUnauthorizedHandler(null);
    }
    api
      .get<User>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await api.post<{ token: string; utilisateur: User }>('/auth/login', { email, motDePasse });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.utilisateur);
    return res.data.utilisateur;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.post<{ token: string; utilisateur: User }>('/auth/register', input);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setUser(res.data.utilisateur);
    return res.data.utilisateur;
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
