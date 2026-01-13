"use client";

import { PipelineStage, STAGE_CONFIG, formatDuration } from "@/lib/types";

interface PipelineStageInfo {
  type: PipelineStage;
  status: "pending" | "running" | "completed" | "skipped" | "failed";
  duration_seconds: number | null;
}

interface CurrentVideoInfo {
  filename: string;
  stage: PipelineStage;
  stage_progress: {
    current_variant: number;
    total_variants: number;
    percent: number;
  };
}

interface PipelineVisualizerProps {
  stages: PipelineStageInfo[];
  currentVideo?: CurrentVideoInfo | null;
  className?: string;
}

export function PipelineVisualizer({
  stages,
  currentVideo,
  className = "",
}: PipelineVisualizerProps) {
  // Filter out non-pipeline stages (idle, uploading, completed, failed)
  const pipelineStages = stages.filter((s) =>
    ["predict", "transfer", "reason"].includes(s.type)
  );

  if (pipelineStages.length === 0) {
    return null;
  }

  return (
    <div className={`bg-secondary/30 rounded-lg p-4 ${className}`}>
      {/* Current video filename */}
      {currentVideo && (
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Current: </span>
          <span className="font-mono text-sm">{currentVideo.filename}</span>
        </div>
      )}

      {/* Pipeline stages visualization */}
      <div className="flex items-center justify-center gap-2">
        {pipelineStages.map((stage, index) => {
          const config = STAGE_CONFIG[stage.type];
          const isActive = stage.status === "running";
          const isCompleted = stage.status === "completed";
          const isSkipped = stage.status === "skipped";
          const isFailed = stage.status === "pending" && index > 0 && stages[index - 1]?.status === "failed";

          // Get stage-specific info for current stage
          const stageInfo =
            currentVideo && currentVideo.stage === stage.type
              ? currentVideo.stage_progress
              : null;

          return (
            <div key={stage.type} className="flex items-center">
              {/* Stage node */}
              <div
                className={`relative flex flex-col items-center transition-all duration-300 ${
                  isActive ? "scale-110" : ""
                }`}
              >
                {/* Stage box */}
                <div
                  className={`w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                    isActive
                      ? "border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20"
                      : isCompleted
                      ? "border-green-500 bg-green-500/10"
                      : isSkipped
                      ? "border-gray-400 bg-gray-400/10 border-dashed"
                      : isFailed
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-gray-600 bg-gray-600/10"
                  }`}
                >
                  {/* Stage name */}
                  <span
                    className={`text-xs font-semibold ${
                      isActive
                        ? "text-yellow-500"
                        : isCompleted
                        ? "text-green-500"
                        : isSkipped
                        ? "text-gray-400"
                        : "text-gray-500"
                    }`}
                  >
                    {config.label}
                  </span>

                  {/* Status icon */}
                  <span className="text-lg mt-1">
                    {isActive ? (
                      <span className="animate-spin inline-block">⟳</span>
                    ) : isCompleted ? (
                      "✓"
                    ) : isSkipped ? (
                      "−"
                    ) : (
                      "○"
                    )}
                  </span>

                  {/* Duration or progress */}
                  <span className="text-xs text-muted-foreground mt-1">
                    {isActive && stageInfo ? (
                      <>
                        {stageInfo.current_variant}/{stageInfo.total_variants}
                      </>
                    ) : isCompleted && stage.duration_seconds ? (
                      formatDuration(stage.duration_seconds)
                    ) : isActive ? (
                      "処理中..."
                    ) : (
                      "待機"
                    )}
                  </span>
                </div>

                {/* Progress bar for active stage */}
                {isActive && stageInfo && (
                  <div className="w-full mt-2">
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all duration-300"
                        style={{ width: `${stageInfo.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow connector */}
              {index < pipelineStages.length - 1 && (
                <div className="mx-2">
                  <svg
                    className={`w-6 h-4 ${
                      isCompleted ? "text-green-500" : "text-gray-600"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 12"
                  >
                    <path d="M0 6h20l-4-4v3H0v2h16v3l4-4H0z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage info */}
      {currentVideo && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Current Stage: </span>
              <span className={STAGE_CONFIG[currentVideo.stage]?.color || ""}>
                {STAGE_CONFIG[currentVideo.stage]?.label || currentVideo.stage}
              </span>
            </div>
            {currentVideo.stage_progress.total_variants > 1 && (
              <div>
                <span className="text-muted-foreground">Variant: </span>
                <span>
                  {currentVideo.stage_progress.current_variant}/
                  {currentVideo.stage_progress.total_variants}
                </span>
              </div>
            )}
          </div>

          {/* Stage progress bar */}
          <div className="mt-2">
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${currentVideo.stage_progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Stage Progress</span>
              <span>{currentVideo.stage_progress.percent.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
