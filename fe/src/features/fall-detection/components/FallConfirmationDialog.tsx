import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface FallConfirmationDialogProps {
  isOpen: boolean;
  secondsRemaining: number;
  fallScore: number;
  isSubmitting?: boolean;
  onImOkay: () => void;
  onNeedHelp: () => void;
}

export const FallConfirmationDialog: React.FC<FallConfirmationDialogProps> = ({
  isOpen,
  secondsRemaining,
  fallScore,
  isSubmitting = false,
  onImOkay,
  onNeedHelp,
}) => {
  if (!isOpen) return null;

  const scorePercent = Math.round(fallScore * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border-4 border-red-500 overflow-hidden transform scale-100 transition-transform">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-full animate-bounce">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wide">
              Potential Fall Detected
            </h2>
            <p className="text-xs text-red-100">
              Confidence score: {scorePercent}% · Temporal confirmation triggered
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <p className="text-base text-gray-700 font-medium mb-4">
            We detected a movement pattern that may indicate a fall.
          </p>

          <p className="text-2xl font-bold text-gray-900 mb-6">
            Are you okay?
          </p>

          {/* Countdown indicator */}
          <div className="mb-6 inline-flex flex-col items-center justify-center p-4 bg-red-50 rounded-2xl border border-red-100">
            <div className="text-4xl font-extrabold text-red-600 font-mono">
              {secondsRemaining}s
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Caregiver notification will follow if no response is received
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              id="confirm-im-okay-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onImOkay}
              className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-6 h-6" />
              <span>I&apos;m Okay</span>
            </button>

            <button
              id="confirm-need-help-btn"
              type="button"
              disabled={isSubmitting}
              onClick={onNeedHelp}
              className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <ShieldAlert className="w-6 h-6" />
              <span>I Need Help!</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-400">
            Automated Safety Detection · Not a clinical diagnostic device
          </span>
        </div>
      </div>
    </div>
  );
};
