/**
 * ============================================================================
 * INSTRUCTOR DASHBOARD COMPONENT
 * ============================================================================
 * 
 * Professional interface for course instructors to manage their content and earnings.
 * This dashboard provides comprehensive tools for:
 * 
 * Features:
 * - Course creation with rich material support (video, audio, text, MCQ)
 * - Pending transaction validation for learner purchases
 * - Real-time earnings tracking and bank balance display
 * - Activity timeline for tracking instructor actions
 * - Lump-sum reward system for course uploads
 * 
 * Workflow:
 * 1. Instructor uploads a new course with materials
 * 2. Receives immediate lump-sum credit reward
 * 3. When learners purchase, transactions appear as "pending"
 * 4. Instructor validates transactions with bank secret
 * 5. Credits transfer from LMS Org to instructor account
 * 6. Course content unlocks for the learner
 * 
 * @author Aurora LMS Team
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CreditCard, Users, CheckCircle2, AlertCircle, LogOut, Activity,
  BookOpen, Sparkles, DollarSign, Clock, TrendingUp, Shield, Video,
  FileText, Music, HelpCircle, Plus, Eye, EyeOff, Loader2, X, RefreshCw, Pencil
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  fetchInstructor,
  uploadInstructorCourse,
  updateInstructorCourse,
  requestInstructorPayouts,
  validateInstructorPayouts,
  updateInstructorWallet,
} from '../api/lmsClient';
import { NotificationBanner } from '../components/NotificationBanner';

// Fallback data for offline/demo mode
const FALLBACK_INSTRUCTOR = {
  id: 'inst-1',
  name: 'Dr. Asha Ray',
  courses: [
    {
      id: 'c1',
      title: 'Ethical AI',
      description: 'Offline demo course.',
      price: 200,
      category: 'AI',
      duration: '4 weeks',
      heroImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
      materials: { video: null, audio: null, text: null, mcq: [] },
      enrolledStudents: [],
    }
  ],
  bankAccount: { available: 420 },
  transactions: [
    { id: 'tx-123', courseId: 'c1', amount: 200, grossAmount: 200, payoutAmount: 60, status: 'pending_request' }
  ]
};

// ============================================================================
// MAIN INSTRUCTOR DASHBOARD COMPONENT
// ============================================================================

export default function InstructorDashboard() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [instructor, setInstructor] = useState(null);
  const [status, setStatus] = useState({ info: '', error: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('courses');
  const [isRequestingPayouts, setIsRequestingPayouts] = useState(false);
  const [isValidatingPayouts, setIsValidatingPayouts] = useState(false);
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  
  // Form state
  const [payoutSecret, setPayoutSecret] = useState('');
  const [showPayoutSecret, setShowPayoutSecret] = useState(false);
  const [walletSecret, setWalletSecret] = useState('');
  const [showWalletSecret, setShowWalletSecret] = useState(false);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [inlineForm, setInlineForm] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [isViewEditing, setIsViewEditing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({
    title: '',
    description: '',
    category: '',
    price: 200,
    duration: '4 weeks',
    heroImage: '',
    videoFile: null,
    audioFile: null,
    textFile: null,
    mcqQuestion: '',
    mcqOptions: ['', ''],
    mcqAnswerIndex: 0,
  }));

  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });

  const fileToMaterial = async (file) => {
    if (!file) return null;
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large: ${file.name}. Max ${(MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0)}MB.`);
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      name: file.name,
      mime: file.type || 'application/octet-stream',
      dataUrl,
    };
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

  const normalizeMaterialList = (value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value];
  };

  /**
   * Fetch instructor data from API or use fallback for demo mode
   * Updates instructor state and handles loading/error states
   */
  const refreshData = useCallback(async (showMessage = false) => {
    if (showMessage) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await fetchInstructor(session.profile.id);
      setInstructor(data);

      if (showMessage) {
        setStatus({ info: 'Dashboard synchronized', error: '' });
        setTimeout(() => setStatus({ info: '', error: '' }), 2000);
      }

      return data;
    } catch (err) {
      const msg = err?.message || 'Failed to load instructor data';
      if (msg.includes('Cannot connect to server')) {
        setInstructor(FALLBACK_INSTRUCTOR);
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

  const buildInlineForm = (course) => {
    if (!course) return null;
    const mcq = Array.isArray(course?.materials?.mcq) ? course.materials.mcq[0] : null;
    const options = Array.isArray(mcq?.options) ? mcq.options : ['', ''];
    const answerIdx = Math.max(0, options.findIndex((opt) => opt === mcq?.answer));

    return {
      description: course?.description || '',
      videoFile: null,
      audioFile: null,
      textFile: null,
      mcqQuestion: mcq?.question || '',
      mcqOptions: options.length ? options : ['', ''],
      mcqAnswerIndex: answerIdx === -1 ? 0 : answerIdx,
    };
  };

  useEffect(() => {
    if (!viewingCourse) {
      setInlineForm(null);
      setEditingSection(null);
      setIsViewEditing(false);
      return;
    }
    setInlineForm(buildInlineForm(viewingCourse));
    setEditingSection(null);
    setIsViewEditing(false);
  }, [viewingCourse?.id]);

  const syncViewingCourse = (data, courseId) => {
    if (!courseId) return;
    const next = (data?.courses || []).find((c) => c.id === courseId);
    if (next) {
      setViewingCourse(next);
      setInlineForm(buildInlineForm(next));
    }
  };

  const handleInlineSave = async (payload) => {
    if (!viewingCourse?.id) return;
    setIsSavingCourse(true);
    setStatus({ info: 'Saving changes...', error: '' });
    try {
      await updateInstructorCourse(session.profile.id, viewingCourse.id, payload);
      const data = await refreshData(false);
      syncViewingCourse(data, viewingCourse.id);
      setEditingSection(null);
      setStatus({ info: 'Saved.', error: '' });
      setTimeout(() => setStatus({ info: '', error: '' }), 1500);
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to save changes' });
    } finally {
      setIsSavingCourse(false);
    }
  };

  const clearInlineMaterialChange = (key) => {
    if (!key) return;
    setInlineForm((prev) => {
      if (!prev) return prev;
      if (key === 'video') return { ...prev, videoFile: null };
      if (key === 'audio') return { ...prev, audioFile: null };
      if (key === 'text') return { ...prev, textFile: null };
      return prev;
    });
  };

  const saveInlineMaterialChange = async (key) => {
    if (!inlineForm) return;
    const materialsPatch = {};

    if (key === 'video') {
      if (inlineForm.videoFile) {
        materialsPatch.video = await fileToMaterial(inlineForm.videoFile);
      }
    }

    if (key === 'audio') {
      if (inlineForm.audioFile) {
        materialsPatch.audio = await fileToMaterial(inlineForm.audioFile);
      }
    }

    if (key === 'text') {
      if (inlineForm.textFile) {
        materialsPatch.text = await fileToMaterial(inlineForm.textFile);
      }
    }

    if (Object.keys(materialsPatch).length === 0) return;
    await handleInlineSave({ materials: materialsPatch });
  };

  useEffect(() => {
    setWalletSecret('');
    setPayoutSecret('');
  }, [session.profile.id]);

  // Initial data fetch
  useEffect(() => {
    refreshData(false);
  }, [refreshData]);

  /**
   * Handle course upload with validation
   * Creates course, transfers lump-sum reward to instructor
   * @param {Event} e - Form submit event
   */
  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!createForm.title.trim()) {
      setStatus({ info: '', error: 'Please enter a course title' });
      return;
    }
    if (!createForm.description.trim()) {
      setStatus({ info: '', error: 'Please enter a course description' });
      return;
    }
    if (!createForm.category.trim()) {
      setStatus({ info: '', error: 'Please enter a category' });
      return;
    }

    const normalizedOptions = (createForm.mcqOptions || []).map((o) => String(o || '').trim()).filter(Boolean);
    if (!createForm.mcqQuestion.trim()) {
      setStatus({ info: '', error: 'Completion MCQ is required.' });
      return;
    }
    if (normalizedOptions.length < 2) {
      setStatus({ info: '', error: 'MCQ requires at least 2 options.' });
      return;
    }
    if (!normalizedOptions[createForm.mcqAnswerIndex]) {
      setStatus({ info: '', error: 'Select the correct MCQ option.' });
      return;
    }
    
    setIsUploading(true);
    setStatus({ info: 'Publishing your course...', error: '' });
    
    try {
      const payload = {
        title: createForm.title,
        description: createForm.description,
        category: createForm.category,
        price: Number(createForm.price) || 200,
        duration: createForm.duration,
        heroImage: createForm.heroImage || `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800`,
        materials: {
          video: await fileToMaterial(createForm.videoFile),
          audio: await fileToMaterial(createForm.audioFile),
          text: await fileToMaterial(createForm.textFile),
          mcq: [
            {
              id: Math.random().toString(36).substr(2, 9),
              question: createForm.mcqQuestion.trim(),
              options: normalizedOptions,
              answer: normalizedOptions[createForm.mcqAnswerIndex],
            },
          ],
        }
      };

      await uploadInstructorCourse(session.profile.id, payload);
      await refreshData();

      setStatus({ info: `Course "${createForm.title}" published!`, error: '' });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        category: '',
        price: 200,
        duration: '4 weeks',
        heroImage: '',
        videoFile: null,
        audioFile: null,
        textFile: null,
        mcqQuestion: '',
        mcqOptions: ['', ''],
        mcqAnswerIndex: 0,
      });
    
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to publish course' });
    } finally {
      setIsUploading(false);
    }
  };


  const handleRequestPayouts = async () => {
    setIsRequestingPayouts(true);
    setStatus({ info: 'Submitting payout request to LMS org...', error: '' });
    try {
      await requestInstructorPayouts(session.profile.id);
      await refreshData();
      setStatus({ info: 'Payout request submitted. Waiting for admin approval.', error: '' });
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to request payouts' });
    } finally {
      setIsRequestingPayouts(false);
    }
  };

  const handleValidateApproved = async () => {
    if (!payoutSecret.trim()) {
      setStatus({ info: '', error: 'Enter your bank secret to validate approved payouts' });
      return;
    }
    setIsValidatingPayouts(true);
    setStatus({ info: 'Validating approved payouts...', error: '' });
    try {
      await validateInstructorPayouts(session.profile.id, { secret: payoutSecret });
      await refreshData();
      setStatus({ info: 'Validated! Credits added and courses unlocked for learners.', error: '' });
      setPayoutSecret('');
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Validation failed' });
    } finally {
      setIsValidatingPayouts(false);
    }
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!walletSecret.trim()) {
      setStatus({ info: '', error: 'Enter a new bank secret' });
      return;
    }

    setIsSavingWallet(true);
    setStatus({ info: 'Updating wallet...', error: '' });
    try {
      await updateInstructorWallet(session.profile.id, { bankSecret: walletSecret });
      await refreshData();
      setStatus({ info: 'Wallet updated successfully.', error: '' });
      setWalletSecret('');
    } catch (err) {
      setStatus({ info: '', error: err.message || 'Failed to update wallet' });
    } finally {
      setIsSavingWallet(false);
    }
  };
  const payoutItems = instructor?.transactions || [];
  const pendingRequestCount = payoutItems.filter((t) => t.status === 'pending_request').length;
  const requestedCount = payoutItems.filter((t) => t.status === 'requested').length;
  const approvedCount = payoutItems.filter((t) => t.status === 'approved').length;

  const isProbablyUrl = (value) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:');
  };

  const getMaterialSrc = (material) => {
    if (!material) return '';
    if (Array.isArray(material)) return getMaterialSrc(material[0]);
    if (typeof material === 'string') return isProbablyUrl(material) ? material : '';
    return String(material.dataUrl || '');
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

  const isPdfMaterial = (material) => {
    if (!material) return false;
    if (typeof material === 'string') {
      const v = material.trim().toLowerCase();
      return v.includes('.pdf') || v.startsWith('data:application/pdf');
    }
    const mime = String(material.mime || '').toLowerCase();
    return mime.includes('pdf');
  };

  const getMaterialLabel = (material) => {
    if (!material) return 'Not added';
    const kind = arguments.length > 1 ? arguments[1] : undefined;
    if (Array.isArray(material)) {
      if (!material.length) return 'Not added';
      return `${material.length} items`;
    }
    if (typeof material === 'string') {
      const v = material.trim();
      if (!v) return 'Not added';
      if (isProbablyUrl(v)) return getUrlDisplayName(v);
      if (kind === 'text') return 'Text notes';
      return v.length > 64 ? `${v.slice(0, 64)}…` : v;
    }
    return material.name || 'Uploaded file';
  };

  const decodeTextDataUrl = (dataUrl) => {
    if (typeof dataUrl !== 'string') return '';
    if (!dataUrl.startsWith('data:')) return '';
    const comma = dataUrl.indexOf(',');
    if (comma === -1) return '';
    const meta = dataUrl.slice(0, comma);
    if (!meta.includes('base64')) return '';
    const base64 = dataUrl.slice(comma + 1);
    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      return '';
    }
  };

  const getNotesPreview = (notesMaterial) => {
    if (!notesMaterial) return '';

    if (typeof notesMaterial === 'string') {
      const v = notesMaterial.trim();
      if (!v) return '';
      if (isProbablyUrl(v)) return '';
      return v;
    }

    const mime = String(notesMaterial.mime || '');
    if (!mime.startsWith('text/')) return '';
    return decodeTextDataUrl(notesMaterial.dataUrl);
  };

  const viewingVideoItems = normalizeMaterialList(viewingCourse?.materials?.video);
  const viewingAudioItems = normalizeMaterialList(viewingCourse?.materials?.audio);
  const viewingNotesItems = normalizeMaterialList(viewingCourse?.materials?.text);
  const viewingMcq = Array.isArray(viewingCourse?.materials?.mcq) ? viewingCourse.materials.mcq : [];
  const viewingQuestion = viewingMcq.length ? viewingMcq[0] : null;

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
          <p className="text-white/50">Loading instructor data...</p>
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

      <AnimatePresence>
        {!!viewingCourse && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCourse(null)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-white/40">{viewingCourse?.category}</p>
                  <h3 className="text-xl font-semibold text-white truncate">{viewingCourse?.title}</h3>
                  <p className="text-sm text-white/50 mt-1 line-clamp-1">{viewingCourse?.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isViewEditing) {
                        setIsViewEditing(false);
                        setEditingSection(null);
                        setInlineForm(buildInlineForm(viewingCourse));
                        return;
                      }
                      setIsViewEditing(true);
                    }}
                    className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                    <span className="relative inline-flex items-center gap-2"><Pencil className="w-4 h-4" /> {isViewEditing ? 'Done' : 'Edit'}</span>
                  </button>
                  <button
                    onClick={() => setViewingCourse(null)}
                    className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Course</p>

                      <div className="space-y-5">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-xs uppercase tracking-widest text-white/40">Description</p>
                            {isViewEditing && (
                              <button
                                type="button"
                                onClick={() => setEditingSection((v) => (v === 'description' ? null : 'description'))}
                                className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                <span className="relative inline-flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit</span>
                              </button>
                            )}
                          </div>

                          {isViewEditing && editingSection === 'description' ? (
                            <div className="space-y-3">
                              <textarea
                                className="input-glass w-full min-h-[120px]"
                                value={inlineForm?.description ?? ''}
                                onChange={(e) => setInlineForm((prev) => ({ ...prev, description: e.target.value }))}
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineForm(buildInlineForm(viewingCourse));
                                    setEditingSection(null);
                                  }}
                                  className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                  <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                  <span className="relative">Cancel</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingCourse}
                                  onClick={() => handleInlineSave({ description: String(inlineForm?.description || '') })}
                                  className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                                  <span className="relative">Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-white/70 whitespace-pre-line">{viewingCourse?.description || '—'}</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Materials</p>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2"><Video className="w-4 h-4 text-purple-400" /> Video</p>
                                {viewingVideoItems.length ? (
                                  <div className="mt-2 space-y-2">
                                    {viewingVideoItems.map((item, idx) => {
                                      const href = getMaterialSrc(item);
                                      if (!href || href === '#') return null;
                                      return (
                                        <div key={`${href}-${idx}`} className="flex items-center justify-between gap-3">
                                          <p className="text-sm text-white/70 truncate">{getMaterialLabel(item, 'video')}</p>
                                          <a
                                            className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                            href={href}
                                            download={typeof item === 'object' ? item?.name || 'video' : undefined}
                                            target={typeof item === 'string' ? '_blank' : undefined}
                                            rel="noreferrer"
                                          >
                                            <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                            <span className="relative">Download</span>
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-white/70 mt-1">Not added</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {isViewEditing && (
                                  <>
                                    <label className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                      <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                      <span className="relative inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Upload</span>
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => setInlineForm((prev) => ({ ...prev, videoFile: e.target.files?.[0] || null }))}
                                      />
                                    </label>
                                    {!!inlineForm?.videoFile && (
                                      <button
                                        type="button"
                                        disabled={isSavingCourse}
                                        onClick={() => saveInlineMaterialChange('video')}
                                        className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                                        <span className="relative">Save</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2"><Music className="w-4 h-4 text-pink-400" /> Audio</p>
                                {viewingAudioItems.length ? (
                                  <div className="mt-2 space-y-2">
                                    {viewingAudioItems.map((item, idx) => {
                                      const href = getMaterialSrc(item);
                                      if (!href || href === '#') return null;
                                      return (
                                        <div key={`${href}-${idx}`} className="flex items-center justify-between gap-3">
                                          <p className="text-sm text-white/70 truncate">{getMaterialLabel(item, 'audio')}</p>
                                          <a
                                            className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                            href={href}
                                            download={typeof item === 'object' ? item?.name || 'audio' : undefined}
                                            target={typeof item === 'string' ? '_blank' : undefined}
                                            rel="noreferrer"
                                          >
                                            <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                            <span className="relative">Download</span>
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-white/70 mt-1">Not added</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {isViewEditing && (
                                  <>
                                    <label className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                      <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                      <span className="relative inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Upload</span>
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => setInlineForm((prev) => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
                                      />
                                    </label>
                                    {!!inlineForm?.audioFile && (
                                      <button
                                        type="button"
                                        disabled={isSavingCourse}
                                        onClick={() => saveInlineMaterialChange('audio')}
                                        className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                                        <span className="relative">Save</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Notes</p>
                                {viewingNotesItems.length ? (
                                  <div className="mt-2 space-y-2">
                                    {viewingNotesItems.map((item, idx) => {
                                      if (typeof item === 'string' && item.trim() && !isProbablyUrl(item)) {
                                        return (
                                          <div key={`notes-text-${idx}`} className="flex items-center justify-between gap-3">
                                            <p className="text-sm text-white/70 truncate">Text notes</p>
                                            <button
                                              type="button"
                                              onClick={() => downloadPlainText(`notes-${idx + 1}.txt`, item)}
                                              className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                            >
                                              <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                              <span className="relative">Download</span>
                                            </button>
                                          </div>
                                        );
                                      }

                                      const href = getMaterialSrc(item);
                                      if (!href || href === '#') return null;

                                      return (
                                        <div key={`${href}-${idx}`} className="flex items-center justify-between gap-3">
                                          <p className="text-sm text-white/70 truncate">{typeof item === 'string' ? getUrlDisplayName(item, 'Notes') : getMaterialLabel(item, 'text')}</p>
                                          <a
                                            className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                            href={href}
                                            download={typeof item === 'object' ? item?.name || 'notes' : undefined}
                                            target={typeof item === 'string' ? '_blank' : undefined}
                                            rel="noreferrer"
                                          >
                                            <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                            <span className="relative">Download</span>
                                          </a>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-white/70 mt-1">Not added</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {isViewEditing && (
                                  <>
                                    <label className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer">
                                      <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                      <span className="relative inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Upload</span>
                                      <input
                                        type="file"
                                        accept="application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                        className="hidden"
                                        onChange={(e) => setInlineForm((prev) => ({ ...prev, textFile: e.target.files?.[0] || null }))}
                                      />
                                    </label>
                                    {!!inlineForm?.textFile && (
                                      <button
                                        type="button"
                                        disabled={isSavingCourse}
                                        onClick={() => saveInlineMaterialChange('text')}
                                        className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                                        <span className="relative">Save</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-amber-400" /> Completion MCQ</p>
                            {isViewEditing && (
                              <button
                                type="button"
                                onClick={() => setEditingSection((v) => (v === 'mcq' ? null : 'mcq'))}
                                className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                <span className="relative inline-flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit</span>
                              </button>
                            )}
                          </div>

                          {isViewEditing && editingSection === 'mcq' ? (
                            <div className="space-y-3">
                              <input
                                className="input-glass w-full"
                                value={inlineForm?.mcqQuestion ?? ''}
                                onChange={(e) => setInlineForm((prev) => ({ ...prev, mcqQuestion: e.target.value }))}
                                placeholder="Question"
                              />
                              <div className="space-y-2">
                                {(inlineForm?.mcqOptions || []).map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="inline-mcq-answer"
                                      checked={(inlineForm?.mcqAnswerIndex ?? 0) === idx}
                                      onChange={() => setInlineForm((prev) => ({ ...prev, mcqAnswerIndex: idx }))}
                                    />
                                    <input
                                      className="input-glass flex-1"
                                      value={opt}
                                      onChange={(e) => {
                                        const next = [...(inlineForm?.mcqOptions || [])];
                                        next[idx] = e.target.value;
                                        setInlineForm((prev) => ({ ...prev, mcqOptions: next }));
                                      }}
                                      placeholder={`Option ${idx + 1}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const existing = inlineForm?.mcqOptions || [];
                                        const next = existing.filter((_, i) => i !== idx);
                                        const nextAnswer = Math.min(inlineForm?.mcqAnswerIndex ?? 0, Math.max(0, next.length - 1));
                                        setInlineForm((prev) => ({
                                          ...prev,
                                          mcqOptions: next.length ? next : ['', ''],
                                          mcqAnswerIndex: nextAnswer,
                                        }));
                                      }}
                                      className="relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                      <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                      <span className="relative"><X className="w-4 h-4" /></span>
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => setInlineForm((prev) => ({ ...prev, mcqOptions: [...(prev?.mcqOptions || []), ''] }))}
                                className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                <span className="relative inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add option</span>
                              </button>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineForm(buildInlineForm(viewingCourse));
                                    setEditingSection(null);
                                  }}
                                  className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                  <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                                  <span className="relative">Cancel</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingCourse}
                                  onClick={() => {
                                    const question = String(inlineForm?.mcqQuestion || '').trim();
                                    const options = (inlineForm?.mcqOptions || []).map((o) => String(o || '').trim()).filter(Boolean);
                                    if (!question) {
                                      setStatus({ info: '', error: 'MCQ question is required.' });
                                      return;
                                    }
                                    if (options.length < 2) {
                                      setStatus({ info: '', error: 'MCQ requires at least 2 options.' });
                                      return;
                                    }
                                    if (!options[inlineForm?.mcqAnswerIndex ?? 0]) {
                                      setStatus({ info: '', error: 'Select the correct MCQ option.' });
                                      return;
                                    }
                                    handleInlineSave({
                                      materials: {
                                        mcq: [
                                          {
                                            id: Math.random().toString(36).substr(2, 9),
                                            question,
                                            options,
                                            answer: options[inlineForm?.mcqAnswerIndex ?? 0],
                                          },
                                        ],
                                      },
                                    });
                                  }}
                                  className="relative inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                                  <span className="relative">Save</span>
                                </button>
                              </div>
                            </div>
                          ) : viewingQuestion ? (
                            <div className="space-y-3">
                              <p className="text-sm text-white">{viewingQuestion.question}</p>
                              <div className="space-y-1">
                                {(viewingQuestion.options || []).map((opt) => (
                                  <p key={opt} className="text-sm text-white/70">
                                    {opt}
                                  </p>
                                ))}
                              </div>
                              <p className="pt-1 text-xs text-white/50">
                                Correct: <span className="text-white/80">{viewingQuestion.answer || '—'}</span>
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-white/40 italic">Not configured.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> Enrolled Students</p>
                      {(viewingCourse?.enrolledStudents || []).length === 0 ? (
                        <p className="text-sm text-white/40 italic">No enrollments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {(viewingCourse?.enrolledStudents || []).map((student) => (
                            <div key={student.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                              <img src={student.avatar} alt={student.name} className="h-8 w-8 rounded-full border border-white/10" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-white font-medium truncate">{student.name}</p>
                                <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                                    style={{ width: `${Math.max(0, Math.min(100, student.progress))}%` }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs font-mono text-white/60">{student.progress}%</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {isCreateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40">Create Course</p>
                  <h3 className="text-xl font-semibold text-white">Publish a new course</h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="input-glass" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Course Title" />
                    <input className="input-glass" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} placeholder="Category" />
                    <input className="input-glass" type="number" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="Price (credits)" />
                    <input className="input-glass" value={createForm.duration} onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })} placeholder="Duration" />
                  </div>
                  <textarea className="input-glass w-full min-h-[100px]" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Description" />
                  <input className="input-glass w-full" value={createForm.heroImage} onChange={(e) => setCreateForm({ ...createForm, heroImage: e.target.value })} placeholder="Hero Image URL (optional)" />

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
                    <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">Materials (Optional)</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs text-white/50">Video</label>
                        <input
                          type="file"
                          accept="video/*"
                          className="block w-full text-sm text-white/70"
                          onChange={(e) => setCreateForm({ ...createForm, videoFile: e.target.files?.[0] || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50">Audio</label>
                        <input
                          type="file"
                          accept="audio/*"
                          className="block w-full text-sm text-white/70"
                          onChange={(e) => setCreateForm({ ...createForm, audioFile: e.target.files?.[0] || null })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50">Notes (PDF/TXT/PPT/DOC)</label>
                      <input
                        type="file"
                        accept="application/pdf,text/plain,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        className="block w-full text-sm text-white/70"
                        onChange={(e) => setCreateForm({ ...createForm, textFile: e.target.files?.[0] || null })}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">Completion MCQ</p>
                      <input className="input-glass w-full" value={createForm.mcqQuestion} onChange={(e) => setCreateForm({ ...createForm, mcqQuestion: e.target.value })} placeholder="Question" />

                      <div className="space-y-2">
                        {(createForm.mcqOptions || []).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="create-mcq-answer"
                              checked={createForm.mcqAnswerIndex === idx}
                              onChange={() => setCreateForm({ ...createForm, mcqAnswerIndex: idx })}
                            />
                            <input
                              className="input-glass flex-1"
                              value={opt}
                              onChange={(e) => {
                                const next = [...createForm.mcqOptions];
                                next[idx] = e.target.value;
                                setCreateForm({ ...createForm, mcqOptions: next });
                              }}
                              placeholder={`Option ${idx + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = createForm.mcqOptions.filter((_, i) => i !== idx);
                                const nextAnswer = Math.min(createForm.mcqAnswerIndex, Math.max(0, next.length - 1));
                                setCreateForm({ ...createForm, mcqOptions: next.length ? next : ['', ''], mcqAnswerIndex: nextAnswer });
                              }}
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, mcqOptions: [...(createForm.mcqOptions || []), ''] })}
                          className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                          <span className="relative inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add option</span>
                        </button>
                        <p className="text-xs text-white/40">Select the radio button for the correct answer.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 py-4 font-bold text-white shadow-lg shadow-purple-900/20 hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Publishing...' : 'Publish Course'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <header className="flex items-center justify-between">
        <div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.2em] text-aurora-mint font-medium flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Instructor Console
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-display text-white mt-1"
          >
            Welcome, {session.profile.name}
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
          <BookOpen className="w-4 h-4" /> Published Courses
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
          <Activity className="w-4 h-4" /> Pending Payouts
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">Published Courses</h3>
                  <p className="text-sm text-white/40 mt-1">Click a course card to view details or edit.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white shadow-glass transition-all hover:bg-white/10"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-aurora-mint/20 via-purple-500/10 to-fuchsia-500/20 opacity-60" />
                    <span className="relative inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New Course
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(instructor?.courses || []).map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setViewingCourse(course)}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 flex flex-col hover:border-white/20 hover:shadow-glass transition-all duration-300 cursor-pointer"
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
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/70 text-xs">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-aurora-mint transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-sm text-white/50 mb-4 line-clamp-2">{course.description}</p>

                      <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="text-xs text-white/50 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-400" />
                          {(course.enrolledStudents || []).length} students
                        </div>
                        <span className="text-xs text-white/40">Tap to open</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {(instructor?.courses || []).length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-white/40 italic">
                    No published courses yet. Click “New Course” to publish.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'wallet' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-aurora-mint" /> Wallet
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-widest text-white/40">Account Number</p>
                    <p className="font-mono text-white mt-2">{instructor?.bankAccount?.accountNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-widest text-white/40">Available Credits</p>
                    <p className="text-2xl font-display text-white mt-2">{instructor?.bankAccount?.available?.toLocaleString?.() ?? 0}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveWallet} className="mt-6 space-y-4">
                  <p className="text-sm text-white/50">Edit your bank secret (used for payout validation).</p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type={showWalletSecret ? 'text' : 'password'}
                        value={walletSecret}
                        onChange={(e) => setWalletSecret(e.target.value)}
                        placeholder="New bank secret"
                        className="input-glass w-full pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWalletSecret((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showWalletSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingWallet}
                      className="rounded-xl bg-aurora-mint px-5 py-3 text-sm font-bold text-black hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingWallet ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'payouts' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Pending Payouts</h3>
                    <p className="text-sm text-white/40 mt-1">Request pending payouts and validate approved transfers using your bank secret.</p>
                  </div>
                  <button
                    onClick={handleRequestPayouts}
                    disabled={isRequestingPayouts}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRequestingPayouts ? 'Requesting...' : 'Request All Pending'}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/40">Pending</p>
                    <p className="text-2xl font-display text-white mt-2">{pendingRequestCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/40">Requested</p>
                    <p className="text-2xl font-display text-white mt-2">{requestedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-white/40">Approved</p>
                    <p className="text-2xl font-display text-white mt-2">{approvedCount}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type={showPayoutSecret ? 'text' : 'password'}
                        value={payoutSecret}
                        onChange={(e) => setPayoutSecret(e.target.value)}
                        placeholder="Bank secret (required to validate approved payouts)"
                        className="input-glass w-full pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPayoutSecret((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showPayoutSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleValidateApproved}
                      disabled={isValidatingPayouts || approvedCount === 0}
                      className="rounded-xl bg-aurora-mint px-5 py-3 text-sm font-bold text-black hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isValidatingPayouts ? 'Validating...' : 'Validate Approved'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-xl font-semibold text-white mb-6">Payout Items</h3>
                <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-2">
                  {payoutItems
                    .filter((t) => ['pending_request', 'requested', 'approved', 'rejected'].includes(t.status))
                    .map((tx) => (
                      <div key={tx.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-white/40 truncate">{tx.id}</p>
                            <p className="text-white font-semibold truncate">
                              {tx.type === 'material-bonus' ? 'Material Update Bonus' : tx.course?.title || tx.courseId}
                            </p>
                            <p className="text-xs text-white/50 mt-1">
                              {tx.type === 'course-sale' && tx.learner ? `Learner: ${tx.learner.name}` : tx.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/40">Payout</p>
                            <p className="font-mono text-white font-bold">{tx.payoutAmount ?? tx.amount} cr</p>
                            <span
                              className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                tx.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : tx.status === 'requested'
                                  ? 'bg-sky-500/10 text-sky-400'
                                  : tx.status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {tx.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {tx.type === 'course-sale' && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-white/40">Gross</p>
                              <p className="font-mono text-white/80">{tx.grossAmount ?? tx.amount} cr</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-white/40">Your Share (30%)</p>
                              <p className="font-mono text-white/80">{tx.payoutAmount ?? 0} cr</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {payoutItems.filter((t) => ['pending_request', 'requested', 'approved', 'rejected'].includes(t.status)).length === 0 && (
                    <p className="text-white/40 text-center py-8 italic">No payout items</p>
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
