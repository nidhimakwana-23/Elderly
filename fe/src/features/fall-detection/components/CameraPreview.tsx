import React from 'react';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import type { CameraStatus, CameraError } from '../types/pose.types';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStatus: CameraStatus;
  cameraError: CameraError | null;
  isMirrored?: boolean;
  onVideoReady?: () => void;
  children?: React.ReactNode;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  cameraStatus,
  cameraError,
  isMirrored = true,
  onVideoReady,
  children,
}) => {
  const isStreaming = cameraStatus === 'ready';

  return (
    <div className="relative w-full aspect-video bg-gray-950 rounded-2xl overflow-hidden shadow-xl border border-gray-800 flex items-center justify-center">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={onVideoReady}
        className={`w-full h-full object-contain transition-transform duration-200 ${
          isStreaming ? 'block' : 'hidden'
        } ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Overlay Canvas and additional children */}
      {isStreaming && children}

      {/* Placeholder: Camera Stopped / Idle */}
      {cameraStatus === 'idle' && (
        <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4 text-gray-500">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-1">Camera is off</h3>
          <p className="text-sm text-gray-400 max-w-sm">
            Click &ldquo;Start Camera&rdquo; below to grant camera access and begin live pose
            tracking.
          </p>
        </div>
      )}

      {/* Placeholder: Requesting Camera */}
      {cameraStatus === 'requesting' && (
        <div className="flex flex-col items-center justify-center text-center p-6 text-indigo-400">
          <div className="w-16 h-16 rounded-full bg-indigo-950/60 border border-indigo-800 flex items-center justify-center mb-4 animate-pulse">
            <Camera className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-1">
            Requesting camera access...
          </h3>
          <p className="text-sm text-gray-400 max-w-sm">
            Please approve the camera permission prompt in your browser.
          </p>
        </div>
      )}

      {/* Placeholder: Camera Error */}
      {cameraStatus === 'error' && (
        <div className="flex flex-col items-center justify-center text-center p-6 text-rose-400 max-w-md">
          <div className="w-16 h-16 rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center mb-4 text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-200 mb-1">Camera Unavailable</h3>
          <p className="text-sm text-rose-300 mb-3">{cameraError?.message}</p>
          {cameraError?.details && (
            <p className="text-xs text-gray-500 font-mono bg-gray-900 p-2 rounded max-w-xs break-all">
              {cameraError.details}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
