import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Demo authentication layer.
 *
 * FleetDash ships with no real user database, so this validates against a
 * small in-memory roster plus anyone who has registered through the UI
 * (persisted to localStorage on this browser), and persists the active
 * session to localStorage too. Swap `authenticate()` / `register()` for real
 * API calls (POST /api/auth/login, POST /api/auth/register) when you wire up
 * a real backend — everything else (ProtectedRoute, the UI) stays the same.
 */

const DEMO_USERS = [
  { email: 'manager@infotact.io', password: 'fleetdash', name: 'Ravi Menon', role: 'Fleet Manager' },
];

const SESSION_KEY = 'fleetdash:session';
const REGISTERED_USERS_KEY = 'fleetdash:registered-users';

const AuthContext = createContext(null);

function loadRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

function allKnownUsers() {
  return [...DEMO_USERS, ...loadRegisteredUsers()];
}

function authenticate(email, password) {
  const match = allKnownUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  if (!match) return null;
  const { password: _pw, ...user } = match;
  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore corrupt/inaccessible storage */
    } finally {
      setReady(true);
    }
  }, []);

  function login(email, password) {
    const matched = authenticate(email, password);
    if (!matched) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    setUser(matched);
    localStorage.setItem(SESSION_KEY, JSON.stringify(matched));
    return { ok: true };
  }

  function register({ name, email, password, confirmPassword, role }) {
    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      return { ok: false, error: 'Please fill in every field.' };
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return { ok: false, error: 'Enter a valid email address.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { ok: false, error: 'Passwords do not match.' };
    }
    if (allKnownUsers().some((u) => u.email.toLowerCase() === trimmedEmail)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    const newUser = { name: trimmedName, email: trimmedEmail, password, role: role || 'Fleet Operator' };
    const updated = [...loadRegisteredUsers(), newUser];
    saveRegisteredUsers(updated);

    const { password: _pw, ...sessionUser } = newUser;
    setUser(sessionUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { ok: true };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
