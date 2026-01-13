"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PipelineVisualizer } from "@/components/PipelineVisualizer";
import { VideoQueueList } from "@/components/VideoQueueList";
import {
  JobProgress,
  PipelineStage,
  formatDuration,
  calculateETA,
} from "@/lib/types";
import { getProgress, subscribeToProgress } from "@/lib/api";

interface JobProgressViewProps {
  jobId?: string;
  requestName?: string;
  className?: string;
  onComplete?: () => void;
}

// Mock progress data for demo
function getMockProgress(jobId: string, requestName: string): JobProgress {
  return {
    job_id: jobId,
    job_name: requestName,
    status: "running",
    started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    updated_at: new Date().toISOString(),
    elapsed_seconds: 332,
    estimated_total_seconds: 1050,
    estimated_remaining_seconds: 718,
    total_videos: 10,
    completed_videos: 3,
    failed_videos: 0,
    current_video_index: 3,
    overall_percent: 30,
    current_video: {
      filename: "warehouse_cam_005.mp4",
      stage: "transfer" as PipelineStage,
      stage_progress: {
        current_variant: 2,
        total_variants: 3,
        percent: 67,
      },
      stage_started_at: new Date(Date.now() - 45 * 1000).toISOString(),
      stage_elapsed_seconds: 45,
    },
    pipeline_stages: [
      { type: "predict" as PipelineStage, status: "completed", duration_seconds: 83 },
      { type: "transfer" as PipelineStage, status: "running", duration_seconds: null },
      { type: "reason" as PipelineStage, status: "pending", duration_seconds: null },
    ],
    videos: [
      { filename: "warehouse_cam_001.mp4", status: "completed", duration_seconds: 105, physics_score: 0.92, error: null, stages: [] },
      { filename: "warehouse_cam_002.mp4", status: "completed", duration_seconds: 98, physics_score: 0.88, error: null, stages: [] },
      { filename: "warehouse_cam_003.mp4", status: "completed", duration_seconds: 112, physics_score: 0.85, error: null, stages: [] },
      { filename: "warehouse_cam_005.mp4", status: "running", duration_seconds: null, physics_score: null, error: null, stages: [{ type: "transfer", status: "running", duration_seconds: null }] },
      { filename: "warehouse_cam_006.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
      { filename: "warehouse_cam_007.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
      { filename: "warehouse_cam_008.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
      { filename: "warehouse_cam_009.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
      { filename: "warehouse_cam_010.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
      { filename: "warehouse_cam_011.mp4", status: "pending", duration_seconds: null, physics_score: null, error: null, stages: [] },
    ],
    stats: {
      avg_time_per_video: 105,
      success_rate: 100,
      avg_physics_score: 0.88,
    },
    recent_logs: [
      { timestamp: new Date(Date.now() - 22000).toISOString(), level: "info", message: "Starting transfer for warehouse_cam_005.mp4" },
      { timestamp: new Date(Date.now() - 21000).toISOString(), level: "info", message: "Style: \"야간\" - Prompt loaded" },
      { timestamp: new Date(Date.now() - 19000).toISOString(), level: "info", message: "Preprocessing depth map..." },
      { timestamp: new Date(Date.now() - 16000).toISOString(), level: "info", message: "Running Cosmos Transfer model..." },
    ],
  };
}

export function JobProgressView({
  jobId,
  requestName = "Job",
  className = "",
  onComplete,
}: JobProgressViewProps) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    // Try to get real progress data first
    getProgress()
      .then((state) => {
        if (state && state.is_active) {
          // Convert ProgressState to JobProgress format
          const jobProgress: JobProgress = {
            job_id: state.job_id,
            job_name: requestName,
            status: "running",
            started_at: state.time.started_at,
            updated_at: state.time.updated_at || new Date().toISOString(),
            elapsed_seconds: state.time.started_at
              ? Math.floor((Date.now() - new Date(state.time.started_at).getTime()) / 1000)
              : 0,
            estimated_total_seconds: null,
            estimated_remaining_seconds: state.time.estimated_remaining,
            total_videos: state.progress.total_files,
            completed_videos: state.progress.completed_files,
            failed_videos: state.progress.failed_files,
            current_video_index: state.progress.completed_files,
            overall_percent: state.progress.percent,
            current_video: state.current_file
              ? {
                  filename: state.current_file,
                  stage: state.current_stage,
                  stage_progress: {
                    current_variant: state.current_variant || 0,
                    total_variants: state.variants.total || 1,
                    percent: state.variants.total > 0
                      ? ((state.current_variant || 0) / state.variants.total) * 100
                      : 0,
                  },
                  stage_started_at: state.time.updated_at || new Date().toISOString(),
                  stage_elapsed_seconds: 0,
                }
              : null,
            pipeline_stages: [
              {
                type: "predict",
                status: state.current_stage === "predict" ? "running" :
                       ["transfer", "reason", "completed"].includes(state.current_stage) ? "completed" : "pending",
                duration_seconds: null,
              },
              {
                type: "transfer",
                status: state.current_stage === "transfer" ? "running" :
                       ["reason", "completed"].includes(state.current_stage) ? "completed" : "pending",
                duration_seconds: null,
              },
              {
                type: "reason",
                status: state.current_stage === "reason" ? "running" :
                       state.current_stage === "completed" ? "completed" : "pending",
                duration_seconds: null,
              },
            ],
            videos: Object.entries(state.files).map(([filename, fileState]) => ({
              filename,
              status: fileState.status === "processing" ? "running" : fileState.status,
              duration_seconds: null,
              physics_score: fileState.physics_score || null,
              error: fileState.error || null,
              stages: [],
            })),
            stats: {
              avg_time_per_video: null,
              success_rate: state.progress.completed_files > 0
                ? ((state.progress.completed_files - state.progress.failed_files) / state.progress.completed_files) * 100
                : 100,
              avg_physics_score: null,
            },
            recent_logs: [],
          };
          setProgress(jobProgress);
        } else {
          // Use mock data for demo
          setUseMockData(true);
          setProgress(getMockProgress(jobId || "demo-job", requestName));
        }
      })
      .catch(() => {
        // Use mock data on error
        setUseMockData(true);
        setProgress(getMockProgress(jobId || "demo-job", requestName));
      });

    // Subscribe to SSE updates
    const unsubscribe = subscribeToProgress(
      (state) => {
        if (state && state.is_active) {
          // Update progress from SSE
          setProgress((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              overall_percent: state.progress.percent,
              completed_videos: state.progress.completed_files,
              failed_videos: state.progress.failed_files,
              current_video: state.current_file
                ? {
                    filename: state.current_file,
                    stage: state.current_stage,
                    stage_progress: {
                      current_variant: state.current_variant || 0,
                      total_variants: state.variants.total || 1,
                      percent: state.variants.total > 0
                        ? ((state.current_variant || 0) / state.variants.total) * 100
                        : 0,
                    },
                    stage_started_at: state.time.updated_at || new Date().toISOString(),
                    stage_elapsed_seconds: 0,
                  }
                : null,
              estimated_remaining_seconds: state.time.estimated_remaining,
            };
          });
        }
      },
      () => {
        // On complete
        onComplete?.();
      },
      () => {
        // On error - continue with mock data
      }
    );

    // For demo: simulate progress updates
    if (useMockData) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (!prev) return prev;
          const newPercent = Math.min(prev.overall_percent + 0.5, 100);
          const newVariantPercent = (prev.current_video?.stage_progress.percent || 0) + 2;

          return {
            ...prev,
            overall_percent: newPercent,
            elapsed_seconds: prev.elapsed_seconds + 1,
            estimated_remaining_seconds: Math.max((prev.estimated_remaining_seconds || 0) - 1, 0),
            current_video: prev.current_video
              ? {
                  ...prev.current_video,
                  stage_progress: {
                    ...prev.current_video.stage_progress,
                    percent: newVariantPercent > 100 ? 0 : newVariantPercent,
                    current_variant: newVariantPercent > 100
                      ? Math.min(prev.current_video.stage_progress.current_variant + 1, prev.current_video.stage_progress.total_variants)
                      : prev.current_video.stage_progress.current_variant,
                  },
                  stage_elapsed_seconds: prev.current_video.stage_elapsed_seconds + 1,
                }
              : null,
          };
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        unsubscribe?.();
      };
    }

    return unsubscribe;
  }, [jobId, requestName, useMockData, onComplete]);

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading progress...</span>
        </div>
      </div>
    );
  }

  const eta = progress.estimated_remaining_seconds ?? calculateETA(progress);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <CardTitle className="text-lg">{progress.job_name}</CardTitle>
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                Running
              </Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Started: {progress.started_at ? new Date(progress.started_at).toLocaleTimeString() : "-"}</div>
              <div>Elapsed: {formatDuration(progress.elapsed_seconds)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span className="font-mono">{progress.overall_percent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                style={{ width: `${progress.overall_percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{progress.completed_videos}/{progress.total_videos} videos</span>
              <span>ETA: ~{formatDuration(eta)}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-semibold">{progress.total_videos}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-semibold text-green-500">{progress.completed_videos}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-semibold text-yellow-500">
                {progress.total_videos - progress.completed_videos - progress.failed_videos}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-semibold text-red-500">{progress.failed_videos}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineVisualizer
            stages={progress.pipeline_stages}
            currentVideo={progress.current_video}
          />
        </CardContent>
      </Card>

      {/* Video Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Video Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <VideoQueueList videos={progress.videos} maxVisible={8} />
        </CardContent>
      </Card>

      {/* Statistics */}
      {progress.stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Avg Time/Video</span>
                <div className="font-mono">
                  {progress.stats.avg_time_per_video
                    ? formatDuration(progress.stats.avg_time_per_video)
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <div className="font-mono text-green-500">
                  {progress.stats.success_rate.toFixed(0)}%
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Avg Physics Score</span>
                <div className="font-mono">
                  {progress.stats.avg_physics_score?.toFixed(2) || "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs (collapsible) */}
      {progress.recent_logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Server Logs</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                {progress.recent_logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 ${
                        log.level === "error"
                          ? "text-red-400"
                          : log.level === "warning"
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
