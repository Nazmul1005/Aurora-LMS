/**
 * ============================================================================
 * TIMELINE COMPONENT
 * ============================================================================
 * 
 * Displays a vertical timeline of activity events with icons and timestamps.
 * Used for tracking learner/instructor actions in real-time.
 * 
 * Features:
 * - Animated entry for new items
 * - Scrollable container with custom scrollbar
 * - Interactive hover states
 * - Empty state handling
 * 
 * @param {Array} items - Array of timeline items with id, icon, title, body, timestamp
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';

/**
 * Timeline item animation variants
 */
const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

/**
 * Format timestamp to readable time string
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted time string
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Vertical timeline with scrollable activity feed and animations
export const Timeline = ({ items = [] }) => (
  <div className="space-y-1 max-h-[26rem] overflow-y-auto pr-2 custom-scrollbar">
    <AnimatePresence mode="popLayout">
      {items.map((item, index) => {
        const Icon = item.icon;
        
        return (
          <motion.div 
            key={item.id}
            variants={itemVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex gap-4 group"
          >
            {/* Timeline Connector */}
            <div className="flex flex-col items-center">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-aurora-mint ring-1 ring-white/20 group-hover:ring-aurora-mint/50 group-hover:bg-aurora-mint/10 transition-all shadow-lg"
              >
                {Icon && <Icon className="h-5 w-5" />}
              </motion.div>
              {index < items.length - 1 && (
                <div className="w-px flex-1 bg-gradient-to-b from-aurora-mint/30 via-white/10 to-transparent my-2" />
              )}
            </div>
            
            {/* Timeline Content */}
            <div className="pb-6 pt-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
                <Clock className="w-3 h-3" />
                <span>{formatTime(item.timestamp)}</span>
              </div>
              <p className="text-base font-semibold text-white mt-1 group-hover:text-aurora-mint transition-colors truncate">
                {item.title}
              </p>
              <p className="text-sm text-white/60 leading-relaxed mt-1 line-clamp-2">
                {item.body}
              </p>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
    
    {/* Empty State */}
    {items.length === 0 && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <Sparkles className="w-8 h-8 mx-auto mb-3 text-white/20" />
        <p className="text-white/40 italic text-sm">No activity yet...</p>
      </motion.div>
    )}
  </div>
);
