"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ProgressState,
  PipelineStage,
  STAGE_CONFIG,
  formatDuration,
} from "@/lib/types";
import { getProgress, subscribeToProgress } from "@/lib/api";

interface ProgressMonitorProps {
  pollInterval?: number;
  useSSE?: boolean;
  compact?: boolean;
}

export function ProgressMonitor({
  pollInterval = 2000,
  useSSE = true,
  compact = false,
}: ProgressMonitorProps) {
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    // Initial load
    getProgress().then(setProgress);

    if (useSSE) {
      // SSE stream connection
      const unsubscribe = subscribeToProgress(
        setProgress,
        () => setProgress(null),
        () => {
          // On error, fall back to polling
          const interval = setInterval(async () => {
            const state = await getProgress();
            setProgress(state);
          }, pollInterval);
          return () => clearInterval(interval);
        }
      );
      return unsubscribe;
    } else {
      // Polling mode
      const interval = setInterval(async () => {
        const state = await getProgress();
        setProgress(state);
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [pollInterval, useSSE]);

  if (!progress || !progress.is_active) {
    return null;
  }

  const stageConfig = STAGE_CONFIG[progress.current_stage];
  const { percent, completed_files, total_files, remaining_files, failed_files } =
    progress.progress;

  // Compact mode: floating card
  if (compact) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-primary/20 bg-card/95 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <Badge variant="outline" className={stageConfig.color}>
                  {stageConfig.labelKo}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {completed_files}/{total_files}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Current file */}
            {progress.current_file && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {progress.current_file}
              </p>
            )}

            {/* ETA */}
            {progress.time.estimated_remaining && (
              <p className="text-xs text-muted-foreground mt-1">
                남은 시간: ~{formatDuration(progress.time.estimated_remaining)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full view
  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            파이프라인 실행 중
          </CardTitle>
          <Badge variant="outline" className={stageConfig.color}>
            {stageConfig.labelKo}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Main progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>전체 진행률</span>
            <span>{percent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-semibold">{total_files}</div>
            <div className="text-xs text-muted-foreground">전체</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-500">
              {completed_files}
            </div>
            <div className="text-xs text-muted-foreground">완료</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-500">
              {failed_files}
            </div>
            <div className="text-xs text-muted-foreground">실패</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-yellow-500">
              {remaining_files}
            </div>
            <div className="text-xs text-muted-foreground">남음</div>
          </div>
        </div>

        {/* Current processing info */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {progress.current_file || "대기 중..."}
              </p>
              {progress.current_variant !== null &&
                progress.variants.total > 0 && (
                  <p className="text-sm text-muted-foreground">
                    변형 {progress.current_variant + 1}/{progress.variants.total}
                  </p>
                )}
            </div>
            {progress.time.estimated_remaining && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">예상 남은 시간</p>
                <p className="font-mono">
                  {formatDuration(progress.time.estimated_remaining)}
                </p>
              </div>
            )}
          </div>

          {/* Stage progress dots */}
          <div className="flex items-center gap-3 mt-3">
            {(["predict", "transfer", "reason"] as PipelineStage[]).map(
              (stage) => {
                const config = STAGE_CONFIG[stage];
                const isActive = progress.current_stage === stage;
                const isPassed =
                  ["transfer", "reason", "completed"].includes(
                    progress.current_stage
                  ) &&
                  (stage === "predict" ||
                    (stage === "transfer" &&
                      ["reason", "completed"].includes(
                        progress.current_stage
                      )));

                return (
                  <div key={stage} className="flex items-center gap-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isActive
                          ? "bg-primary animate-pulse"
                          : isPassed
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isActive ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {config.label}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Message */}
        {progress.message && (
          <p className="text-sm text-muted-foreground mt-3 italic">
            {progress.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
