/**
 * ============================================================================
 * LOGIN PAGE COMPONENT
 * ============================================================================
 * 
 * Beautiful, animated authentication interface for Aurora LMS.
 * Supports three entity types with role-specific theming:
 * - Learner: Students who browse and purchase courses (emerald/teal theme)
 * - Instructor: Course creators who upload content (purple/fuchsia theme)
 * - Admin: System administrators with oversight (orange/rose theme)
 * 
 * Features:
 * - Dynamic role-based color transitions
 * - Smooth animated UI with Framer Motion
 * - Registration flow for new learners
 * - Demo credential hints for testing
 * - Form validation with error feedback
 * - Password visibility toggle
 * 
 * @author Aurora LMS Team
 * @version 2.1.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, ArrowRight, UserPlus, LogIn, GraduationCap, 
  Users, Shield, BookOpen, Zap, Eye, EyeOff, Loader2, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { register as registerApi } from '../api/lmsClient';

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

/**
 * Role metadata including colors, icons, and demo credentials
 * Each role has a unique visual identity for the login interface
 */
const roleMeta = {
  learner: { 
    label: 'Learner', 
    hint: 'manik / manik',
    icon: GraduationCap,
    description: 'Browse and purchase courses',
    gradient: 'from-emerald-500 to-teal-500',
    bgClass: 'role-bg-learner',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    borderColor: 'border-emerald-500/30'
  },
  instructor: { 
    label: 'Instructor', 
    hint: 'inst-1 / ratul-portal',
    icon: BookOpen,
    description: 'Upload content & manage sales',
    gradient: 'from-purple-500 to-fuchsia-500',
    bgClass: 'role-bg-instructor',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'border-purple-500/30'
  },
  admin: { 
    label: 'Admin', 
    hint: 'admin-1 / karypto',
    icon: Shield,
    description: 'System-wide oversight',
    gradient: 'from-orange-500 to-rose-500',
    bgClass: 'role-bg-admin',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    borderColor: 'border-orange-500/30'
  },
};

/**
 * Animation variants for staggered children animations
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// ============================================================================
// LOGIN COMPONENT
// ============================================================================

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Form state management
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ 
    role: 'learner', 
    identifier: '', 
    secret: '', 
    name: '', 
    email: '' 
  });
  const [status, setStatus] = useState({ info: '', error: '' });

  /**
   * Handle form input changes with validation
   * @param {string} field - Form field name
   * @param {string} value - New field value
   */
  const handleInputChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (status.error) setStatus({ info: '', error: '' });
  }, [status.error]);

  /**
   * Handle authentication (login or registration)
   * Validates form, calls API, and redirects on success
   * @param {Event} e - Form submit event
   */
  const handleAuth = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (isRegistering) {
      if (!form.name.trim()) {
        setStatus({ info: '', error: 'Please enter your name' });
        return;
      }
      if (!form.secret.trim()) {
        setStatus({ info: '', error: 'Please create a password' });
        return;
      }
    } else {
      if (!form.identifier.trim()) {
        setStatus({ info: '', error: 'Please enter your username/ID' });
        return;
      }
      if (!form.secret.trim()) {
        setStatus({ info: '', error: 'Please enter your password' });
        return;
      }
    }
    
    setIsLoading(true);
    setStatus({ info: '', error: '' });
    
    try {
      let result;
      
      if (isRegistering) {
        // Registration flow - create new learner account
        const regPayload = {
          name: form.name.trim(),
          email: form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, '')}@aurora.ui`,
          secret: form.secret,
          role: 'learner',
        };
        
        await registerApi(regPayload);
        
        // Auto-login after successful registration
        result = await login({ 
          role: 'learner', 
          identifier: regPayload.name, 
          secret: form.secret 
        });
      } else {
        // Standard login flow
        result = await login({
          role: form.role,
          identifier: form.identifier.trim(),
          secret: form.secret
        });
      }

      // On success, navigate to the appropriate dashboard
      const targetRole = result?.role || form.role;
      navigate(`/${targetRole}`);
      
    } catch (err) {
      console.error('Auth error:', err);
      setStatus({ 
        info: '', 
        error: err.message || 'Authentication failed. Please check your credentials.' 
      });
    } finally {
      // Ensure loading state is always reset, even if something unexpected happens
      setIsLoading(false);
    }
  };

  /**
   * Toggle between login and registration modes
   * Resets form state when switching
   */
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setForm({ role: 'learner', identifier: '', secret: '', name: '', email: '' });
    setStatus({ info: '', error: '' });
  };

  const clearStatus = () => setStatus({ info: '', error: '' });
  const currentRole = roleMeta[form.role];
  
  // Memoized role-specific styles for performance
  const roleStyles = useMemo(() => ({
    glowStyle: { boxShadow: `0 0 60px ${currentRole.glowColor}` },
    accentStyle: { color: currentRole.accentColor }
  }), [currentRole]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      {/* Error/Info Toast */}
      <AnimatePresence>
        {(status.error || status.info) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl backdrop-blur-xl border flex items-center gap-3 shadow-2xl ${
              status.error 
                ? 'bg-red-950/90 border-red-500/30 text-red-200' 
                : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <span className="text-sm font-medium">{status.error || status.info}</span>
            <button onClick={clearStatus} className="ml-2 hover:opacity-70">×</button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Login Card with Role-based Background */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl"
      >
        {/* Dynamic Role Background - Transitions with role selection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={form.role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 ${currentRole.bgClass}`}
          />
        </AnimatePresence>
        
        {/* Animated Glow Orbs */}
        <motion.div 
          key={`glow-${form.role}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 0.5, 0.3], 
            scale: [1, 1.2, 1],
            x: [0, 10, 0],
            y: [0, -10, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: currentRole.glowColor }}
        />
        <motion.div 
          key={`glow2-${form.role}`}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.4, 0.2], 
            scale: [1.2, 1, 1.2] 
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: currentRole.glowColor }}
        />

        {/* Header Section */}
        <div className="relative p-8 pb-6">
          <div className="text-center">
            <motion.div 
              className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${currentRole.gradient} mb-4 shadow-lg`}
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
              key={`icon-${form.role}`}
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-display text-white tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Aurora <motion.span 
                key={form.role}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: currentRole.accentColor }}
              >LMS</motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-white/50 mt-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {isRegistering ? 'Create your learning account' : 'Sign in to continue learning'}
            </motion.p>
          </div>
        </div>

        <div className="relative px-8 pb-8">
          {/* Role Selector (Login mode only) */}
          <AnimatePresence mode="wait">
            {!isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <label className="block text-xs uppercase tracking-widest text-white/40 mb-3 font-medium">
                  Select Your Role
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(roleMeta).map(([role, meta]) => {
                    const Icon = meta.icon;
                    const isActive = form.role === role;
                    
                    return (
                      <motion.button
                        type="button"
                        key={role}
                        onClick={() => handleInputChange('role', role)}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative overflow-hidden rounded-xl p-4 text-center transition-all duration-300 border ${
                          isActive 
                            ? `bg-gradient-to-br ${meta.gradient} border-white/30 shadow-lg` 
                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 transition-all duration-300 ${
                          isActive ? 'text-white scale-110' : 'text-white/50'
                        }`} />
                        <span className={`block text-xs font-semibold transition-colors ${
                          isActive ? 'text-white' : 'text-white/50'
                        }`}>
                          {meta.label}
                        </span>
                        <span className={`block text-[10px] mt-1 transition-colors ${
                          isActive ? 'text-white/70' : 'text-white/30'
                        }`}>
                          {meta.description}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                
                {/* Role hint with animation */}
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={form.role}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <p className="text-xs text-white/50 text-center flex items-center justify-center gap-2">
                      <Zap className="w-3 h-3" style={{ color: currentRole.accentColor }} />
                      Demo credentials: 
                      <code 
                        className="px-2 py-0.5 rounded font-mono text-xs"
                        style={{ background: `${currentRole.accentColor}20`, color: currentRole.accentColor }}
                      >
                        {currentRole.hint}
                      </code>
                    </p>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            {/* Name field (Registration only) */}
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">
                    Full Name
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="input-glass pl-12"
                      autoComplete="name"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-white/5 group-focus-within:bg-white/10 transition-colors">
                      <User className="w-4 h-4 text-white/40 group-focus-within:text-white/70" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Identifier field (Login only) */}
            <AnimatePresence mode="wait">
              {!isRegistering && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">
                    {form.role === 'learner' ? 'Username' : 'Identifier'}
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder={`Enter your ${form.role === 'learner' ? 'username' : 'ID'}`}
                      value={form.identifier}
                      onChange={(e) => handleInputChange('identifier', e.target.value)}
                      className="input-glass pl-12"
                      autoComplete="username"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-white/5 group-focus-within:bg-white/10 transition-colors">
                      {React.createElement(currentRole.icon, { 
                        className: "w-4 h-4 text-white/40 group-focus-within:text-white/70 transition-colors",
                        style: { color: form.identifier ? currentRole.accentColor : undefined }
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password field */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">
                {isRegistering ? 'Create Password' : 'Password'}
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegistering ? 'Choose a secure password' : 'Enter your password'}
                  value={form.secret}
                  onChange={(e) => handleInputChange('secret', e.target.value)}
                  className="input-glass pl-12 pr-12"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-white/5 group-focus-within:bg-white/10 transition-colors">
                  <Shield className="w-4 h-4 text-white/40 group-focus-within:text-white/70" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02, y: isLoading ? 0 : -2 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className={`group relative w-full overflow-hidden rounded-2xl py-4 font-bold transition-all duration-300 mt-6 ${
                isLoading 
                  ? 'bg-white/10 text-white/60 cursor-wait border border-white/10' 
                  : `bg-gradient-to-r ${currentRole.gradient} text-white hover:shadow-xl`
              }`}
              style={!isLoading ? { boxShadow: `0 10px 40px -10px ${currentRole.glowColor}` } : {}}
            >
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isRegistering ? 'Creating Account...' : 'Signing In...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <motion.button
              type="button"
              onClick={toggleMode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white transition-colors py-3 rounded-xl hover:bg-white/5"
            >
              {isRegistering ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Already have an account?</span>
                  <span className="font-semibold" style={{ color: currentRole.accentColor }}>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>New learner?</span>
                  <span className="font-semibold text-emerald-400">Create Account</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
