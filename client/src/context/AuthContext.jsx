/**
 * Authentication Context
 * Manages user session state across the application
 * Provides login, logout, and session persistence via localStorage
 * Includes offline fallback mode for demo purposes
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { login as loginApi } from '../api/lmsClient';

// Create context for sharing auth state globally
const AuthContext = createContext(null);

// Provider component that wraps the app and manages auth state
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null); // Current user session
  const [loading, setLoading] = useState(true); // Loading state during initialization

  // On mount, check localStorage for existing session
  useEffect(() => {
    const stored = localStorage.getItem('aurora_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.token === 'demo-token') {
          localStorage.removeItem('aurora_session');
        } else {
          setSession(parsed);
        }
      } catch (e) {
        // Clear corrupted session data
        localStorage.removeItem('aurora_session');
      }
    }
    setLoading(false);
  }, []);

  // Login handler - attempts API call, falls back to demo mode if offline
  const login = async (credentials) => {
    try {
      const data = await loginApi(credentials);
      setSession(data);
      localStorage.setItem('aurora_session', JSON.stringify(data));
      return data;
    } catch (error) {
      const message = error?.message || '';
      const isOffline = message.includes('Cannot connect to server');
      if (!isOffline) throw error;

      const normalize = (value) => String(value ?? '').trim().toLowerCase();

      const demoUsers = {
        learner: [
          { identifier: 'maya', secret: 'maya-pass', profile: { id: 'learner-1', name: 'Maya Idris (Demo)', email: 'maya@aurora.ui' } },
          { identifier: 'manik', secret: 'manik', profile: { id: 'learner-1', name: 'Manik (Demo)', email: 'manik@aurora.ui' } },
          { identifier: 'nazrul', secret: 'nazrul', profile: { id: 'learner-2', name: 'Nazrul (Demo)', email: 'nazrul@aurora.ui' } },
        ],
        instructor: [
          { identifier: 'inst-1', secret: 'asha-portal', profile: { id: 'inst-1', name: 'Dr. Asha Ray (Demo)', email: 'asha@aurora.ui' } },
          { identifier: 'inst-1', secret: 'ratul-portal', profile: { id: 'inst-1', name: 'Ratul (Demo)', email: 'ratul@aurora.ui' } },
          { identifier: 'inst-2', secret: 'nazmul-portal', profile: { id: 'inst-2', name: 'Nazmul (Demo)', email: 'nazmul@aurora.ui' } },
          { identifier: 'inst-3', secret: 'deen-portal', profile: { id: 'inst-3', name: 'Deen (Demo)', email: 'deen@aurora.ui' } },
        ],
        admin: [
          { identifier: 'admin-1', secret: 'aurora-admin', profile: { id: 'admin-1', name: 'Nova Sterling (Demo)', email: 'admin@aurora.ui' } },
          { identifier: 'admin-1', secret: 'karypto', profile: { id: 'admin-1', name: 'Karypto (Demo)', email: 'karypto@aurora.ui' } },
        ],
      };

      const candidates = demoUsers[credentials.role] || [];
      const match = candidates.find(
        (candidate) =>
          normalize(candidate.identifier) === normalize(credentials.identifier) && candidate.secret === credentials.secret,
      );

      if (!match) {
        throw error;
      }

      const mockSession = {
        token: 'demo-token',
        role: credentials.role,
        profile: match.profile,
      };

      setSession(mockSession);
      localStorage.setItem('aurora_session', JSON.stringify(mockSession));
      return mockSession;
    }
  };

  // Logout handler - clears session and localStorage
  const logout = () => {
    setSession(null);
    localStorage.removeItem('aurora_session');
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated: !!session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context
export const useAuth = () => useContext(AuthContext);
