import type { SVGProps } from 'react';

/**
 * Astronaut icon (helmet with visor + suit shoulders and chest pack).
 * Drawn in the same style as lucide-react (24×24, 2px stroke, currentColor)
 * because lucide has no astronaut glyph.
 */
export function AstronautIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Helmet */}
      <circle cx="12" cy="8.5" r="6" />
      {/* Visor */}
      <path d="M8.5 8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v.5a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5z" />
      {/* Suit shoulders */}
      <path d="M4 22v-1.5a5 5 0 0 1 4.2-4.9" />
      <path d="M20 22v-1.5a5 5 0 0 0-4.2-4.9" />
      {/* Chest control pack */}
      <rect x="9.5" y="17.5" width="5" height="3" rx="1" />
    </svg>
  );
}
