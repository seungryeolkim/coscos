"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressMonitor } from "@/components/ProgressMonitor";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";
import {
  VideoFile,
  WorkflowStage,
  validateWorkflow,
  JobInfo,
} from "@/lib/types";
import { browseDirectory, createJob, checkAPIHealth, getJob } from "@/lib/api";

export default function NewJobPage() {
  const router = useRouter();

  // State
  const [apiConnected, setApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File browser state
  const [directoryPath, setDirectoryPath] = useState("~/cosmosqzb/input");
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

  // Workflow state
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [jobName, setJobName] = useState("");

  // UI state
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);

  // Check API on mount
  useEffect(() => {
    checkAPIHealth().then(setApiConnected);
  }, []);

  // Poll for job status when a job is created
  useEffect(() => {
    if (!runningJobId) {
      setJobInfo(null);
      return;
    }

    // Initial fetch
    getJob(runningJobId).then((res) => setJobInfo(res.job)).catch(console.error);

    // Poll every 2 seconds until completed or failed
    const interval = setInterval(async () => {
      try {
        const res = await getJob(runningJobId);
        setJobInfo(res.job);
        if (res.job.status === "completed" || res.job.status === "failed") {
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Failed to fetch job status:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runningJobId]);

  // Browse directory
  const handleBrowse = async () => {
    if (!directoryPath.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await browseDirectory(directoryPath);
      setVideos(response.videos);
      setSelectedVideos(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to browse directory");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle video selection
  const toggleVideo = (path: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedVideos(newSelected);
  };

  // Select/deselect all
  const selectAll = () => setSelectedVideos(new Set(videos.map((v) => v.path)));
  const deselectAll = () => setSelectedVideos(new Set());

  // Validate workflow
  const workflowValidation = validateWorkflow(workflowStages);

  // Create and run job
  const handleSubmit = async () => {
    if (selectedVideos.size === 0) {
      setError("Please select at least one video");
      return;
    }

    if (!workflowValidation.valid) {
      setError(workflowValidation.error || "Invalid workflow");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build the job config based on workflow stages
      // For now, we'll convert to the old format for backward compatibility
      const firstStage = workflowStages[0];
      let mode: "predict" | "transfer" | "full" = "transfer";

      if (workflowStages.length === 1 && firstStage.type === "predict") {
        mode = "predict";
      } else if (workflowStages.length === 1 && firstStage.type === "transfer") {
        mode = "transfer";
      } else {
        mode = "full";
      }

      // Extract transfer styles if any transfer stage exists
      const transferStage = workflowStages.find((s) => s.type === "transfer");
      const transferConfig = transferStage?.config as any;
      const transferStyles = transferConfig?.styles || [];

      // Extract reason config if any reason stage exists
      const reasonStage = workflowStages.find((s) => s.type === "reason");
      const reasonConfig = reasonStage?.config as any;
      const threshold = reasonConfig?.threshold || 0.7;

      // Extract seed from predict or transfer stage
      const predictStage = workflowStages.find((s) => s.type === "predict");
      const predictConfig = predictStage?.config as any;
      const seed = predictConfig?.seed || transferConfig?.seed || 42;

      const jobRequest = {
        name: jobName || undefined,
        video_paths: Array.from(selectedVideos),
        config: {
          mode,
          transfer_styles: transferStyles,
          seed,
          threshold,
        },
      };

      const response = await createJob(jobRequest);
      setRunningJobId(response.job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">New Job</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              apiConnected ? "bg-success/10 text-success" : "bg-error/10 text-error"
            }`}
          >
            {apiConnected ? "API Connected" : "API Disconnected"}
          </span>
        </div>
        <p className="text-muted-foreground">Build your custom Cosmos pipeline</p>
      </div>

      {/* Job Status / Progress Monitor */}
      {runningJobId && (
        <div className="mb-8">
          {/* Job Status Card */}
          {jobInfo && (
            <div
              className={`mb-4 p-4 rounded-lg border ${
                jobInfo.status === "completed"
                  ? "bg-success/10 border-success/30"
                  : jobInfo.status === "failed"
                  ? "bg-error/10 border-error/30"
                  : jobInfo.status === "running"
                  ? "bg-warning/10 border-warning/30"
                  : "bg-muted/50 border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg ${
                      jobInfo.status === "completed"
                        ? "text-success"
                        : jobInfo.status === "failed"
                        ? "text-error"
                        : jobInfo.status === "running"
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
                  >
                    {jobInfo.status === "completed"
                      ? "✓"
                      : jobInfo.status === "failed"
                      ? "✗"
                      : jobInfo.status === "running"
                      ? "⟳"
                      : "○"}
                  </span>
                  <div>
                    <h3 className="font-medium">{jobInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Job ID: {jobInfo.id} • Mode: {jobInfo.mode} •{" "}
                      {jobInfo.video_count} video(s)
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${
                    jobInfo.status === "completed"
                      ? "bg-success/20 text-success"
                      : jobInfo.status === "failed"
                      ? "bg-error/20 text-error"
                      : jobInfo.status === "running"
                      ? "bg-warning/20 text-warning"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {jobInfo.status.toUpperCase()}
                </span>
              </div>

              {jobInfo.error && (
                <div className="mt-2 p-2 bg-error/10 rounded text-sm text-error">
                  {jobInfo.error}
                </div>
              )}
            </div>
          )}

          {/* Progress Monitor (for running jobs) */}
          <ProgressMonitor useSSE={true} />

          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              View All Requests
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRunningJobId(null);
                setSelectedVideos(new Set());
                setWorkflowStages([]);
              }}
            >
              Create Another Job
            </Button>
          </div>
        </div>
      )}

      {/* Main Form */}
      {!runningJobId && (
        <div className="space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm">
              {error}
            </div>
          )}

          {/* Section 1: File Browser */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">1. Select Videos</h2>
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder="Enter directory path..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
              />
              <Button onClick={handleBrowse} disabled={isLoading}>
                {isLoading ? "Loading..." : "Browse"}
              </Button>
            </div>

            {videos.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {videos.length} videos, {selectedVideos.size} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Deselect
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                  {videos.map((video) => (
                    <label
                      key={video.path}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer border-b border-border last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedVideos.has(video.path)}
                        onCheckedChange={() => toggleVideo(video.path)}
                      />
                      <span className="flex-1 truncate text-sm">{video.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatSize(video.size)}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {videos.length === 0 && !isLoading && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Enter a directory path and click Browse
              </div>
            )}
          </section>

          {/* Section 2: Workflow Builder */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">2. Build Workflow</h2>
            <WorkflowBuilder stages={workflowStages} onStagesChange={setWorkflowStages} />
          </section>

          {/* Section 3: Job Settings */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">3. Job Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Job Name (optional)</label>
                <Input
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Selected Videos</label>
                <div className="h-10 flex items-center text-sm text-muted-foreground">
                  {selectedVideos.size} video{selectedVideos.size !== 1 ? "s" : ""} selected
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                selectedVideos.size === 0 ||
                !workflowValidation.valid
              }
              className="min-w-[140px]"
            >
              {isSubmitting ? "Creating..." : "Run Pipeline"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
