"use client";

import { useState } from "react";
import { formatDuration, getScoreColor, getVideoStatusIcon } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VideoQueueItem {
  filename: string;
  status: "pending" | "running" | "completed" | "failed";
  duration_seconds: number | null;
  physics_score: number | null;
  error: string | null;
  stages: Array<{
    type: string;
    status: string;
    duration_seconds: number | null;
  }>;
}

interface VideoQueueListProps {
  videos: VideoQueueItem[];
  maxVisible?: number;
  className?: string;
}

export function VideoQueueList({
  videos,
  maxVisible = 10,
  className = "",
}: VideoQueueListProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleVideos = showAll ? videos : videos.slice(0, maxVisible);
  const hasMore = videos.length > maxVisible;

  // Count by status
  const statusCounts = {
    completed: videos.filter((v) => v.status === "completed").length,
    running: videos.filter((v) => v.status === "running").length,
    pending: videos.filter((v) => v.status === "pending").length,
    failed: videos.filter((v) => v.status === "failed").length,
  };

  return (
    <div className={`bg-secondary/30 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <h3 className="font-medium">Video Queue</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-500">{statusCounts.completed} completed</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-yellow-500">{statusCounts.running} running</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-gray-500">{statusCounts.pending} pending</span>
          {statusCounts.failed > 0 && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-red-500">{statusCounts.failed} failed</span>
            </>
          )}
        </div>
      </div>

      {/* Video list */}
      <div className="divide-y divide-border/30">
        {visibleVideos.map((video, index) => (
          <VideoQueueRow key={video.filename} video={video} index={index} />
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <div className="p-3 text-center border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show less"
              : `Show ${videos.length - maxVisible} more videos`}
          </Button>
        </div>
      )}
    </div>
  );
}

function VideoQueueRow({
  video,
  index,
}: {
  video: VideoQueueItem;
  index: number;
}) {
  const statusIcon = getVideoStatusIcon(video.status);
  const statusColor = {
    completed: "text-green-500",
    running: "text-yellow-500",
    failed: "text-red-500",
    pending: "text-gray-500",
  }[video.status];

  const statusBadgeVariant = {
    completed: "default" as const,
    running: "secondary" as const,
    failed: "destructive" as const,
    pending: "outline" as const,
  }[video.status];

  return (
    <div
      className={`flex items-center gap-4 p-3 ${
        video.status === "running" ? "bg-yellow-500/5" : ""
      }`}
    >
      {/* Status icon */}
      <span className={`text-lg ${statusColor}`}>
        {video.status === "running" ? (
          <span className="animate-spin inline-block">{statusIcon}</span>
        ) : (
          statusIcon
        )}
      </span>

      {/* Filename */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate">{video.filename}</p>
        {video.error && (
          <p className="text-xs text-red-400 truncate mt-0.5">{video.error}</p>
        )}
      </div>

      {/* Status badge */}
      <Badge variant={statusBadgeVariant} className="capitalize shrink-0">
        {video.status === "running" && video.stages.length > 0
          ? video.stages.find((s) => s.status === "running")?.type || video.status
          : video.status}
      </Badge>

      {/* Duration */}
      <div className="w-16 text-right text-sm text-muted-foreground shrink-0">
        {video.duration_seconds ? formatDuration(video.duration_seconds) : "-"}
      </div>

      {/* Score */}
      <div className="w-16 text-right shrink-0">
        {video.physics_score !== null ? (
          <span className={`text-sm font-mono ${getScoreColor(video.physics_score)}`}>
            {video.physics_score.toFixed(2)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </div>
    </div>
  );
}

// Compact version for sidebar or small spaces
export function VideoQueueCompact({
  videos,
  maxVisible = 5,
  className = "",
}: VideoQueueListProps) {
  const visibleVideos = videos.slice(0, maxVisible);
  const remaining = videos.length - maxVisible;

  return (
    <div className={`space-y-1 ${className}`}>
      {visibleVideos.map((video) => {
        const statusColor = {
          completed: "bg-green-500",
          running: "bg-yellow-500 animate-pulse",
          failed: "bg-red-500",
          pending: "bg-gray-500",
        }[video.status];

        return (
          <div
            key={video.filename}
            className="flex items-center gap-2 text-xs"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            <span className="truncate flex-1 font-mono">{video.filename}</span>
            {video.physics_score !== null && (
              <span className={`font-mono ${getScoreColor(video.physics_score)}`}>
                {video.physics_score.toFixed(2)}
              </span>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground pl-4">
          +{remaining} more...
        </div>
      )}
    </div>
  );
}
