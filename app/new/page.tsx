"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProgressMonitor } from "@/components/ProgressMonitor";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";
import {
  VideoFile,
  FolderInfo,
  WorkflowStage,
  validateWorkflow,
  JobInfo,
  PredictParams,
  InputWithPrompts,
} from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { browseDirectory, createJob, createWorkflowJob, checkAPIHealth, getJob, getServerConfig } from "@/lib/api";

// Step type
type Step = 1 | 2 | 3;

// Progress Stepper Component
function ProgressStepper({
  currentStep,
  onStepClick,
  canGoToStep,
}: {
  currentStep: Step;
  onStepClick: (step: Step) => void;
  canGoToStep: (step: Step) => boolean;
}) {
  const t = useTranslations("new");

  const steps = [
    { num: 1 as Step, label: t("step1Label"), desc: t("step1Desc") },
    { num: 2 as Step, label: t("step2Label"), desc: t("step2Desc") },
    { num: 3 as Step, label: t("step3Label"), desc: t("step3Desc") },
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center flex-1">
          {/* Step circle and content */}
          <button
            onClick={() => canGoToStep(step.num) && onStepClick(step.num)}
            disabled={!canGoToStep(step.num)}
            className={`flex items-center gap-3 ${canGoToStep(step.num) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep === step.num
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.num
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step.num ? "✓" : step.num}
            </div>
            <div className="text-left">
              <div className={`text-sm font-medium ${currentStep >= step.num ? '' : 'text-muted-foreground'}`}>
                {step.label}
              </div>
              <div className="text-xs text-muted-foreground hidden md:block">
                {step.desc}
              </div>
            </div>
          </button>

          {/* Connector line */}
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.num ? 'bg-success' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const t = useTranslations("new");
  const tHome = useTranslations("home");
  const tStatus = useTranslations("status");

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // State
  const [apiConnected, setApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input type state
  const [inputType, setInputType] = useState<"video" | "image">("video");

  // File browser state
  const [directoryPath, setDirectoryPath] = useState("");
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [browsingPath, setBrowsingPath] = useState("~");
  const [samplesPath, setSamplesPath] = useState("");

  // Workflow state
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [jobName, setJobName] = useState("");

  // UI state
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);

  // Check API and get server config on mount
  useEffect(() => {
    const initializeFromServer = async () => {
      const isHealthy = await checkAPIHealth();
      setApiConnected(isHealthy);

      if (isHealthy) {
        const config = await getServerConfig();
        if (config?.samples_path) {
          setSamplesPath(config.samples_path);
          if (!directoryPath) {
            setDirectoryPath(config.samples_path);
          }
        }
      }
    };

    initializeFromServer();
  }, []);

  // Poll for job status when a job is created
  useEffect(() => {
    if (!runningJobId) {
      setJobInfo(null);
      return;
    }

    getJob(runningJobId).then((res) => setJobInfo(res.job)).catch(console.error);

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
      const response = await browseDirectory(directoryPath, inputType);
      setFiles(response.videos);
      setFolders(response.folders || []);
      setSelectedFiles(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("browseFailed"));
      setFiles([]);
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Folder browser
  const [browserFolders, setBrowserFolders] = useState<FolderInfo[]>([]);
  const [browserLoading, setBrowserLoading] = useState(false);

  const loadBrowserFolders = async (path: string) => {
    setBrowserLoading(true);
    try {
      const response = await browseDirectory(path, inputType);
      setBrowserFolders(response.folders || []);
      setBrowsingPath(response.path);
    } catch {
      setBrowserFolders([]);
    } finally {
      setBrowserLoading(false);
    }
  };

  const openFolderBrowser = () => {
    setFolderBrowserOpen(true);
    loadBrowserFolders(directoryPath || "~");
  };

  const navigateToFolder = (path: string) => {
    loadBrowserFolders(path);
  };

  const navigateUp = () => {
    const parent = browsingPath.split("/").slice(0, -1).join("/") || "/";
    loadBrowserFolders(parent);
  };

  const selectFolder = (path: string) => {
    setDirectoryPath(path);
    setFolderBrowserOpen(false);
    setTimeout(() => handleBrowse(), 100);
  };

  // Toggle file selection
  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => setSelectedFiles(new Set(files.map((f) => f.path)));
  const deselectAll = () => setSelectedFiles(new Set());

  // Auto-apply prompts from selected files to Predict stage
  useEffect(() => {
    if (selectedFiles.size === 0) return;

    // Collect prompts from selected files with prompt files
    const selectedWithPrompts = files.filter(
      (f) => selectedFiles.has(f.path) && f.promptFile && f.promptFile.prompts.length > 0
    );

    if (selectedWithPrompts.length === 0) return;

    // Find predict stage
    const predictStage = workflowStages.find((s) => s.type === "predict");
    if (!predictStage) return;

    // Collect all prompts
    const allPrompts = selectedWithPrompts.flatMap(
      (f) => f.promptFile?.prompts || []
    );

    // Check if prompts are already applied (avoid infinite loop)
    const currentPrompts = (predictStage.config as PredictParams).prompts || [];
    if (JSON.stringify(currentPrompts) === JSON.stringify(allPrompts)) return;

    // Apply prompts to predict stage
    const newStages = workflowStages.map((s) => {
      if (s.id === predictStage.id) {
        return {
          ...s,
          config: {
            ...s.config,
            prompts: allPrompts,
          } as PredictParams,
        };
      }
      return s;
    });
    setWorkflowStages(newStages);
  }, [selectedFiles, files, workflowStages]);

  // Validate workflow
  const workflowValidation = validateWorkflow(workflowStages, { inputType });

  // Step navigation helpers
  const canGoToStep = (step: Step): boolean => {
    if (step === 1) return true;
    if (step === 2) return selectedFiles.size > 0;
    if (step === 3) return selectedFiles.size > 0 && workflowValidation.valid;
    return false;
  };

  const goToNextStep = () => {
    if (currentStep < 3 && canGoToStep((currentStep + 1) as Step)) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Create and run job
  const handleSubmit = async () => {
    if (selectedFiles.size === 0) {
      setError(t("selectAtLeastOne"));
      return;
    }

    if (!workflowValidation.valid) {
      setError(workflowValidation.error || t("invalidWorkflow"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const inputs: InputWithPrompts[] = Array.from(selectedFiles).map((filePath) => {
        const fileInfo = files.find((f) => f.path === filePath);
        return {
          path: filePath,
          prompts: fileInfo?.promptFile?.prompts || [],
        };
      });

      const response = await createWorkflowJob({
        name: jobName || undefined,
        input_type: inputType,
        input_paths: Array.from(selectedFiles),
        video_paths: Array.from(selectedFiles),
        inputs: inputs,
        workflow: {
          stages: workflowStages.map((stage) => ({
            id: stage.id,
            type: stage.type,
            order: stage.order,
            config: JSON.parse(JSON.stringify(stage.config)),
          })),
          name: jobName || undefined,
        },
      });
      setRunningJobId(response.job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get selected file names for display
  const selectedFileNames = files
    .filter((f) => selectedFiles.has(f.path))
    .map((f) => f.name);

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              apiConnected ? "bg-success/10 text-success" : "bg-error/10 text-error"
            }`}
          >
            {apiConnected ? tHome("apiConnected") : tHome("apiDisconnected")}
          </span>
        </div>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Job Status / Progress Monitor */}
      {runningJobId && (
        <div className="mb-8">
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
                      {t("requestId")}: {jobInfo.id} • {t("mode")}: {jobInfo.mode} •{" "}
                      {jobInfo.video_count} {t("videos")}
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

          <ProgressMonitor useSSE={true} />

          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              {t("viewAllRequests")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRunningJobId(null);
                setSelectedFiles(new Set());
                setWorkflowStages([]);
                setCurrentStep(1);
              }}
            >
              {t("createAnother")}
            </Button>
          </div>
        </div>
      )}

      {/* Main Form with Steps */}
      {!runningJobId && (
        <div className="space-y-6">
          {/* Progress Stepper */}
          <ProgressStepper
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            canGoToStep={canGoToStep}
          />

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Basic Settings & File Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Request Name */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">{t("requestName")}</h2>
                <Input
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder={t("autoGenerated")}
                />
              </section>

              {/* Input Type Selection */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">{t("inputType")}</h2>
                <div className="flex gap-2">
                  <Button
                    variant={inputType === "video" ? "default" : "outline"}
                    onClick={() => {
                      setInputType("video");
                      setFiles([]);
                      setSelectedFiles(new Set());
                    }}
                    className="flex-1"
                  >
                    <span className="mr-2">🎬</span>
                    {t("inputTypeVideo")}
                  </Button>
                  <Button
                    variant={inputType === "image" ? "default" : "outline"}
                    onClick={() => {
                      setInputType("image");
                      setFiles([]);
                      setSelectedFiles(new Set());
                    }}
                    className="flex-1"
                  >
                    <span className="mr-2">🖼️</span>
                    {t("inputTypeImage")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {inputType === "video" ? t("inputTypeVideoDesc") : t("inputTypeImageDesc")}
                </p>
              </section>

              {/* File Browser */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">
                  {inputType === "video" ? t("selectVideos") : t("selectImages")}
                </h2>
                <div className="flex gap-2 mb-4">
                  {/* Folder browser button */}
                  <Popover open={folderBrowserOpen} onOpenChange={setFolderBrowserOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={openFolderBrowser}
                        title={t("openFolderBrowser")}
                      >
                        📁
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-3 border-b">
                        <div className="text-sm font-medium mb-1">{t("folderBrowser")}</div>
                        <div className="text-xs text-muted-foreground truncate">{browsingPath}</div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={navigateUp}
                          disabled={browsingPath === "/" || browsingPath === "~"}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>📂</span>
                          <span>..</span>
                        </button>
                        {browserLoading ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            {t("loading")}...
                          </div>
                        ) : browserFolders.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            {t("noFolders")}
                          </div>
                        ) : (
                          browserFolders.map((folder) => (
                            <div
                              key={folder.path}
                              className="flex items-center gap-1 hover:bg-secondary/50"
                            >
                              <button
                                onClick={() => navigateToFolder(folder.path)}
                                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-left"
                              >
                                <span>📁</span>
                                <span className="truncate">{folder.name}</span>
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => selectFolder(folder.path)}
                                className="mr-1 text-xs"
                              >
                                {t("select")}
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => selectFolder(browsingPath)}
                        >
                          {t("selectCurrentFolder")}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input
                    type="text"
                    value={directoryPath}
                    onChange={(e) => setDirectoryPath(e.target.value)}
                    placeholder={t("directoryPlaceholder")}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleBrowse()}
                  />
                  <Button onClick={handleBrowse} disabled={isLoading}>
                    {isLoading ? t("loading") : t("browse")}
                  </Button>
                </div>

                {files.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {t("fileCountStatus", { total: files.length, selected: selectedFiles.size })}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAll}>
                          {t("selectAll")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={deselectAll}>
                          {t("deselect")}
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                      {files.map((file) => (
                        <label
                          key={file.path}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer border-b border-border last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedFiles.has(file.path)}
                            onCheckedChange={() => toggleFile(file.path)}
                          />
                          <span className="flex-1 truncate text-sm">{file.name}</span>
                          {file.promptFile && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              📝 {file.promptFile.prompts.length} prompts
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatSize(file.size)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {files.length === 0 && !isLoading && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {t("enterDirectory")}
                  </div>
                )}
              </section>

              {/* Next button */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.push("/")}>
                  {t("cancel")}
                </Button>
                <Button onClick={goToNextStep} disabled={selectedFiles.size === 0}>
                  {t("next")} →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Build Workflow */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Selected Files Summary */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t("selectedFiles")}:</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedFileNames.length <= 3
                      ? selectedFileNames.join(", ")
                      : `${selectedFileNames.slice(0, 3).join(", ")} +${selectedFileNames.length - 3}`}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                  {t("edit")}
                </Button>
              </div>

              {/* Workflow Builder */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">{t("buildWorkflow")}</h2>
                <WorkflowBuilder stages={workflowStages} onStagesChange={setWorkflowStages} />
              </section>

              {/* Navigation buttons */}
              <div className="flex justify-between gap-4">
                <Button variant="outline" onClick={goToPrevStep}>
                  ← {t("previous")}
                </Button>
                <Button onClick={goToNextStep} disabled={!workflowValidation.valid}>
                  {t("next")} →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Summary */}
              <section className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4">{t("reviewTitle")}</h2>

                <div className="space-y-4">
                  {/* Request Name */}
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">{t("requestName")}</span>
                    <span className="text-sm font-medium">{jobName || t("autoGenerated")}</span>
                  </div>

                  {/* Input Type */}
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">{t("inputType")}</span>
                    <span className="text-sm font-medium">
                      {inputType === "video" ? "🎬 Video" : "🖼️ Image"}
                    </span>
                  </div>

                  {/* Selected Files */}
                  <div className="py-2 border-b border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("selectedFiles")}</span>
                      <span className="text-sm font-medium">{selectedFiles.size} files</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedFileNames.map((name) => (
                        <span
                          key={name}
                          className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Workflow */}
                  <div className="py-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("buildWorkflow")}</span>
                      <span className="text-sm font-medium">{workflowStages.length} stages</span>
                    </div>
                    <div className="flex gap-2">
                      {workflowStages.map((stage, idx) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-2"
                        >
                          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                            {stage.type.charAt(0).toUpperCase() + stage.type.slice(1)}
                          </span>
                          {idx < workflowStages.length - 1 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Submit buttons */}
              <div className="flex justify-between gap-4">
                <Button variant="outline" onClick={goToPrevStep}>
                  ← {t("previous")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedFiles.size === 0 || !workflowValidation.valid}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? t("creating") : t("runPipeline")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
