import React, { useEffect } from 'react';

interface PoseOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  isMirrored?: boolean;
}

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  canvasRef,
  videoRef,
  isMirrored = true,
}) => {
  // Sync canvas internal resolution with video intrinsic resolution
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const syncDimensions = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }
    };

    video.addEventListener('loadedmetadata', syncDimensions);
    video.addEventListener('resize', syncDimensions);
    syncDimensions();

    return () => {
      video.removeEventListener('loadedmetadata', syncDimensions);
      video.removeEventListener('resize', syncDimensions);
    };
  }, [videoRef, canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-transform duration-200 ${
        isMirrored ? 'scale-x-[-1]' : ''
      }`}
    />
  );
};
