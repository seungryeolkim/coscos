"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getRequest, getJob } from "@/lib/api";
import {
  Request,
  InputVideo,
  Variant,
  formatDate,
  formatDuration,
  getStatusColor,
  getScoreColor,
  StageResultFromAPI,
  StageType,
  STAGE_METADATA,
  GetJobResponse,
} from "@/lib/types";
import { VideoPreview, VideoPlaceholder } from "@/components/VideoPreview";
import { VariantGrid } from "@/components/VariantCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JobProgressView } from "@/components/JobProgressView";

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const t = useTranslations("detail");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const [request, setRequest] = useState<Request | null>(null);
  const [jobData, setJobData] = useState<GetJobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const inputVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch request data and job data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getRequest(requestId);
        if (response.request) {
          setRequest(response.request);

          // If request has jobId, fetch job data for stage_results
          if (response.request.jobId) {
            try {
              const jobResponse = await getJob(response.request.jobId);
              setJobData(jobResponse);
            } catch (jobErr) {
              console.warn("Could not fetch job data:", jobErr);
            }
          }
        } else {
          setError(t("notFound"));
        }
      } catch (err) {
        console.error("Failed to fetch request:", err);
        setError(t("checkApi"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [requestId, t]);

  // Get selected input (default to first if none selected)
  const selectedInput = useMemo(() => {
    if (!request) return null;
    if (selectedInputId) {
      return request.inputs.find((input) => input.id === selectedInputId) || request.inputs[0];
    }
    return request.inputs[0] || null;
  }, [request, selectedInputId]);

  // Get workflow stages from job data
  const workflowStages = useMemo(() => {
    return jobData?.workflow?.stages || [];
  }, [jobData]);

  // Get stage results from job data
  const stageResults = useMemo(() => {
    return jobData?.stage_results || [];
  }, [jobData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold mb-2">
            {error || t("notFound")}
          </h1>
          <p className="text-muted-foreground mb-4">
            {error ? t("checkApi") : t("doesntExist")}
          </p>
          <Link href="/">
            <Button variant="outline">{t("backToRequests")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: tStatus("pending"),
    running: tStatus("running"),
    completed: tStatus("completed"),
    failed: tStatus("failed"),
  };

  const handleCompare = (variant: Variant) => {
    setSelectedVariant(variant);
    setShowCompare(true);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="shrink-0 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToRequests")}
            </Link>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{request.name}</h1>
              <Badge
                variant="outline"
                className={`${getStatusColor(request.status)} border-current/20`}
              >
                {statusLabels[request.status]}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{formatDate(request.createdAt)}</span>
              {request.totalDuration && <span>{t("duration")}: {formatDuration(request.totalDuration)}</span>}
              <span>{request.totalInputs} {t("inputs")}</span>
              <span>{request.totalVariants} {t("variants")}</span>
            </div>
          </div>

          {/* Stats */}
          {request.status === "completed" && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{t("avgScore")}</div>
                <div className={`text-xl font-mono font-semibold ${getScoreColor(request.avgScore)}`}>
                  {request.avgScore.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{t("passRate")}</div>
                <div className="text-xl font-semibold">
                  {request.passedCount}/{request.totalVariants}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Pipeline Visualization */}
        {(workflowStages.length > 0 || stageResults.length > 0) && (
          <WorkflowPipeline
            stages={workflowStages}
            results={stageResults}
          />
        )}
      </div>

      {/* Main content: Different view based on status */}
      {request.status === "running" ? (
        /* Progress View for running jobs */
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          <JobProgressView
            jobId={request.jobId || request.id}
            requestName={request.name}
          />
        </div>
      ) : (
        /* Normal view: Sidebar + Detail */
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left sidebar - Input list (independent scroll) */}
          <div className="w-72 border-r border-border overflow-y-auto overscroll-contain shrink-0">
            <div className="p-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("inputVideos")}</h2>
              <div className="space-y-2">
                {request.inputs.map((input) => (
                  <InputListItem
                    key={input.id}
                    input={input}
                    isSelected={selectedInput?.id === input.id}
                    onClick={() => setSelectedInputId(input.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right content - Selected input detail (independent scroll) */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-6">
            {selectedInput ? (
              <>
                {/* Stage Results Summary */}
                {stageResults.length > 0 && (
                  <StageResultsSummary results={stageResults} />
                )}

                <InputDetailView
                  input={selectedInput}
                  config={request.config}
                  onCompare={handleCompare}
                  jobResults={jobData?.results}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t("selectInput")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compare dialog */}
      {selectedInput && (
        <Dialog open={showCompare} onOpenChange={setShowCompare}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {t("compare")}: {selectedInput.rgbFilename} → {selectedVariant?.styleName}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6">
              {/* Input */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t("input")}</div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPreview
                    ref={inputVideoRef}
                    src={selectedInput.rgbPath}
                    className="w-full h-full"
                    controls={true}
                    autoPlay={true}
                    muted={true}
                  />
                </div>
              </div>

              {/* Output */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  {t("output")} ({selectedVariant?.styleName})
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {selectedVariant?.outputPath ? (
                    <VideoPreview
                      src={selectedVariant.outputPath}
                      className="w-full h-full"
                      controls={true}
                      autoPlay={true}
                      muted={true}
                      syncRef={inputVideoRef}
                    />
                  ) : (
                    <VideoPlaceholder className="w-full h-full" />
                  )}
                </div>
              </div>
            </div>

            {/* Variant details */}
            {selectedVariant && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("physicsScore")}: </span>
                    <span
                      className={`font-mono ${
                        selectedVariant.physicsScore !== undefined
                          ? getScoreColor(selectedVariant.physicsScore)
                          : ""
                      }`}
                    >
                      {selectedVariant.physicsScore?.toFixed(2) ?? "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("status")}: </span>
                    <span className={selectedVariant.isValid ? "text-success" : "text-error"}>
                      {selectedVariant.isValid ? t("valid") : t("invalid")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("duration")}: </span>
                    <span>
                      {selectedVariant.transferDuration
                        ? formatDuration(selectedVariant.transferDuration)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">{t("prompt")}: </span>
                  <span className="font-mono text-xs">{selectedVariant.prompt}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Workflow Pipeline Visualization Component
function WorkflowPipeline({
  stages,
  results,
}: {
  stages: Array<{ id: string; type: StageType; order: number; config: Record<string, unknown> }>;
  results: StageResultFromAPI[];
}) {
  // If we have results but no stages, construct stages from results
  const displayStages = stages.length > 0
    ? stages
    : results.map(r => ({ id: r.stage_id, type: r.stage_type, order: r.order, config: {} }));

  if (displayStages.length === 0) return null;

  // Sort by order
  const sortedStages = [...displayStages].sort((a, b) => a.order - b.order);

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Workflow:</span>
        <div className="flex items-center gap-1">
          {sortedStages.map((stage, idx) => {
            const result = results.find(r => r.stage_id === stage.id || r.stage_type === stage.type);
            const metadata = STAGE_METADATA[stage.type];
            const isCompleted = result?.status === "completed";
            const isFailed = result?.status === "failed";
            const isRunning = result?.status === "running";

            return (
              <div key={stage.id} className="flex items-center">
                {/* Stage pill */}
                <div
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    ${isCompleted ? "bg-success/10 text-success border border-success/20" : ""}
                    ${isFailed ? "bg-destructive/10 text-destructive border border-destructive/20" : ""}
                    ${isRunning ? "bg-warning/10 text-warning border border-warning/20 animate-pulse" : ""}
                    ${!result ? "bg-muted text-muted-foreground border border-border" : ""}
                  `}
                >
                  <span>{metadata?.icon || "⚙️"}</span>
                  <span>{metadata?.label || stage.type}</span>
                  {result && (
                    <span className="text-[10px] opacity-70">
                      ({result.input_count}→{result.output_count})
                    </span>
                  )}
                </div>

                {/* Arrow between stages */}
                {idx < sortedStages.length - 1 && (
                  <svg className="w-4 h-4 mx-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Stage Results Summary Component
function StageResultsSummary({ results }: { results: StageResultFromAPI[] }) {
  const sortedResults = [...results].sort((a, b) => a.order - b.order);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Stage Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedResults.map((result) => {
            const metadata = STAGE_METADATA[result.stage_type];
            const isCompleted = result.status === "completed";
            const isFailed = result.status === "failed";

            return (
              <div
                key={result.stage_id}
                className={`
                  p-4 rounded-lg border
                  ${isCompleted ? "bg-success/5 border-success/20" : ""}
                  ${isFailed ? "bg-destructive/5 border-destructive/20" : ""}
                  ${!isCompleted && !isFailed ? "bg-muted/50 border-border" : ""}
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{metadata?.icon || "⚙️"}</span>
                  <span className="font-medium">{metadata?.label || result.stage_type}</span>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs ${
                      isCompleted ? "text-success" : isFailed ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {result.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Input: </span>
                    <span className="font-mono">{result.input_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <span className="font-mono">{result.output_count}</span>
                  </div>
                  {result.filtered_count !== undefined && result.filtered_count > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Filtered: </span>
                      <span className="font-mono text-warning">{result.filtered_count}</span>
                    </div>
                  )}
                  {result.duration !== undefined && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Duration: </span>
                      <span className="font-mono">{formatDuration(result.duration)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Input list item component
function InputListItem({
  input,
  isSelected,
  onClick,
}: {
  input: InputVideo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tCommon = useTranslations("common");
  const hasControl = !!input.controlPath;

  // Check if input is an image
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(input.rgbFilename);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected
          ? "bg-accent border border-border"
          : "hover:bg-accent/50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {/* Type indicator */}
        <span className="text-xs">{isImage ? "🖼️" : "🎬"}</span>
        <span className="text-sm font-medium truncate">{input.rgbFilename}</span>
        {hasControl && (
          <Badge variant="secondary" className="text-xs">
            +{input.controlType}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{input.variants.length} {tCommon("variants")}</span>
        {input.passedCount > 0 && (
          <span className="text-success">{input.passedCount} {tCommon("passed")}</span>
        )}
        {input.failedCount > 0 && (
          <span className="text-error">{input.failedCount} {tCommon("failed")}</span>
        )}
      </div>

      {/* Mini status dots */}
      {input.variants.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {input.variants.map((variant) => (
            <div
              key={variant.id}
              className={`w-1.5 h-1.5 rounded-full ${
                variant.isValid
                  ? "bg-success"
                  : variant.physicsScore !== undefined
                  ? "bg-error"
                  : "bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// Input detail view component
function InputDetailView({
  input,
  config,
  onCompare,
  jobResults,
}: {
  input: InputVideo;
  config: { transferPrompts: string[]; controlWeights: { depth: number; edge: number; seg: number; vis: number }; seed: number; threshold: number };
  onCompare: (variant: Variant) => void;
  jobResults?: Array<{
    input: string;
    input_type?: "video" | "image";
    success: boolean;
    output?: string;
    physics_score?: number;
    physics_scores?: number[];
    passed_filter?: boolean;
    error?: string;
  }>;
}) {
  const t = useTranslations("detail");

  // Check if input is an image
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(input.rgbFilename);

  // Find job result for this input
  const jobResult = jobResults?.find(r =>
    r.input.includes(input.rgbFilename) || input.rgbPath.includes(r.input)
  );

  return (
    <div className="space-y-6">
      {/* Input media */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{isImage ? "🖼️" : "🎬"}</span>
            {t("input")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RGB input */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">
                {isImage ? "Input Image" : t("rgbVideo")}
              </div>
              <div className="aspect-video">
                <VideoPreview src={input.rgbPath} title="Original" autoPlayOnVisible={true} className="w-full h-full" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate">{input.rgbFilename}</div>
            </div>

            {/* Control input (if exists) */}
            {input.controlPath ? (
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  {input.controlType?.charAt(0).toUpperCase()}
                  {input.controlType?.slice(1)} Map (weight: {input.controlWeight})
                </div>
                <div className="aspect-video">
                  <VideoPreview
                    src={input.controlPath}
                    title={input.controlType || "Control"}
                    autoPlayOnVisible={true}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  {input.controlFilename}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t("controlInput")}</div>
                <div className="aspect-video">
                  <VideoPlaceholder title={t("noControlInput")} className="w-full h-full" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{t("rgbOnly")}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Job Result (if available from stage results) */}
      {jobResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className={jobResult.success ? "text-success font-medium" : "text-destructive font-medium"}>
                  {jobResult.success ? "Success" : "Failed"}
                </div>
              </div>
              {jobResult.physics_scores && jobResult.physics_scores.length > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground">Physics Scores</div>
                  <div className="font-mono text-sm">
                    {jobResult.physics_scores.map((s, i) => (
                      <span key={i} className={getScoreColor(s)}>
                        {s.toFixed(2)}{i < jobResult.physics_scores!.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {jobResult.passed_filter !== undefined && (
                <div>
                  <div className="text-sm text-muted-foreground">Filter</div>
                  <div className={jobResult.passed_filter ? "text-success" : "text-warning"}>
                    {jobResult.passed_filter ? "Passed" : "Filtered"}
                  </div>
                </div>
              )}
              {jobResult.error && (
                <div className="col-span-full">
                  <div className="text-sm text-muted-foreground">Error</div>
                  <div className="text-destructive text-sm">{jobResult.error}</div>
                </div>
              )}
            </div>

            {/* Final output preview */}
            {jobResult.output && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">Final Output</div>
                <div className="aspect-video max-w-md">
                  <VideoPreview
                    src={jobResult.output}
                    title="Final Output"
                    autoPlayOnVisible={true}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Output variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("outputVariants")}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {input.passedCount} {t("passed")} / {input.variants.length} {t("total")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {input.variants.length > 0 ? (
            <VariantGrid variants={input.variants} onSelectVariant={onCompare} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("noVariants")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("configuration")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">{t("seed")}</div>
              <div className="font-mono">{config.seed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("threshold")}</div>
              <div className="font-mono">{config.threshold}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("depthWeight")}</div>
              <div className="font-mono">{config.controlWeights.depth}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("edgeWeight")}</div>
              <div className="font-mono">{config.controlWeights.edge}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">{t("prompts")}</div>
            <div className="space-y-2">
              {config.transferPrompts.map((prompt, idx) => (
                <div
                  key={idx}
                  className="text-sm bg-secondary p-2 rounded font-mono text-muted-foreground"
                >
                  {idx + 1}. {prompt}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
