/**
 * AuthContext — Role-based session state with Real Backend JWT Integration
 *
 * Connects to OMEGA SPA POS Backend (/api/v1/auth)
 * Roles:
 *   - manager:    Full access
 *   - reception:  Clients, Appointments, Referrals, Rebooking, Invoices, Expenses, Attendance
 *   - technician: Own Appointments, Close Service, Own Daily Summary, Shared Work, Attendance
 *   - cleaner:    Cleaning Upload only
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, usersApi, setToken, getToken } from '../services/api';

const AuthContext = createContext();

export const DEMO_USERS = [
  { id: 'mgr-1', name: 'Manager',   email: 'manager@gmail.com',   username: 'manager',   role: 'manager',    specialties: [], active: true },
  { id: 'rec-1', name: 'Reception', email: 'reception@gmail.com', username: 'reception', role: 'reception',  specialties: [], active: true },
  { id: 'tech-1', name: 'Amina',     email: 'amina@gmail.com',     username: 'amina',     role: 'technician', specialties: ['Nails'], active: true },
  { id: 'tech-2', name: 'Bella',     email: 'bella@gmail.com',     username: 'bella',     role: 'technician', specialties: ['Facial', 'Massage'], active: true },
  { id: 'cln-1', name: 'Sarah',     email: 'cleaner@gmail.com',   username: 'cleaner',   role: 'cleaner',    specialties: [], active: true },
];

const MANAGER_ROUTES = [
  '/', '/dashboard', '/clients', '/clients/new', '/clients/:id',
  '/appointments', '/appointments/new', '/appointments/:id',
  '/appointments/:id/late', '/appointments/:id/no-show', '/appointments/:id/close',
  '/stock', '/technicians/daily', '/referrals', '/rebooking', '/daily-close',
  '/staff', '/services', '/cleaning-records', '/loyalty-settings', '/social-media',
  '/whatsapp-automations', '/client-feedback', '/invoices', '/products',
  '/retail', '/shared-work', '/expenses', '/expenses/new', '/attendance', '/attendance/manager',
];

const RECEPTION_ROUTES = [
  '/clients', '/clients/new', '/clients/:id',
  '/appointments', '/appointments/new', '/appointments/:id',
  '/appointments/:id/late', '/appointments/:id/no-show',
  '/referrals', '/rebooking', '/invoices', '/expenses', '/expenses/new', '/attendance',
  '/whatsapp-automations',
];

const TECHNICIAN_ROUTES = [
  '/', '/dashboard', '/appointments', '/appointments/:id', '/appointments/:id/close',
  '/clients/:id', '/technicians/daily', '/shared-work', '/attendance',
];

const CLEANER_ROUTES = [
  '/cleaning',
];

export const ROLE_ROUTES = {
  manager: MANAGER_ROUTES,
  MANAGER: MANAGER_ROUTES,
  reception: RECEPTION_ROUTES,
  RECEPTION: RECEPTION_ROUTES,
  technician: TECHNICIAN_ROUTES,
  TECHNICIAN: TECHNICIAN_ROUTES,
  cleaner: CLEANER_ROUTES,
  CLEANER: CLEANER_ROUTES,
};

export const ROLE_HOME = {
  manager: '/',
  MANAGER: '/',
  reception: '/appointments',
  RECEPTION: '/appointments',
  technician: '/',
  TECHNICIAN: '/',
  cleaner: '/cleaning',
  CLEANER: '/cleaning',
};

function matchRoute(path, pattern) {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (pathParts.length !== patternParts.length) return false;
  return patternParts.every(
    (part, i) => part.startsWith(':') || part === pathParts[i]
  );
}

export function isRouteAllowed(role, path) {
  if (!role) return false;
  const normalizedRole = String(role).toLowerCase();
  const allowedRoutes = ROLE_ROUTES[normalizedRole] || [];
  return allowedRoutes.some((pattern) => matchRoute(path, pattern));
}

function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const rawRole = String(rawUser.role || 'technician');
  const roleLower = rawRole.toLowerCase();
  return {
    ...rawUser,
    id: rawUser.id || rawUser.userId,
    name: rawUser.name || rawUser.staffProfile?.name || rawUser.email?.split('@')[0] || 'User',
    email: rawUser.email || '',
    role: roleLower,
    originalRole: rawRole.toUpperCase(),
    staffProfile: rawUser.staffProfile || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // Fetch staff users from backend database (single source of truth)
  const refreshUsers = useCallback(async () => {
    if (!getToken()) {
      return [];
    }
    try {
      setError(null);
      const res = await usersApi.getAll();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        const normalized = list.map((u) => ({
          ...u,
          id: u.id || u.userId,
          name: u.name || u.staffProfile?.name || u.email?.split('@')[0],
          email: u.email || '',
          username: u.username || u.phone || u.email?.split('@')[0] || '',
          role: (u.role?.name || u.role || 'technician').toLowerCase(),
          specialties: Array.isArray(u.specialties)
            ? u.specialties
            : Array.isArray(u.staffProfile?.specialties)
            ? u.staffProfile.specialties
            : [],
          active: u.isActive !== undefined ? u.isActive : u.active !== false,
        }));
        setAllUsers(normalized);
        return normalized;
      }
    } catch (err) {
      console.error('Failed to fetch staff from backend database:', err.message);
      setError(err.message || 'Failed to connect to backend server');
    }
    return [];
  }, []);

  // Clear any legacy localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem('omega_staff_users');
    } catch (e) {}
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    async function restoreSession() {
      const existingToken = getToken();
      if (!existingToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        const userData = res?.data || res;
        if (userData && (userData.email || userData.id)) {
          setUser(normalizeUser(userData));
          // Attempt background sync of users
          refreshUsers();
        } else {
          setToken(null);
        }
      } catch (err) {
        console.warn('Failed to restore session:', err.message);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [refreshUsers]);

  const login = useCallback(async (emailOrUsername, password) => {
    const input = (emailOrUsername || '').trim();
    let email = input;
    if (!email.includes('@')) {
      const lower = input.toLowerCase();
      if (lower === 'manager') email = 'manager@gmail.com';
      else if (lower === 'reception') email = 'reception@gmail.com';
      else if (lower === 'amina') email = 'amina@gmail.com';
      else if (lower === 'bella') email = 'bella@gmail.com';
      else if (lower === 'cleaner') email = 'cleaner@gmail.com';
    }

    try {
      const res = await authApi.login(email, password);
      const token = res?.data?.token || res?.token;
      const apiUser = res?.data?.user || res?.user;

      if (token && apiUser) {
        setToken(token);
        const norm = normalizeUser(apiUser);
        setUser(norm);
        refreshUsers();
        return norm;
      }
    } catch (apiError) {
      throw apiError;
    }

    return null;
  }, [refreshUsers]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAllUsers([]);
  }, []);

  const addUser = useCallback(async (userData) => {
    const payload = {
      name: userData.name?.trim(),
      username: (userData.username || userData.name || '').trim().toLowerCase().replace(/\s+/g, ''),
      role: userData.role,
      specialties: userData.role === 'technician' ? (userData.specialties || []) : [],
      password: userData.password || '123456',
    };

    const res = await usersApi.create(payload);
    await refreshUsers();
    return res?.data || res;
  }, [refreshUsers]);

  const editUser = useCallback(async (userId, updates) => {
    const payload = {
      name: updates.name?.trim(),
      username: updates.username ? updates.username.trim().toLowerCase().replace(/\s+/g, '') : undefined,
      role: updates.role,
      specialties: updates.role === 'technician' ? (updates.specialties || []) : [],
      ...(updates.password ? { password: updates.password.trim() } : {}),
      ...(updates.active !== undefined ? { active: updates.active } : {}),
    };

    await usersApi.update(userId, payload);
    await refreshUsers();

    // If current logged in user was edited, update current session state as well
    setUser((curr) => {
      if (curr && (curr.id === userId || String(curr.id) === String(userId))) {
        return {
          ...curr,
          ...updates,
          specialties: updates.specialties !== undefined ? updates.specialties : curr.specialties,
        };
      }
      return curr;
    });
  }, [refreshUsers]);

  const deactivateUser = useCallback(async (userId) => {
    await usersApi.update(userId, { active: false });
    await refreshUsers();
  }, [refreshUsers]);

  const activateUser = useCallback(async (userId) => {
    await usersApi.update(userId, { active: true });
    await refreshUsers();
  }, [refreshUsers]);

  const resetUserPassword = useCallback(async (userId, newPassword) => {
    await usersApi.update(userId, { password: newPassword });
    await refreshUsers();
  }, [refreshUsers]);

  const deleteUser = useCallback(async (userId) => {
    await usersApi.delete(userId);
    await refreshUsers();
  }, [refreshUsers]);

  const toggleUserActive = useCallback(async (userId) => {
    const target = allUsers.find((u) => u.id === userId);
    const targetActive = target ? !target.active : true;
    await usersApi.update(userId, { active: targetActive });
    await refreshUsers();
  }, [allUsers, refreshUsers]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        error,
        login,
        logout,
        allUsers,
        addUser,
        editUser,
        deleteUser,
        deactivateUser,
        activateUser,
        resetUserPassword,
        refreshUsers,
        toggleUserActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
