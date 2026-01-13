"use client";

import { useRef, useState, useEffect } from "react";
import { getVideoUrl } from "@/lib/api";

interface VideoPreviewProps {
  src: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  syncRef?: React.RefObject<HTMLVideoElement | null>;
}

export function VideoPreview({
  src,
  title,
  className = "",
  autoPlay = false,
  loop = true,
  muted = true,
  controls = true,
  syncRef,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync playback with another video
  useEffect(() => {
    if (!syncRef?.current || !videoRef.current) return;

    const handleTimeUpdate = () => {
      if (syncRef.current && videoRef.current) {
        const diff = Math.abs(syncRef.current.currentTime - videoRef.current.currentTime);
        if (diff > 0.1) {
          videoRef.current.currentTime = syncRef.current.currentTime;
        }
      }
    };

    const handlePlay = () => {
      videoRef.current?.play();
    };

    const handlePause = () => {
      videoRef.current?.pause();
    };

    syncRef.current.addEventListener("timeupdate", handleTimeUpdate);
    syncRef.current.addEventListener("play", handlePlay);
    syncRef.current.addEventListener("pause", handlePause);

    return () => {
      syncRef.current?.removeEventListener("timeupdate", handleTimeUpdate);
      syncRef.current?.removeEventListener("play", handlePlay);
      syncRef.current?.removeEventListener("pause", handlePause);
    };
  }, [syncRef]);

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load video");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Convert path to API URL
  const videoSrc = getVideoUrl(src);

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
      {/* Title overlay */}
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-3">
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading video...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        className="w-full h-full object-contain"
      />

      {/* Time display overlay (when controls are hidden) */}
      {!controls && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder component for when video is not available
export function VideoPlaceholder({
  title,
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex items-center justify-center ${className}`}
    >
      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-3">
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
      )}
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <span className="text-sm">No video</span>
      </div>
    </div>
  );
}
