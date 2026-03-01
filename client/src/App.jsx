/**
 * Main Application Component
 * Configures React Router with role-based protected routes
 * Wraps app in AuthProvider for global session management
 * Applies Aurora theme background to all pages
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuroraBackground } from './components/AuroraBackground';
import Login from './pages/Login';
import LearnerDashboard from './pages/LearnerDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

/**
 * Protected Route Component
 * Ensures user is authenticated before accessing a page
 * Redirects to correct dashboard if user has wrong role
 */
const ProtectedRoute = ({ children, allowedRole }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking session
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white/50">Initializing simulation...</div>;
  }

  // Redirect to login if not authenticated
  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Redirect to correct dashboard if role mismatch
  if (allowedRole && session.role !== allowedRole) {
    return <Navigate to={`/${session.role}`} replace />;
  }

  return children;
};

// Route configuration for all application pages
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route 
        path="/learner" 
        element={
          <ProtectedRoute allowedRole="learner">
            <LearnerDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/instructor" 
        element={
          <ProtectedRoute allowedRole="instructor">
            <InstructorDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Main app wrapper with providers and routing
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuroraBackground>
          <AppRoutes />
        </AuroraBackground>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
