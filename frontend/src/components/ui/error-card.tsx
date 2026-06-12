"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorCardProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorCardProps) {
  return (
    <div className="glass-dark rounded-xl p-8 text-center max-w-md mx-auto my-12">
      <AlertTriangle className="mx-auto mb-4 text-amber-500" size={40} />
      <h3 className="text-text-primary font-semibold mb-2 text-lg">{title}</h3>
      <p className="text-text-secondary text-sm mb-6">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-amber-shimmer px-6 py-2 rounded-lg text-sm font-medium
                     bg-amber-500/10 text-amber-400 border border-amber-500/20
                     hover:bg-amber-500/20 transition-colors duration-200"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
