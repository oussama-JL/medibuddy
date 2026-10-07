import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, TOKEN_KEY } from './api';
import { clearUser, loginStart, utilisateur } from './authSlice';
import { can } from './permissions';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable: the session just won't survive a refresh
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
};

export const HOME_PATH = '/app/dashboard';

// Current user's role ('admin' | 'infirmier' | undefined while loading).
export function useRole() {
  const authen = useSelector((state) => state.auth.isAuthenticated.authen);
  return authen && authen.role;
}

// Route guard for one action from lib/permissions.js (the page's `can` rule).
export function RequirePermission({ action, children }) {
  const role = useRole();
  return can(role, action) ? children : <Navigate to={HOME_PATH} replace />;
}

// Returns a function that ends the session on the server, clears local state
// and goes back to the login page.
export function useLogout() {
  const dispatch = useDispatch();
  return async () => {
    try {
      await api('/logout', { method: 'POST' });
    } catch {
      // network error: still log out locally
    }
    clearToken();
    dispatch(clearUser());
    window.location.assign('/');
  };
}

// Guards a route: needs a token, restores the user from /me after a refresh,
// and only lets the listed roles through (others go to their own dashboard).
export function RequireAuth({ roles, children }) {
  const dispatch = useDispatch();
  const authen = useSelector((state) => state.auth.isAuthenticated.authen);
  const token = getToken();
  const [status, setStatus] = useState(authen && authen.role ? 'ready' : 'loading');

  useEffect(() => {
    if (!token || status === 'ready') return;
    let cancelled = false;
    api('/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unauthenticated'))))
      .then((data) => {
        if (cancelled) return;
        dispatch(loginStart(data.valeur));
        dispatch(utilisateur(data.user));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setStatus('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, dispatch]);

  if (!token || status === 'denied') return <Navigate to="/" replace />;
  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Chargement…</div>;
  }
  if (roles && !roles.includes(authen?.role)) return <Navigate to="/" replace />;
  return children;
}
