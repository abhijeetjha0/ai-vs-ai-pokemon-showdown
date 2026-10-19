import React from 'react';

/**
 * Authentic Vector Pokéball Icon
 * Replaces legacy/missing 'catching_pokemon' ligature with a crisp SVG
 */
export default function PokeballIcon({ size = 16, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={`pokeball-svg-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: '-0.15em' }}
      aria-hidden="true"
      {...props}
    >
      {/* Top half: Crimson Red */}
      <path
        d="M12 2a10 10 0 0 0-10 10h6.1a4 4 0 0 1 7.8 0H22A10 10 0 0 0 12 2z"
        fill="#f43f5e"
      />
      {/* Bottom half: Clean White */}
      <path
        d="M12 22a10 10 0 0 0 10-10h-6.1a4 4 0 0 1-7.8 0H2a10 10 0 0 0 10 10z"
        fill="#f8fafc"
      />
      {/* Center divider seam */}
      <path
        d="M2 12h6.1M15.9 12H22"
        stroke="#070a12"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Outer border */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#070a12"
        strokeWidth="1.8"
        fill="none"
      />
      {/* Center button outer ring */}
      <circle
        cx="12"
        cy="12"
        r="3.5"
        fill="#070a12"
      />
      {/* Center button inner core */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="#ffffff"
      />
      <circle
        cx="12"
        cy="12"
        r="0.8"
        fill="#070a12"
      />
    </svg>
  );
}
