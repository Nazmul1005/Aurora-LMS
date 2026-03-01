/**
 * ============================================================================
 * ADMIN DASHBOARD COMPONENT
 * ============================================================================
 * 
 * System administrator interface for complete LMS oversight.
 * This dashboard provides comprehensive system monitoring and management:
 * 
 * Features:
 * - System-wide metrics (courses, learners, instructors, transactions)
 * - Organization credit vault with real-time balance
 * - Complete transaction ledger with status tracking
 * - Real-time data refresh capability
 * - Course and user overview
 * 
 * Access Level:
 * - Full visibility into all system transactions
 * - Organization bank account monitoring
 * - User and course statistics aggregation
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, CreditCard, Activity, LogOut, RefreshCw,
  Shield, Clock, Loader2, X, PlayCircle, FileText, Music
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { approveAdminPayouts, fetchAdminDashboard, rejectAdminPayouts, updateAdminCourseMaterials } from '../api/lmsClient';
import { NotificationBanner } from '../components/NotificationBanner';

// Fallback data for offline/demo mode
const FALLBACK_ADMIN = {
  admin: { id: 'admin-1', name: 'Admin', email: 'admin@aurora.ui', role: 'admin' },
  metrics: { courseCount: 0, learnerCount: 0, instructorCount: 0, pendingTransactions: 0 },
  organization: { bankAccount: { credits: 0, available: 0, accountNumber: 'ACC-LMS-001' } },
  courses: [],
  instructors: [],
  learners: [],
  transactions: [],
};

const normalizeMaterialList = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
};

const getMaterialSrc = (material) => {
  if (!material) return '';
  if (Array.isArray(material)) return getMaterialSrc(material[0]);
  if (typeof material === 'string') return material;
  return String(material.dataUrl || '');
};

const getMaterialLabel = (material, fallback) => {
  if (!material) return fallback;
  if (Array.isArray(material)) return material.length ? `${material.length} items` : fallback;
  if (typeof material === 'string') return fallback;
  return material.name || fallback;
};

const getUrlDisplayName = (rawUrl, fallback = 'External file') => {
  const value = String(rawUrl || '').trim();
  if (!value) return fallback;
  if (value.startsWith('data:')) return fallback;
  try {
    const u = new URL(value);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last || u.hostname || fallback;
  } catch {
    const last = value.split('/').filter(Boolean).pop();
    return last || fallback;
  }
};

const downloadPlainText = (filename, content) => {
  const name = String(filename || 'notes.txt');
  const text = String(content || '');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const CourseDetailsModal = ({ course, isOpen, onClose, onRemoveMaterial, isUpdatingMaterials }) => {
  if (!course) return null;

  const videoItems = normalizeMaterialList(course.materials?.video);
  const audioItems = normalizeMaterialList(course.materials?.audio);
  const notesItems = normalizeMaterialList(course.materials?.text);
  const mcq = Array.isArray(course.materials?.mcq) ? course.materials.mcq : [];
  const firstQuestion = mcq.length ? mcq[0] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-aurora-mint truncate">{course.category}</p>
                <h2 className="text-2xl font-display text-white truncate">{course.title}</h2>
                <p className="mt-1 text-sm text-white/50 line-clamp-2">{course.description}</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-lg shadow-black/20">
                    <p className="text-xs uppercase tracking-widest text-white/40">Materials</p>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-purple-400" /> Video
                          </p>
                          {videoItems.length ? (
                            <div className="mt-2 space-y-2">
                              {videoItems.map((item, idx) => {
                                const href = getMaterialSrc(item);
                                if (!href || href === '#') return null;
                                return (
                                  <div key={`${href}-${idx}`} className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-white/70 truncate">
                                      {typeof item === 'string' ? getUrlDisplayName(item, 'Video') : getMaterialLabel(item, 'Video')}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <a
                                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                        href={href}
                                        download={typeof item === 'object' ? item?.name || 'video' : undefined}
                                        target={typeof item === 'string' ? '_blank' : undefined}
                                        rel="noreferrer"
                                      >
                                        Download
                                      </a>
                                      <button
                                        type="button"
                                        disabled={isUpdatingMaterials}
                                        onClick={() => onRemoveMaterial?.('video', idx)}
                                        className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-white/70">Not added</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Music className="h-4 w-4 text-pink-400" /> Audio
                          </p>
                          {audioItems.length ? (
                            <div className="mt-2 space-y-2">
                              {audioItems.map((item, idx) => {
                                const href = getMaterialSrc(item);
                                if (!href || href === '#') return null;
                                return (
                                  <div key={`${href}-${idx}`} className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-white/70 truncate">
                                      {typeof item === 'string' ? getUrlDisplayName(item, 'Audio') : getMaterialLabel(item, 'Audio')}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <a
                                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                        href={href}
                                        download={typeof item === 'object' ? item?.name || 'audio' : undefined}
                                        target={typeof item === 'string' ? '_blank' : undefined}
                                        rel="noreferrer"
                                      >
                                        Download
                                      </a>
                                      <button
                                        type="button"
                                        disabled={isUpdatingMaterials}
                                        onClick={() => onRemoveMaterial?.('audio', idx)}
                                        className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-white/70">Not added</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-400" /> Notes
                          </p>
                          {notesItems.length ? (
                            <div className="mt-2 space-y-2">
                              {notesItems.map((item, idx) => {
                                const isText = typeof item === 'string' && item.trim() && !(item.startsWith('http://') || item.startsWith('https://') || item.startsWith('data:'));
                                if (isText) {
                                  return (
                                    <div key={`notes-text-${idx}`} className="flex items-center justify-between gap-2">
                                      <p className="text-sm text-white/70 truncate">Text notes</p>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => downloadPlainText(`notes-${idx + 1}.txt`, item)}
                                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                          Download
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isUpdatingMaterials}
                                          onClick={() => onRemoveMaterial?.('text', idx)}
                                          className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                const href = getMaterialSrc(item);
                                if (!href || href === '#') return null;

                                return (
                                  <div key={`${href}-${idx}`} className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-white/70 truncate">
                                      {typeof item === 'string' ? getUrlDisplayName(item, 'Notes') : getMaterialLabel(item, 'Notes')}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <a
                                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                        href={href}
                                        download={typeof item === 'object' ? item?.name || 'notes' : undefined}
                                        target={typeof item === 'string' ? '_blank' : undefined}
                                        rel="noreferrer"
                                      >
                                        Download
                                      </a>
                                      <button
                                        type="button"
                                        disabled={isUpdatingMaterials}
                                        onClick={() => onRemoveMaterial?.('text', idx)}
                                        className="inline-flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-white/70">Not added</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-inner shadow-black/10">
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Course Snapshot</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Instructor</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {course.instructor?.name || course.instructorId || 'Unknown'}
                        </p>
                        <p className="text-xs text-white/40 truncate">{course.instructor?.email || '—'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Tuition</p>
                        <p className="mt-1 text-2xl font-display text-aurora-mint">{course.price} cr</p>
                        <p className="text-xs text-white/40">Duration: {course.duration || '—'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Category</p>
                        <p className="mt-1 text-sm font-semibold text-white">{course.category}</p>
                        <p className="text-xs text-white/40">Course ID: {course.id}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs text-white/40 uppercase tracking-widest">Enrolled Learners</p>
                        <p className="mt-1 text-3xl font-display text-white">
                          {Array.isArray(course.enrolledStudents) ? course.enrolledStudents.length : 0}
                        </p>
                        <p className="text-xs text-white/40">includes completed cohorts</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {Array.isArray(course.enrolledStudents) && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-inner shadow-black/20">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-white/40">Enrollment Roster</p>
                            <p className="text-sm text-white/60">
                              {course.enrolledStudents.length
                                ? 'Track individual learner progress'
                                : 'No learners enrolled yet'}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                            {course.enrolledStudents.length} learner
                            {course.enrolledStudents.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                          {course.enrolledStudents.length ? (
                            course.enrolledStudents.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                              >
                                <img
                                  src={student.avatar || `https://ui-avatars.com/api/?name=${student.name}`}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-full border border-white/10 object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{student.name}</p>
                                  <p className="text-xs text-white/40 truncate">{student.email}</p>
                                </div>
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    student.status === 'Completed'
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                  }`}
                                >
                                  {student.status || 'In Progress'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-white/50 italic text-center py-4">No enrollments yet</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
                      <p aclassName="text-xs uppercase tracking-widest text-white/40">MCQ</p>
                      {firstQuestion ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm text-white">{firstQuestion.question}</p>
                          <div className="space-y-1">
                            {(firstQuestion.options || []).map((opt) => (
                              <p key={opt} className="text-sm text-white/70">
                                {opt}
                              </p>
                            ))}
                          </div>
                          <p className="pt-2 text-xs text-white/50">
                            Correct: <span className="text-white/80">{firstQuestion.answer || '—'}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-white/40 italic">No MCQ configured.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN ADMIN DASHBOARD COMPONENT
// ============================================================================

export default function AdminDashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState({ info: '', error: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('courses');
  const [viewingCourse, setViewingCourse] = useState(null);
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isUpdatingMaterials, setIsUpdatingMaterials] = useState(false);
  
  /**
   * Fetch admin dashboard data from API or use fallback
   * Updates dashboard state and handles loading/error states
   */
  const refreshData = useCallback(async (showMessage = true) => {
    if (showMessage) setIsRefreshing(true);
    
    try {
      const data = await fetchAdminDashboard(session.profile.id);
      setDashboard(data);
      if (showMessage) {
        setStatus({ info: 'Dashboard synchronized', error: '' });
        setTimeout(() => setStatus({ info: '', error: '' }), 2000);
      }

      return data;
    } catch (err) {
      const msg = err?.message || 'Failed to load admin dashboard';
      if (msg.includes('Cannot connect to server')) {
        setDashboard(FALLBACK_ADMIN);
        setStatus({ info: '', error: 'Simulation Mode (API Unreachable)' });
      } else {
        setStatus({ info: '', error: msg });
      }

      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session.profile.id]);

  const syncViewingCourse = (data, courseId) => {
    if (!courseId) return;
    const next = (data?.courses || []).find((c) => c.id === courseId);
    if (next) setViewingCourse(next);
  };

  const handleRemoveMaterial = async (materialKey, index) => {
    if (!viewingCourse?.id) return;
    setIsUpdatingMaterials(true);
    setStatus({ info: 'Updating course materials...', error: '' });
    try {
      const existing = normalizeMaterialList(viewingCourse?.materials?.[materialKey]);
      const nextList = existing.filter((_, idx) => idx !== index);
      const payload = { materials: { [materialKey]: nextList.length ? nextList : null } };
      await updateAdminCourseMaterials(session.profile.id, viewingCourse.id, payload);
      const data = await refreshData(false);
      syncViewingCourse(data, viewingCourse.id);
      setStatus({ info: 'Material removed.', error: '' });
      setTimeout(() => setStatus({ info: '', error: '' }), 1500);
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to update materials' });
    } finally {
      setIsUpdatingMaterials(false);
    }
  };

  useEffect(() => {
    setSelectedTxIds([]);
  }, [activeSection]);

  // Initial data fetch
  useEffect(() => {
    refreshData(false);
  }, [refreshData]);

  /**
   * Format credit values for display
   * @param {number} val - Credit value to format
   * @returns {string} Formatted credit string
   */
  const formatCredits = (val) => `${val?.toLocaleString() ?? 0}`;

  const payoutRequests = (dashboard?.transactions || []).filter((tx) => tx.status === 'requested');
  const hasSelection = selectedTxIds.length > 0;

  const toggleSelectTx = (id) => {
    setSelectedTxIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllRequested = () => {
    setSelectedTxIds(payoutRequests.map((t) => t.id));
  };

  const clearSelection = () => {
    setSelectedTxIds([]);
  };

  const handleApprove = async () => {
    if (!hasSelection) return;
    setIsApproving(true);
    setStatus({ info: 'Approving payout requests...', error: '' });
    try {
      await approveAdminPayouts(session.profile.id, { transactionIds: selectedTxIds });
      await refreshData(false);
      setStatus({ info: 'Approved. Instructors can now validate and collect.', error: '' });
      clearSelection();
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to approve payouts' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!hasSelection) return;
    setIsRejecting(true);
    setStatus({ info: 'Rejecting payout requests...', error: '' });
    try {
      await rejectAdminPayouts(session.profile.id, { transactionIds: selectedTxIds });
      await refreshData(false);
      setStatus({ info: 'Rejected payout requests.', error: '' });
      clearSelection();
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to reject payouts' });
    } finally {
      setIsRejecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-aurora-mint mx-auto mb-4" />
          <p className="text-white/50">Loading admin console...</p>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <NotificationBanner {...status} onClose={() => setStatus({ info: '', error: '' })} />

      <CourseDetailsModal
        course={viewingCourse}
        isOpen={!!viewingCourse}
        onClose={() => setViewingCourse(null)}
        onRemoveMaterial={handleRemoveMaterial}
        isUpdatingMaterials={isUpdatingMaterials}
      />

      {/* Header Section */}
      <header className="flex items-center justify-between">
        <div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.2em] text-aurora-coral font-medium flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            System Administrator
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-display text-white mt-1"
          >
            Dashboard Overview
          </motion.h1>
        </div>
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => refreshData(true)}
            disabled={isRefreshing}
            className={`p-3 rounded-full border border-white/20 transition-all ${
              isRefreshing 
                ? 'text-aurora-mint border-aurora-mint/50' 
                : 'text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </motion.button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveSection('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            activeSection === 'courses' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Total Courses
        </button>
        <button
          onClick={() => setActiveSection('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            activeSection === 'clients' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" /> Total Clients
        </button>
        <button
          onClick={() => setActiveSection('wallet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            activeSection === 'wallet' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Wallet
        </button>
        <button
          onClick={() => setActiveSection('payouts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            activeSection === 'payouts' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" /> Payouts
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSection === 'courses' && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Published Courses</h3>
                  <p className="text-sm text-white/40 mt-1">{(dashboard.courses || []).length} courses in catalog</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(dashboard.courses || []).map((course, index) => (
                  <motion.button
                    key={course.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setViewingCourse(course)}
                    className="text-left group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 hover:shadow-glass transition-all duration-300"
                  >
                    <div className="h-44 relative overflow-hidden">
                      <img
                        src={course.heroImage}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/10">
                        {course.category}
                      </span>
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                        <CreditCard className="w-3 h-3 text-aurora-mint" />
                        <span className="text-sm font-bold text-white">{course.price}</span>
                      </div>
                      {course.duration && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/70 text-xs">
                          <Clock className="w-3 h-3" />
                          {course.duration}
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-aurora-mint transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-sm text-white/50 mb-4 line-clamp-2">{course.description}</p>

                      <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-white/50">
                            Enrolled:{' '}
                            <span className="text-white/70">
                              {Array.isArray(course.enrolledStudents) ? course.enrolledStudents.length : 0}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                            View Details
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {(dashboard.courses || []).length === 0 && (
                <p className="text-white/40 text-center py-8 italic">No courses available</p>
              )}
            </div>
          )}

          {activeSection === 'clients' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-xl font-semibold text-white mb-6">Learners</h3>
                <div className="space-y-3">
                  {(dashboard.learners || []).map((lrn) => (
                    <div key={lrn.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <img src={lrn.avatar} alt={lrn.name} className="h-10 w-10 rounded-full border border-white/10" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold truncate">{lrn.name}</p>
                        <p className="text-xs text-white/40 truncate">{lrn.email}</p>
                      </div>
                      <p className="text-xs font-mono text-white/50">{lrn.id}</p>
                    </div>
                  ))}
                  {(dashboard.learners || []).length === 0 && (
                    <p className="text-white/40 text-center py-8 italic">No learners</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-xl font-semibold text-white mb-6">Instructors</h3>
                <div className="space-y-3">
                  {(dashboard.instructors || []).map((inst) => (
                    <div key={inst.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <img src={inst.avatar} alt={inst.name} className="h-10 w-10 rounded-full border border-white/10" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold truncate">{inst.name}</p>
                        <p className="text-xs text-white/40 truncate">{inst.email}</p>
                      </div>
                      <p className="text-xs font-mono text-white/50">{inst.id}</p>
                    </div>
                  ))}
                  {(dashboard.instructors || []).length === 0 && (
                    <p className="text-white/40 text-center py-8 italic">No instructors</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="grid gap-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-aurora-mint" /> Organization Wallet
                </h3>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-aurora-mint/20 rounded-full blur-3xl" />
                  <p className="text-sm uppercase tracking-widest text-white/50 mb-1">Reserve</p>
                  <p className="text-4xl font-display text-white mb-8">{formatCredits(dashboard.organization.bankAccount.credits)}</p>
                  <div className="flex justify-between text-sm border-t border-white/10 pt-4">
                    <div>
                      <p className="text-white/40">Account Number</p>
                      <p className="font-mono text-white/80">{dashboard.organization.bankAccount.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40">Status</p>
                      <p className="text-aurora-mint font-bold">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payouts' && (
            <div className="grid gap-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Payout Requests</h3>
                    <p className="text-sm text-white/40 mt-1">Approve requests so instructors can validate and collect (30% share).</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllRequested}
                      disabled={payoutRequests.length === 0}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      disabled={!hasSelection}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={handleApprove}
                    disabled={!hasSelection || isApproving}
                    className="rounded-xl bg-aurora-mint px-4 py-2 text-sm font-bold text-black hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApproving ? 'Approving...' : `Approve (${selectedTxIds.length})`}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!hasSelection || isRejecting}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? 'Rejecting...' : `Reject (${selectedTxIds.length})`}
                  </button>
                </div>

                <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-2">
                  {payoutRequests.map((tx) => (
                    <div key={tx.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <input
                        type="checkbox"
                        checked={selectedTxIds.includes(tx.id)}
                        onChange={() => toggleSelectTx(tx.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-white/40 truncate">{tx.id}</p>
                        <p className="text-white font-semibold truncate">
                          {tx.type === 'material-bonus' ? 'Material Bonus' : tx.course?.title || tx.courseId}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          Instructor: {tx.instructor?.name || tx.instructorId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">Payout</p>
                        <p className="font-mono text-white font-bold">{tx.payoutAmount ?? tx.amount} cr</p>
                        <span className="mt-2 inline-flex items-center rounded-full bg-sky-500/10 text-sky-400 px-2 py-0.5 text-xs font-semibold">requested</span>
                      </div>
                    </div>
                  ))}

                  {payoutRequests.length === 0 && (
                    <p className="text-white/40 text-center py-8 italic">No payout requests pending</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
