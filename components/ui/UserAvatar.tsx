import React from 'react';

/**
 * UserAvatar — pixel-art SVG avatars, NADO neo-brutalist design system.
 * Fully offline, no external API, instant render.
 * Each character has a distinct silhouette readable at 16px–48px.
 */
export const UserAvatar: React.FC<{ userId: string; size?: number }> = ({ userId, size = 32 }) => {
  // ALL — three vertical color stripes = the whole team at a glance
  if (userId === 'ALL') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block">
        <rect width="32" height="32" fill="#0d0d0b"/>
        {/* Ед · Вася · Ден — each stripe = one user */}
        <rect x="0"  y="0" width="10" height="32" fill="#3b82f6"/>
        <rect x="11" y="0" width="10" height="32" fill="#10b981"/>
        <rect x="22" y="0" width="10" height="32" fill="#f97316"/>
      </svg>
    );
  }

  // Ед — blue · dark hair · programmer glasses
  if (userId === 'Ед') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block">
        <rect width="32" height="32" fill="#3b82f6"/>
        {/* Hair */}
        <rect x="5"  y="3"  width="22" height="6"  fill="#0f2744"/>
        {/* Left lens */}
        <rect x="4"  y="12" width="10" height="8"  fill="white"/>
        <rect x="6"  y="14" width="4"  height="4"  fill="#1e3a8a"/>
        {/* Right lens */}
        <rect x="18" y="12" width="10" height="8"  fill="white"/>
        <rect x="22" y="14" width="4"  height="4"  fill="#1e3a8a"/>
        {/* Bridge */}
        <rect x="14" y="15" width="4"  height="2"  fill="white"/>
        {/* Straight mouth */}
        <rect x="10" y="24" width="12" height="2"  fill="white"/>
      </svg>
    );
  }

  // Вася — green · bushy brows · wide pixel smile
  if (userId === 'Вася') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block">
        <rect width="32" height="32" fill="#10b981"/>
        {/* Eyebrows */}
        <rect x="7"  y="9"  width="8"  height="3"  fill="#064e3b"/>
        <rect x="17" y="9"  width="8"  height="3"  fill="#064e3b"/>
        {/* Eyes */}
        <rect x="8"  y="13" width="6"  height="5"  fill="white"/>
        <rect x="18" y="13" width="6"  height="5"  fill="white"/>
        {/* Pupils */}
        <rect x="10" y="14" width="3"  height="3"  fill="#064e3b"/>
        <rect x="20" y="14" width="3"  height="3"  fill="#064e3b"/>
        {/* Big pixel smile */}
        <rect x="10" y="21" width="2"  height="2"  fill="white"/>
        <rect x="12" y="22" width="8"  height="2"  fill="white"/>
        <rect x="20" y="21" width="2"  height="2"  fill="white"/>
      </svg>
    );
  }

  // Ден — orange · cap · half-closed cool eyes · smirk
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="block">
      <rect width="32" height="32" fill="#f97316"/>
      {/* Cap */}
      <rect x="4"  y="2"  width="24" height="8"  fill="#9a3412"/>
      <rect x="2"  y="9"  width="28" height="3"  fill="#9a3412"/>
      {/* Eyes — draw full white, then cover top 2px = half-closed look */}
      <rect x="8"  y="15" width="6"  height="5"  fill="white"/>
      <rect x="18" y="15" width="6"  height="5"  fill="white"/>
      <rect x="8"  y="15" width="6"  height="2"  fill="#f97316"/>
      <rect x="18" y="15" width="6"  height="2"  fill="#f97316"/>
      {/* Pupils */}
      <rect x="10" y="17" width="3"  height="3"  fill="#9a3412"/>
      <rect x="20" y="17" width="3"  height="3"  fill="#9a3412"/>
      {/* Smirk — right-biased */}
      <rect x="14" y="24" width="10" height="2"  fill="white"/>
      <rect x="13" y="23" width="2"  height="3"  fill="white"/>
    </svg>
  );
};
