/**
 * Course Materials Modal Component
 * Displays course content including video lectures, notes, audio companions, and assessments
 * Allows learners to mark courses as complete and claim certificates
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Download, FileText, Music, PlayCircle, X } from 'lucide-react';

export const CourseMaterialsModal = ({ course, isOpen, onClose, onComplete, isCompleted }) => {
  // Don't render if no course selected
  if (!course) return null;

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

  const videoItems = normalizeMaterialList(course.materials?.video);
  const audioItems = normalizeMaterialList(course.materials?.audio);
  const notesItems = normalizeMaterialList(course.materials?.text);

  const looksLikeDownloadableString = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:');
  };

  const isPlainTextMaterial = (material) => {
    if (typeof material !== 'string') return false;
    return !looksLikeDownloadableString(material);
  };

  const getDownloadHref = (material) => {
    const src = getMaterialSrc(material);
    if (!src || src === '#') return '';
    if (typeof material === 'string' && isPlainTextMaterial(material)) return '';
    return src;
  };

  const question = useMemo(() => {
    const mcq = course.materials?.mcq;
    return Array.isArray(mcq) && mcq.length ? mcq[0] : null;
  }, [course.materials?.mcq]);

  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState({ index: null, type: null });

  useEffect(() => {
    if (!isOpen) return;
    setAnswer('');
    setIsSubmitting(false);
    setCopyStatus({ index: null, type: null });
  }, [isOpen, course?.id]);

  const downloadPlainText = (filename, content) => {
    const blob = new Blob([String(content || '')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const copyPlainText = async (text, type, index) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopyStatus({ type, index });
      setTimeout(() => setCopyStatus({ type: null, index: null }), 1600);
    } catch {
      downloadPlainText(`notes-${index + 1}.txt`, text);
    }
  };

  const renderMaterialRow = (item, idx, type) => {
    const href = getDownloadHref(item);
    const label = getMaterialLabel(item, `${type} ${idx + 1}`);
    const isPlain = typeof item === 'string' && isPlainTextMaterial(item);
    const plainText = isPlain ? String(item).trim() : '';
    const badge =
      type === 'video'
        ? 'Video'
        : type === 'audio'
        ? 'Audio'
        : isPlain
        ? 'Plain text'
        : 'Document';

    return (
      <div
        key={`${type}-${idx}`}
        className="rounded-2xl border border-white/5 bg-black/15 p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40">
            <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5">
              {badge}
            </span>
            <span>#{idx + 1}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-white truncate">{label}</p>
          {isPlain && (
            <p className="mt-2 text-xs text-white/60 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
              {plainText}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <a
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
              href={href}
              download={
                typeof item === 'object'
                  ? item?.name || `${type}-${idx + 1}`
                  : undefined
              }
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          ) : null}
          {isPlain && (
            <>
              <button
                type="button"
                onClick={() => downloadPlainText(`notes-${idx + 1}.txt`, plainText)}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
              >
                <Download className="w-3 h-3" />
                Save
              </button>
              <button
                type="button"
                onClick={() => copyPlainText(plainText, type, idx)}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
              >
                {copyStatus.type === type && copyStatus.index === idx ? 'Copied!' : 'Copy'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const MaterialCard = ({ icon: Icon, title, subtitle, items, type }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/50">{subtitle}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-white/60">{items.length} item(s)</span>
      </div>
      {items.length ? (
        <div className="space-y-3">{items.map((item, idx) => renderMaterialRow(item, idx, type))}</div>
      ) : (
        <p className="text-sm text-white/40 italic">No {title.toLowerCase()} available.</p>
      )}
    </div>
  );

  const handleComplete = async () => {
    if (isCompleted) return;
    if (!question?.answer) return;
    if (!answer) return;

    setIsSubmitting(true);
    try {
      await onComplete(answer);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

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
            className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1e] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-aurora-mint">{course.category}</p>
                <h2 className="text-2xl font-display text-white">{course.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <MaterialCard
                    icon={PlayCircle}
                    title="Video Assets"
                    subtitle="Lecture recordings & screen captures"
                    items={videoItems}
                    type="video"
                  />
                  <MaterialCard
                    icon={FileText}
                    title="Notes & Documents"
                    subtitle="Slides, briefs, transcripts"
                    items={notesItems}
                    type="notes"
                  />
                  <MaterialCard
                    icon={Music}
                    title="Audio Guides"
                    subtitle="Podcasts & supplementary audio"
                    items={audioItems}
                    type="audio"
                  />
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl bg-gradient-to-br from-aurora-mint/15 via-emerald-500/5 to-transparent border border-aurora-mint/30 p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Completion Status</h3>
                    <p className="text-sm text-white/60 mb-6">
                      Review all materials and pass the assessment to certify.
                    </p>
                    
                    {isCompleted ? (
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-500/20 px-4 py-3 text-emerald-300 font-semibold border border-emerald-500/30">
                        <CheckCircle2 className="h-5 w-5" />
                        Certified
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {question ? (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Completion Quiz</p>
                            <p className="text-sm text-white mb-3">{question.question}</p>
                            <div className="space-y-2">
                              {(question.options || []).map((option) => (
                                <label key={option} className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="completion-answer"
                                    value={option}
                                    checked={answer === option}
                                    onChange={(e) => setAnswer(e.target.value)}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-white/40 italic">
                            No completion quiz configured for this course.
                          </div>
                        )}

                        <button
                          onClick={handleComplete}
                          disabled={!question || !answer || isSubmitting}
                          className="w-full rounded-xl bg-aurora-mint py-3 text-sm font-bold text-black shadow-lg shadow-aurora-mint/20 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Answer & Claim Certificate'}
                        </button>
                      </div>
                    )}
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
