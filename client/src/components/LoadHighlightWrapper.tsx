/**
 * LoadHighlightWrapper.tsx
 * Wraps load items with visual highlighting (border, pulse, badge)
 * Used when a new load is created and needs visual feedback
 */

import { ReactNode } from "react";

interface LoadHighlightWrapperProps {
  loadId: number;
  highlightedLoadId: number | null;
  children: ReactNode;
}

export function LoadHighlightWrapper({
  loadId,
  highlightedLoadId,
  children,
}: LoadHighlightWrapperProps) {
  const isHighlighted = loadId === highlightedLoadId;

  return (
    <div
      className={`relative transition-all duration-300 ${
        isHighlighted
          ? "ring-2 ring-green-500 ring-offset-2 rounded-lg"
          : ""
      }`}
    >
      {/* Pulse animation for highlighted load */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-lg animate-pulse bg-green-500/10" />
      )}

      {/* NEW LOAD badge */}
      {isHighlighted && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-lg">
            <span className="animate-pulse">🟢</span>
            NEW LOAD
          </div>
        </div>
      )}

      {/* Content */}
      <div className={isHighlighted ? "relative z-0" : ""}>
        {children}
      </div>
    </div>
  );
}
