/**
 * ============================================================================
 * LEARNER DASHBOARD COMPONENT
 * ============================================================================
 * 
 * Main interface for learners to interact with the Aurora LMS platform.
 * This dashboard provides a comprehensive learning experience with:
 * 
 * Features:
 * - Bank/Wallet configuration for credit-based transactions
 * - Course catalog with purchase workflow and secret validation
 * - My Learning section for enrolled courses with progress tracking
 * - Course materials modal with video, audio, text, and assessments
 * - Certificate gallery for completed courses
 * - Real-time status notifications and loading states
 * - Animated transitions and micro-interactions
 * 
 * Workflow:
 * 1. First-time users configure their wallet (bank account + secret)
 * 2. Browse available courses in the catalog
 * 3. Purchase courses using credits (requires secret confirmation)
 * 4. Wait for instructor validation (course shows as "Pending")
 * 5. Access course materials once validated
 * 6. Complete course and earn certificate
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, CreditCard, Shield, Banknote, GraduationCap,
  Eye, LogOut, LayoutGrid, Wallet, Award, Lock, Clock, CheckCircle2,
  PlayCircle, Sparkles, ChevronRight, Star, Users, Timer, TrendingUp, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  fetchCourses, fetchLearner, configureLearnerBank,
  enrollLearnerCourse, completeLearnerCourse
} from '../api/lmsClient';
import { getCertificatePdfUrl } from '../api/lmsClient';
import { StatGlint } from '../components/StatGlint';
import { NotificationBanner } from '../components/NotificationBanner';
import { CourseMaterialsModal } from '../components/CourseMaterialsModal';

// ============================================================================
// SUB-COMPONENTS FOR DASHBOARD SECTIONS
// ============================================================================

/**
 * WalletSection Component
 * Displays learner's credit balance and wallet configuration form
 * Features animated balance display and secure credential management
 */
const WalletSection = ({ bankAccount, onSetup, form, setForm }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="max-w-2xl mx-auto space-y-6"
  >
    {/* Credit Balance Card */}
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-white/5 to-teal-500/10 p-8 backdrop-blur-xl text-center">
      {/* Animated background glow */}
      <motion.div 
        className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
      
      <div className="relative">
        <motion.div 
          className="inline-flex p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 border border-emerald-500/20"
          whileHover={{ scale: 1.05, rotate: 5 }}
        >
          <Wallet className="w-8 h-8" />
        </motion.div>
        
        <motion.h2 
          className="text-5xl font-display text-white mb-2 tracking-tight"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {bankAccount?.available?.toLocaleString() || 0}
          <span className="text-2xl text-white/60 ml-2">credits</span>
        </motion.h2>
        
        <p className="text-white/50 flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Available Balance
        </p>
      </div>
    </div>

    {/* Wallet Configuration Card */}
    <motion.div 
      className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
        <Shield className="w-5 h-5 text-aurora-mint" /> Wallet Configuration
      </h3>
      <p className="text-sm text-white/40 mb-6">
        Manage your vault credentials for secure transactions.
      </p>
      
      <form onSubmit={onSetup} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Account Number</label>
            <input
              value={form.bankAccount}
              onChange={e => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="e.g., vault-001"
              className="input-glass w-full"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">Secret Phrase</label>
            <input
              type="password"
              value={form.bankSecret}
              onChange={e => setForm({ ...form, bankSecret: e.target.value })}
              placeholder="Your secure passphrase"
              className="input-glass w-full"
            />
          </div>
        </div>
        <motion.button 
          type="submit" 
          className="btn-primary w-full"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Sparkles className="w-4 h-4 mr-2 inline" />
          Update Credentials
        </motion.button>
      </form>
    </motion.div>
  </motion.div>
);

/**
 * CatalogSection Component
 * Displays available courses with purchase workflow
 * Features course cards with images, pricing, and purchase confirmation
 */
const CatalogSection = ({ courses, learner, onPurchase, form, setForm }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-6"
  >
    {/* Section Header */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-display text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-aurora-amber" />
          Available Courses
        </h2>
        <p className="text-sm text-white/40 mt-1">{courses.length} courses ready to explore</p>
      </div>
    </div>

    {/* Course Grid */}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, index) => {
        const isEnrolled = learner?.enrolledCourses?.some((c) => (typeof c === 'string' ? c : c?.id) === course.id);
        const isCompleted = learner?.completedCourses?.some((c) => (typeof c === 'string' ? c : c?.id) === course.id);
        const isPending = learner?.pendingCourses?.some((pending) => {
          if (pending?.courseId !== course.id) return false;
          return pending?.transaction?.status !== 'settled';
        });
        
        return (
          <motion.div 
            key={course.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 hover:shadow-glass transition-all duration-300"
          >
            {/* Course Image */}
            <div className="h-44 relative overflow-hidden">
              <img 
                src={course.heroImage} 
                alt={course.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              {/* Category Badge */}
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/10">
                {course.category}
              </span>
              
              {/* Price Badge */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <CreditCard className="w-3 h-3 text-aurora-mint" />
                <span className="text-sm font-bold text-white">{course.price}</span>
              </div>
              
              {/* Duration Badge */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/70 text-xs">
                <Timer className="w-3 h-3" />
                {course.duration}
              </div>
            </div>
            
            {/* Course Info */}
            <div className="p-5 flex-1 flex flex-col">
              <h4 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-aurora-mint transition-colors">
                {course.title}
              </h4>
              <p className="text-sm text-white/50 mb-4 line-clamp-2">{course.description}</p>
              
              {/* Instructor Info */}
              {course.instructor && (
                <div className="flex items-center gap-2 mb-4">
                  <img 
                    src={course.instructor.avatar} 
                    alt={course.instructor.name}
                    className="w-6 h-6 rounded-full border border-white/20"
                  />
                  <span className="text-xs text-white/50">{course.instructor.name}</span>
                </div>
              )}
              
              {/* Action Area */}
              <div className="mt-auto pt-4 border-t border-white/10">
                {isCompleted ? (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-bold border border-emerald-500/20">
                    <Award className="w-4 h-4" /> Completed
                  </div>
                ) : isEnrolled ? (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-bold border border-blue-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Enrolled
                  </div>
                ) : isPending ? (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold border border-amber-500/20">
                    <Clock className="w-4 h-4 animate-pulse" /> Pending Validation
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="wait">
                      {form.selectedCourse === course.id ? (
                        <motion.div 
                          key="confirm"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <input 
                            type="password" 
                            placeholder="Enter your wallet secret" 
                            className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-aurora-mint/50 focus:outline-none"
                            value={form.courseSecret}
                            onChange={e => setForm({...form, courseSecret: e.target.value})}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <motion.button 
                              onClick={onPurchase} 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex-1 bg-gradient-to-r from-aurora-mint to-emerald-400 text-black text-sm font-bold py-2.5 rounded-xl hover:shadow-lg hover:shadow-aurora-mint/20 transition-all"
                            >
                              Confirm Purchase
                            </motion.button>
                            <button 
                              onClick={() => setForm({...form, selectedCourse: '', courseSecret: ''})} 
                              className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.button 
                          key="buy"
                          onClick={() => setForm({...form, selectedCourse: course.id})} 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-aurora-mint transition-all flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-4 h-4" />
                          Purchase for {course.price} credits
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </motion.div>
);

/**
 * MyCoursesSection Component
 * Displays learner's enrolled courses with progress indicators
 * Allows quick access to course materials
 */
const MyCoursesSection = ({ learner, onView }) => {
  const enrolledCourses = learner?.enrolledCourses || [];
  const completedCourses = learner?.completedCourses || [];
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            My Learning
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {enrolledCourses.length} active course{enrolledCourses.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {enrolledCourses.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white/60 mb-2">No courses yet</h3>
          <p className="text-white/40 text-sm">Browse the catalog to find your next learning adventure!</p>
        </motion.div>
      )}

      {/* Course Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses.map((course, index) => {
          const isCompleted = completedCourses.some(c => c.id === course.id);
          
          return (
            <motion.div 
              key={course.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => onView(course)}
              className="group relative rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
            >
              {/* Course Header */}
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-300'
                  }`}
                  whileHover={{ rotate: 5 }}
                >
                  {isCompleted ? <Award className="w-7 h-7" /> : <PlayCircle className="w-7 h-7" />}
                </motion.div>
                
                {isCompleted && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Done</span>
                  </motion.div>
                )}
              </div>
              
              {/* Course Info */}
              <h4 className="text-lg font-bold text-white group-hover:text-aurora-mint transition-colors mb-2">
                {course.title}
              </h4>
              <p className="text-sm text-white/40 mb-4">{course.category}</p>
              
              {/* Action Prompt */}
              <div className="flex items-center gap-2 text-sm text-white/50 group-hover:text-aurora-mint transition-colors">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                {isCompleted ? 'Review materials' : 'Continue learning'}
              </div>
              
              {/* Hover Gradient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-aurora-mint/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

/**
 * CertificateSection Component
 * Displays earned certificates with elegant card design
 * Features certificate details and achievement badges
 */
const CertificateSection = ({ certificates, learnerId, courses = [] }) => {
  const certs = certificates || [];
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-aurora-amber" />
            Achievements
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {certs.length} certificate{certs.length !== 1 ? 's' : ''} earned
          </p>
        </div>
      </div>

      {/* Empty State */}
      {certs.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Award className="w-16 h-16 mx-auto mb-4 text-white/20" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white/60 mb-2">No certificates yet</h3>
          <p className="text-white/40 text-sm">Complete a course to earn your first certificate!</p>
        </motion.div>
      )}

      {/* Certificates Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {certs.map((cert, index) => {
          const course = courses.find((c) => c.id === cert.courseId);

          return (
          <motion.div 
            key={cert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/5 via-white/5 to-orange-500/5 p-6"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-2xl" />
            
            <div className="relative flex items-start gap-5">
              {/* Certificate Icon */}
              <motion.div 
                className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0"
                whileHover={{ rotate: 10 }}
              >
                <Award className="w-10 h-10" />
              </motion.div>
              
              {/* Certificate Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Certified
                  </span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                
                <h4 className="text-lg font-display text-white mb-1 truncate">
                  Course: {course?.title || cert.courseId}
                </h4>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Verified
                  </span>
                </div>

                <div className="mt-4">
                  <a
                    href={getCertificatePdfUrl(learnerId, cert.id)}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
            
            {/* Hover Effect */}
            <div className="absolute inset-0 rounded-3xl border-2 border-amber-500/0 group-hover:border-amber-500/20 transition-colors pointer-events-none" />
          </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// --- Main Component ---

export default function LearnerDashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('catalog');
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const [courses, setCourses] = useState([]);
  const [learner, setLearner] = useState(null);
  const [bankAccount, setBankAccount] = useState(null);
  const [status, setStatus] = useState({ info: '', error: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingCourse, setViewingCourse] = useState(null);
  
  const [form, setForm] = useState({
    bankAccount: '',
    bankSecret: '',
    courseSecret: '',
    selectedCourse: '',
  });

  const refreshData = useCallback(async (showMessage = false) => {
    if (showMessage) setIsRefreshing(true);
    try {
      const [cRes, lRes] = await Promise.all([
        fetchCourses(),
        fetchLearner(session.profile.id),
      ]);
      setCourses(cRes.courses || []);
      setLearner(lRes.learner);
      setBankAccount(lRes.bankAccount || null);

      if (showMessage) {
        setStatus({ info: 'Dashboard synchronized', error: '' });
        setTimeout(() => setStatus({ info: '', error: '' }), 2000);
      }
      
      // Check for first-time setup
      if (!lRes.learner.bankAccount) {
        setShowSetupModal(true);
      }
    } catch (err) {
      const msg = err?.message || 'Failed to load data';
      setStatus({ info: '', error: msg });
    } finally {
      setIsRefreshing(false);
    }
  }, [session.profile.id]);

  useEffect(() => { refreshData(false); }, [refreshData]);

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      const isFirstTimeSetup = !learner?.bankAccount?.accountNumber;
      await configureLearnerBank(session.profile.id, {
        accountNumber: form.bankAccount,
        secret: form.bankSecret,
        initialCredits: isFirstTimeSetup ? 1000 : undefined,
        creditLimit: isFirstTimeSetup ? 500 : undefined,
      });
      await refreshData();
      setShowSetupModal(false);
      setStatus({
        info: isFirstTimeSetup ? 'Wallet configured successfully! +1000 Credits' : 'Wallet updated successfully!',
        error: '',
      });
    } catch (err) {
      setStatus({ info: '', error: err.message });
    }
  };

  const handlePurchase = async () => {
    try {
      await enrollLearnerCourse(session.profile.id, {
        courseId: form.selectedCourse,
        secret: form.courseSecret,
      });
      await refreshData();
      setForm({ ...form, selectedCourse: '', courseSecret: '' });
      setStatus({ info: 'Purchase successful. Awaiting payout request + admin approval + instructor validation.', error: '' });
    } catch (err) {
      setStatus({ info: '', error: err.message });
    }
  };
  
  const handleComplete = async (courseId, answer) => {
    try {
        await completeLearnerCourse(session.profile.id, { courseId, answer });
        await refreshData();
        setViewingCourse(null);
        setStatus({ info: 'Course Completed! Certificate Earned.', error: '' });
    } catch(err) {
        setStatus({ info: '', error: err.message });
        throw err;
    }
  };

  const tabs = [
    { id: 'catalog', label: 'Available Courses', icon: LayoutGrid },
    { id: 'my-courses', label: 'My Learning', icon: BookOpen },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  return (
    <div className="min-h-screen pb-20">
      <NotificationBanner {...status} onClose={() => setStatus({info:'', error:''})} />
      
      <CourseMaterialsModal 
        course={viewingCourse}
        isOpen={!!viewingCourse}
        onClose={() => setViewingCourse(null)}
        onComplete={(answer) => handleComplete(viewingCourse?.id, answer)}
        isCompleted={learner?.completedCourses?.some(c => c.id === viewingCourse?.id)}
      />

      {/* First Time Setup Modal */}
      <AnimatePresence>
        {showSetupModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1e] p-8 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="inline-flex p-4 rounded-full bg-aurora-mint/10 text-aurora-mint mb-4"><Shield className="w-8 h-8" /></div>
                <h2 className="text-2xl font-display text-white">Setup Your Wallet</h2>
                <p className="text-white/60 mt-2 text-sm">To begin learning, create your unique vault credentials.</p>
              </div>
              <form onSubmit={handleSetup} className="space-y-4">
                <input required value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} placeholder="Choose Account Name (e.g. vault-01)" className="input-glass w-full" />
                <input required type="password" value={form.bankSecret} onChange={e => setForm({...form, bankSecret: e.target.value})} placeholder="Set Secret Code" className="input-glass w-full" />
                <button type="submit" className="btn-primary w-full">Initialize Wallet</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-display text-white">Hello, {session.profile.name}</h1>
            <p className="text-white/50 text-sm">Learner Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => refreshData(true)}
            disabled={isRefreshing}
            className={`p-2 rounded-full border border-white/20 transition-all ${
              isRefreshing
                ? 'text-aurora-mint border-aurora-mint/50'
                : 'text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>

          <button
            onClick={() => { logout(); navigate('/'); }}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
              <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.id 
                    ? 'bg-white text-black shadow-lg shadow-white/10' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
            >
                <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {activeTab === 'wallet' && (
                <WalletSection bankAccount={bankAccount} onSetup={handleSetup} form={form} setForm={setForm} />
            )}
            {activeTab === 'catalog' && (
                <CatalogSection courses={courses} learner={learner} onPurchase={handlePurchase} form={form} setForm={setForm} />
            )}
            {activeTab === 'my-courses' && (
                <MyCoursesSection learner={learner} onView={setViewingCourse} />
            )}
            {activeTab === 'certificates' && (
                <CertificateSection
                  certificates={learner?.certificates}
                  learnerId={session.profile.id}
                  courses={courses}
                />
            )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}