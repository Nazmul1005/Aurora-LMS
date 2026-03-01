/**
 * Aurora Background Component
 * Provides the animated gradient background with floating orbs and noise texture
 * Used as a wrapper for all application pages
 */

import React from 'react';

// Main background wrapper with animated orbs and aurora effects
export const AuroraBackground = ({ children }) => (
  <div className="relative min-h-screen overflow-hidden bg-aurora-dusk text-white font-body selection:bg-aurora-mint selection:text-black">
    <div className="orb one" />
    <div className="orb two" />
    <div className="orb three" />
    <div className="aurora-noise" />
    <div className="glint" />
    <div className="relative z-10 min-h-screen px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </div>
  </div>
);
