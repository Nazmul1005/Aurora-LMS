/**
 * StatGlint Component
 * Displays a metric card with an icon, label, value, and gradient accent
 * Used for dashboard statistics and key metrics
 */

import React from 'react';

// Metric card with glass-morphism effect and gradient accent
export const StatGlint = ({ icon: Icon, label, value, accent }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-xl transition-transform hover:scale-[1.02]">
    <div className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-20`} />
    <div className="relative flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-aurora-mint backdrop-blur-md">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
        <p className="text-2xl font-semibold text-white tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);
