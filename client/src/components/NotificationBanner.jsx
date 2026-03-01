/**
 * ============================================================================
 * NOTIFICATION BANNER COMPONENT
 * ============================================================================
 * 
 * Displays animated toast notifications at the top of the screen.
 * Supports info (success) and error message types.
 * 
 * Features:
 * - Smooth slide-in/slide-out animations
 * - Auto-dismiss with configurable timeout
 * - Manual dismiss via close button
 * - Different styling for success vs error states
 * - Fixed positioning for consistent visibility
 * 
 * @param {string} info - Success/info message to display
 * @param {string} error - Error message to display (takes priority)
 * @param {function} onClose - Callback when notification is dismissed
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X, Info, Loader2 } from 'lucide-react';

/**
 * Animation variants for the notification banner
 */
const bannerVariants = {
  initial: { opacity: 0, y: -60, x: '-50%', scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    x: '-50%', 
    scale: 1,
    transition: { type: 'spring', damping: 20, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    y: -30, 
    x: '-50%', 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export const NotificationBanner = ({ info, error, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Determine notification type and content
  const isError = Boolean(error);
  const isLoading = info?.toLowerCase().includes('...') || info?.toLowerCase().includes('loading');
  const message = error || info;

  // Handle visibility and auto-dismiss
  useEffect(() => {
    if (message) {
      setIsVisible(true);
      
      // Don't auto-dismiss loading messages or errors
      if (!isLoading && !isError) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          if (onClose) setTimeout(onClose, 200);
        }, 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [message, isLoading, isError, onClose]);

  /**
   * Handle manual close
   */
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) setTimeout(onClose, 200);
  };

  // Render nothing if no message
  if (!message) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={bannerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`fixed top-6 left-1/2 z-[100] flex items-center gap-3 rounded-2xl border px-5 py-3 backdrop-blur-xl shadow-2xl max-w-md ${
            isError
              ? 'border-red-500/30 bg-red-950/90 text-red-200'
              : isLoading
                ? 'border-blue-500/30 bg-blue-950/90 text-blue-200'
                : 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200'
          }`}
        >
          {/* Icon */}
          <div className={`flex-shrink-0 p-1 rounded-full ${
            isError ? 'bg-red-500/20' : isLoading ? 'bg-blue-500/20' : 'bg-emerald-500/20'
          }`}>
            {isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          
          {/* Message */}
          <span className="text-sm font-medium flex-1 line-clamp-2">{message}</span>
          
          {/* Close Button */}
          {!isLoading && (
            <motion.button 
              onClick={handleClose} 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
