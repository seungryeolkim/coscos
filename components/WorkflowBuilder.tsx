"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkflowStage,
  StageType,
  PredictParams,
  TransferParams,
  ReasonStageConfig,
  WorkflowProfile,
  STAGE_METADATA,
  DEFAULT_PROFILES,
  DEFAULT_PREDICT_PARAMS,
  DEFAULT_TRANSFER_PARAMS,
  DEFAULT_REASON_STAGE_CONFIG,
  TRANSFER_STYLES,
  CONTROL_WEIGHT_PRESETS,
  REASON_CRITERIA,
  generateStageId,
  validateWorkflow,
} from "@/lib/types";

interface WorkflowBuilderProps {
  stages: WorkflowStage[];
  onStagesChange: (stages: WorkflowStage[]) => void;
}

// Local storage key for custom profiles
const CUSTOM_PROFILES_KEY = "coscos-custom-profiles";

// Load custom profiles from localStorage
const loadCustomProfiles = (): WorkflowProfile[] => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CUSTOM_PROFILES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom profiles to localStorage
const saveCustomProfiles = (profiles: WorkflowProfile[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(profiles));
};

export function WorkflowBuilder({ stages, onStagesChange }: WorkflowBuilderProps) {
  const t = useTranslations("workflow");
  const tPredict = useTranslations("workflow.predict");
  const tTransfer = useTranslations("workflow.transfer");
  const tReason = useTranslations("workflow.reason");

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [configEditMode, setConfigEditMode] = useState<"ui" | "json">("ui");
  const [jsonCode, setJsonCode] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Custom profiles state
  const [customProfiles, setCustomProfiles] = useState<WorkflowProfile[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  // Load custom profiles on mount
  useEffect(() => {
    setCustomProfiles(loadCustomProfiles());
  }, []);

  // All profiles (built-in + custom)
  const allProfiles = useMemo(() => [...DEFAULT_PROFILES, ...customProfiles], [customProfiles]);

  const validation = useMemo(() => validateWorkflow(stages), [stages]);

  // Get active stage
  const activeStage = stages.find((s) => s.id === activeStageId);

  // Track previous active stage ID to detect stage switches
  const prevActiveStageIdRef = useRef<string | null>(null);

  // Sync JSON with active stage config
  useEffect(() => {
    if (!activeStage) return;

    const stageChanged = prevActiveStageIdRef.current !== activeStageId;
    prevActiveStageIdRef.current = activeStageId;

    // Update JSON when: stage changed (any mode) OR UI mode config update
    if (stageChanged || configEditMode === "ui") {
      setJsonCode(JSON.stringify(activeStage.config, null, 2));
      setJsonError(null);
    }
  }, [activeStage, activeStageId, configEditMode]);

  // Add stage
  const addStage = useCallback(
    (type: StageType) => {
      if (stages.length >= 4) return;

      const defaultConfig =
        type === "predict"
          ? DEFAULT_PREDICT_PARAMS
          : type === "transfer"
          ? DEFAULT_TRANSFER_PARAMS
          : DEFAULT_REASON_STAGE_CONFIG;

      const newStage: WorkflowStage = {
        id: generateStageId(),
        type,
        order: stages.length + 1,
        config: { ...defaultConfig },
      };

      const newStages = [...stages, newStage];
      onStagesChange(newStages);
      setActiveStageId(newStage.id);
    },
    [stages, onStagesChange]
  );

  // Remove stage
  const removeStage = useCallback(
    (id: string) => {
      const newStages = stages
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }));
      onStagesChange(newStages);
      if (activeStageId === id) {
        setActiveStageId(newStages.length > 0 ? newStages[newStages.length - 1].id : null);
      }
    },
    [stages, activeStageId, onStagesChange]
  );

  // Move stage
  const moveStage = useCallback(
    (id: string, direction: "up" | "down") => {
      const index = stages.findIndex((s) => s.id === id);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === stages.length - 1)
      ) {
        return;
      }

      const newStages = [...stages];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newStages[index], newStages[swapIndex]] = [newStages[swapIndex], newStages[index]];

      // Update order numbers
      newStages.forEach((s, i) => {
        s.order = i + 1;
      });

      onStagesChange(newStages);
    },
    [stages, onStagesChange]
  );

  // Update stage config
  const updateStageConfig = useCallback(
    (id: string, config: PredictParams | TransferParams | ReasonStageConfig) => {
      const newStages = stages.map((s) => (s.id === id ? { ...s, config } : s));
      onStagesChange(newStages);
    },
    [stages, onStagesChange]
  );

  // Apply profile to workflow
  const applyProfile = useCallback(
    (profileId: string) => {
      const profile = allProfiles.find((p) => p.id === profileId);
      if (!profile) return;

      const newStages: WorkflowStage[] = profile.stages.map((s) => ({
        ...s,
        id: generateStageId(),
        config: JSON.parse(JSON.stringify(s.config)), // Deep clone
      }));

      onStagesChange(newStages);
      setActiveStageId(newStages.length > 0 ? newStages[0].id : null);
    },
    [allProfiles, onStagesChange]
  );

  // Save current workflow as profile
  const saveAsProfile = useCallback(() => {
    if (!newProfileName.trim() || stages.length === 0) return;

    const newProfile: WorkflowProfile = {
      id: `custom-${Date.now()}`,
      name: newProfileName.trim(),
      nameKo: newProfileName.trim(),
      description: stages.map((s) => STAGE_METADATA[s.type].label).join(" → "),
      stages: stages.map((s) => ({
        type: s.type,
        order: s.order,
        config: JSON.parse(JSON.stringify(s.config)),
      })),
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };

    const updatedProfiles = [...customProfiles, newProfile];
    setCustomProfiles(updatedProfiles);
    saveCustomProfiles(updatedProfiles);
    setShowSaveDialog(false);
    setNewProfileName("");
  }, [newProfileName, stages, customProfiles]);

  // Delete custom profile
  const deleteProfile = useCallback((profileId: string) => {
    const updatedProfiles = customProfiles.filter((p) => p.id !== profileId);
    setCustomProfiles(updatedProfiles);
    saveCustomProfiles(updatedProfiles);
  }, [customProfiles]);

  // Clear all stages
  const clearStages = useCallback(() => {
    onStagesChange([]);
    setActiveStageId(null);
  }, [onStagesChange]);

  // Handle JSON change
  const handleJsonChange = useCallback((code: string) => {
    setJsonCode(code);
    try {
      JSON.parse(code);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON syntax");
    }
  }, []);

  // Apply JSON to stage config
  const applyJsonConfig = useCallback(() => {
    if (!activeStage) return false;
    try {
      const parsed = JSON.parse(jsonCode);
      updateStageConfig(activeStage.id, parsed);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError("Invalid JSON: " + (e as Error).message);
      return false;
    }
  }, [jsonCode, activeStage, updateStageConfig]);

  // Handle edit mode change
  const handleEditModeChange = useCallback(
    (mode: string) => {
      if (mode === "ui" && configEditMode === "json") {
        if (!applyJsonConfig()) return;
      }
      setConfigEditMode(mode as "ui" | "json");
    },
    [configEditMode, applyJsonConfig]
  );

  // Get stage summary for card preview
  const getStageSummary = (stage: WorkflowStage): string => {
    if (stage.type === "predict") {
      const c = stage.config as PredictParams;
      const promptCount = c.prompts?.length || 0;
      const promptInfo = promptCount === 1 ? "1 prompt" : `${promptCount} prompts`;
      // Parse resolution format "height,width" to display
      const [height] = c.resolution.split(",");
      return `${promptInfo} / ${height}p / ${c.num_steps} steps`;
    }
    if (stage.type === "transfer") {
      const c = stage.config as TransferParams;
      const promptCount = c.prompts?.length || 0;
      const promptInfo = c.styles?.length
        ? `${c.styles.length} styles`
        : promptCount === 1
        ? "1 prompt"
        : `${promptCount} prompts`;
      return `${promptInfo} / ${c.resolution}p / ${c.num_steps} steps`;
    }
    if (stage.type === "reason") {
      const c = stage.config as ReasonStageConfig;
      return `Threshold: ${c.threshold} / ${c.filter_mode === "pass_only" ? "Filter" : "Tag"}`;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Profiles Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{t("profiles")}</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={stages.length === 0}
            className="text-xs h-7"
          >
            {t("saveCurrentWorkflow")}
          </Button>
        </div>

        {/* Save Profile Dialog */}
        {showSaveDialog && (
          <div className="mb-3 p-3 rounded-lg border bg-accent/30 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t("profileName")}
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && saveAsProfile()}
              />
              <Button size="sm" onClick={saveAsProfile} disabled={!newProfileName.trim()} className="h-8">
                {t("save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8">
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Built-in Profiles */}
        <div className="flex flex-wrap gap-2 mb-2">
          {DEFAULT_PROFILES.map((profile) => (
            <Button
              key={profile.id}
              variant="outline"
              size="sm"
              onClick={() => applyProfile(profile.id)}
              className="text-xs"
            >
              {profile.nameKo}
            </Button>
          ))}
        </div>

        {/* Custom Profiles */}
        {customProfiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyProfile(profile.id)}
                  className="text-xs"
                >
                  {profile.nameKo}
                </Button>
                <button
                  onClick={() => deleteProfile(profile.id)}
                  className="text-muted-foreground hover:text-destructive text-xs px-1"
                  title={t("delete")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Stages - First */}
      <div>
        <label className="text-sm font-medium mb-2 block">{t("availableStages")}</label>
        <div className="grid grid-cols-3 gap-3">
          {(["predict", "transfer", "reason"] as StageType[]).map((type) => {
            const meta = STAGE_METADATA[type];
            const canAdd = stages.length < 4 && !(stages.length === 0 && type === "reason");
            return (
              <button
                key={type}
                onClick={() => addStage(type)}
                disabled={!canAdd}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  canAdd
                    ? "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                    : "border-border/50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{meta.icon}</span>
                  <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">{meta.description}</div>
                <div className="mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {t("add")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Builder - Below available stages */}
      <div className="border border-border rounded-lg p-4 bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">{t("yourPipeline")}</label>
          <div className="flex items-center gap-2">
            {stages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearStages} className="text-xs h-7">
                {t("clearAll")}
              </Button>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                stages.length === 4
                  ? "bg-warning/10 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stages.length}/4 {t("stages")}
            </span>
          </div>
        </div>

        {/* Pipeline slots container */}
        <div className="min-h-[120px] flex items-center">
          {stages.length === 0 ? (
            <div className="w-full flex items-center justify-center gap-3">
              {[1, 2, 3, 4].map((slot) => (
                <div
                  key={slot}
                  className="w-[140px] h-[90px] border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-muted-foreground/50"
                >
                  <span className="text-xs">{t("stage")} {slot}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-3 pl-3 w-full">
              {stages.map((stage, index) => {
                const meta = STAGE_METADATA[stage.type];
                const isActive = activeStageId === stage.id;
                return (
                  <div key={stage.id} className="flex items-center overflow-visible">
                    {/* Stage Card */}
                    <div
                      onClick={() => setActiveStageId(stage.id)}
                      className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all min-w-[140px] overflow-visible ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      {/* Order number */}
                      <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center z-10">
                        {stage.order}
                      </div>

                      {/* Stage info */}
                      <div className="flex items-center gap-2 mb-1">
                        <span>{meta.icon}</span>
                        <span className={`font-medium text-sm ${meta.color}`}>{meta.label}</span>
                        {stage.type === "reason" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                            {t("filter")}
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="text-xs text-muted-foreground truncate">
                        {getStageSummary(stage)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStage(stage.id, "up");
                          }}
                          disabled={index === 0}
                          className="text-xs px-1.5 py-0.5 rounded hover:bg-secondary disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStage(stage.id, "down");
                          }}
                          disabled={index === stages.length - 1}
                          className="text-xs px-1.5 py-0.5 rounded hover:bg-secondary disabled:opacity-30"
                        >
                          →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStage(stage.id);
                          }}
                          className="text-xs px-1.5 py-0.5 rounded hover:bg-destructive/10 text-destructive ml-auto"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Arrow */}
                    {index < stages.length - 1 && (
                      <div className="px-2 text-muted-foreground">→</div>
                    )}
                  </div>
                );
              })}
              {/* Empty slots for remaining */}
              {stages.length < 4 &&
                Array.from({ length: 4 - stages.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center">
                    {stages.length > 0 && i === 0 && (
                      <div className="px-2 text-muted-foreground/30">→</div>
                    )}
                    <div className="w-[140px] h-[90px] border-2 border-dashed border-border/30 rounded-lg flex items-center justify-center text-muted-foreground/30">
                      <span className="text-xs">+</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Validation error */}
        {!validation.valid && stages.length > 0 && (
          <div className="mt-2 text-sm text-destructive">{validation.error}</div>
        )}

        {/* Pipeline description */}
        {stages.length > 0 && validation.valid && (
          <div className="mt-2 text-xs text-muted-foreground">
            {t("pipeline")}: {stages.map((s) => STAGE_METADATA[s.type].label).join(" → ")}
          </div>
        )}
      </div>

      {/* Stage Configuration Panel */}
      {activeStage && (
        <div className="border-2 border-primary rounded-lg p-4 bg-card shadow-lg shadow-primary/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              {t("configureStage")} {activeStage.order}: {STAGE_METADATA[activeStage.type].label}
            </h3>
            <Tabs value={configEditMode} onValueChange={handleEditModeChange} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="ui" className="text-xs px-3">
                  UI
                </TabsTrigger>
                <TabsTrigger value="json" className="text-xs px-3">
                  JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* UI Mode */}
          {configEditMode === "ui" && (
            <>
              {activeStage.type === "predict" && (
                <PredictConfigUI
                  config={activeStage.config as PredictParams}
                  onChange={(config) => updateStageConfig(activeStage.id, config)}
                />
              )}
              {activeStage.type === "transfer" && (
                <TransferConfigUI
                  config={activeStage.config as TransferParams}
                  onChange={(config) => updateStageConfig(activeStage.id, config)}
                />
              )}
              {activeStage.type === "reason" && (
                <ReasonConfigUI
                  config={activeStage.config as ReasonStageConfig}
                  onChange={(config) => updateStageConfig(activeStage.id, config)}
                />
              )}
            </>
          )}

          {/* JSON Mode */}
          {configEditMode === "json" && (
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  value={jsonCode}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-sm min-h-[300px] bg-zinc-950 text-zinc-100 border-zinc-800"
                  spellCheck={false}
                />
                {jsonError && (
                  <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-400">
                    {jsonError}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultConfig =
                      activeStage.type === "predict"
                        ? DEFAULT_PREDICT_PARAMS
                        : activeStage.type === "transfer"
                        ? DEFAULT_TRANSFER_PARAMS
                        : DEFAULT_REASON_STAGE_CONFIG;
                    setJsonCode(JSON.stringify(defaultConfig, null, 2));
                    setJsonError(null);
                  }}
                >
                  {t("reset")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (applyJsonConfig()) {
                      setConfigEditMode("ui");
                    }
                  }}
                  disabled={!!jsonError}
                >
                  {t("apply")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Predict Config UI ============
interface PredictConfigUIProps {
  config: PredictParams;
  onChange: (config: PredictParams) => void;
}

function PredictConfigUI({ config, onChange }: PredictConfigUIProps) {
  const t = useTranslations("workflow.predict");
  const [newPrompt, setNewPrompt] = useState("");

  // Always use prompts array
  const prompts = config.prompts || [];

  // Add a new prompt to the list
  const addPrompt = () => {
    if (!newPrompt.trim()) return;
    const updated = [...prompts, newPrompt.trim()];
    onChange({ ...config, prompts: updated });
    setNewPrompt("");
  };

  // Remove a prompt from the list
  const removePrompt = (index: number) => {
    if (prompts.length <= 1) return; // Keep at least one prompt
    const updated = prompts.filter((_, i) => i !== index);
    onChange({ ...config, prompts: updated });
  };

  // Update a specific prompt
  const updatePrompt = (index: number, value: string) => {
    const updated = [...prompts];
    updated[index] = value;
    onChange({ ...config, prompts: updated });
  };

  return (
    <div className="space-y-4">
      {/* Prompts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{t("prompts") || "Prompts"} ({prompts.length})</label>
          <span className="text-xs text-muted-foreground">
            {prompts.length === 1
              ? (t("singlePromptHint") || "1 input → 1 output")
              : (t("multiPromptHint", { count: prompts.length }) || `1 input → ${prompts.length} outputs`)}
          </span>
        </div>

        {/* Prompts list */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {prompts.map((prompt, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground mt-2 w-6">
                {index + 1}.
              </span>
              <textarea
                value={prompt}
                onChange={(e) => updatePrompt(index, e.target.value)}
                className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm resize-none min-h-[60px]"
                placeholder={t("promptPlaceholder") || "Describe the video generation..."}
              />
              <button
                onClick={() => removePrompt(index)}
                disabled={prompts.length <= 1}
                className="text-destructive hover:bg-destructive/10 rounded p-1 mt-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("remove") || "Remove"}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add new prompt */}
        <div className="flex gap-2">
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                e.preventDefault();
                addPrompt();
              }
            }}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm resize-none h-16"
            placeholder={t("addPromptPlaceholder") || "Add another prompt... (⌘+Enter to add)"}
          />
          <Button
            onClick={addPrompt}
            disabled={!newPrompt.trim()}
            className="self-end"
          >
            {t("add") || "Add"}
          </Button>
        </div>

        {/* Import from file hint */}
        <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded p-2">
          💡 {t("autoPromptHint") || "Tip: If you select a video/image with a matching .txt file (same name), prompts will be auto-imported. Each line = one prompt."}
        </p>
      </div>

      {/* Basic options - Yetter compatible */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{t("resolution")}</label>
          <Select
            value={config.resolution}
            onValueChange={(v) => onChange({ ...config, resolution: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720,1280">720p (16:9)</SelectItem>
              <SelectItem value="720,960">720p (4:3)</SelectItem>
              <SelectItem value="480,854">480p (16:9)</SelectItem>
              <SelectItem value="480,640">480p (4:3)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">FPS</label>
          <Select
            value={String(config.fps)}
            onValueChange={(v) => onChange({ ...config, fps: Number(v) as 10 | 16 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 FPS</SelectItem>
              <SelectItem value="16">16 FPS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{t("numFrames") || "Frames"}</label>
          <Select
            value={String(config.num_output_frames || 121)}
            onValueChange={(v) => onChange({ ...config, num_output_frames: Number(v) as 121 | 241 | 481 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="121">~{Math.round(121 / config.fps)}s (121)</SelectItem>
              <SelectItem value="241">~{Math.round(241 / config.fps)}s (241)</SelectItem>
              <SelectItem value="481">~{Math.round(481 / config.fps)}s (481)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Steps</label>
          <Select
            value={String(config.num_steps || 35)}
            onValueChange={(v) => onChange({ ...config, num_steps: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 (Fast)</SelectItem>
              <SelectItem value="35">35 (Default)</SelectItem>
              <SelectItem value="50">50 (Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            {t("guidance")}: {config.guidance}
          </label>
          <Slider
            value={[config.guidance]}
            onValueChange={([v]) => onChange({ ...config, guidance: v })}
            min={1}
            max={10}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Seed</label>
          <Input
            type="number"
            value={config.seed}
            onChange={(e) => onChange({ ...config, seed: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Negative Prompt</label>
        <Input
          value={config.negative_prompt || ""}
          onChange={(e) => onChange({ ...config, negative_prompt: e.target.value })}
          placeholder="Elements to avoid..."
        />
      </div>

      {/* Autoregressive Generation Options */}
      <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable_autoregressive"
              checked={config.enable_autoregressive || false}
              onCheckedChange={(checked) =>
                onChange({ ...config, enable_autoregressive: !!checked })
              }
            />
            <label htmlFor="enable_autoregressive" className="text-sm font-medium cursor-pointer">
              {t("enableAutoregressive") || "Enable Autoregressive Generation"}
            </label>
          </div>
          <span className="text-xs text-muted-foreground">
            {t("forLongVideos") || "For long video generation"}
          </span>
        </div>

        {config.enable_autoregressive && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {t("chunkSize") || "Chunk Size"}: {config.chunk_size || 33}
              </label>
              <Slider
                value={[config.chunk_size || 33]}
                onValueChange={([v]) => onChange({ ...config, chunk_size: v })}
                min={17}
                max={65}
                step={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("chunkSizeDesc") || "Frames per generation chunk"}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                {t("chunkOverlap") || "Chunk Overlap"}: {config.chunk_overlap || 9}
              </label>
              <Slider
                value={[config.chunk_overlap || 9]}
                onValueChange={([v]) => onChange({ ...config, chunk_overlap: v })}
                min={1}
                max={17}
                step={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("chunkOverlapDesc") || "Overlap frames between chunks"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Transfer Config UI ============
interface TransferConfigUIProps {
  config: TransferParams;
  onChange: (config: TransferParams) => void;
}

function TransferConfigUI({ config, onChange }: TransferConfigUIProps) {
  // Default control weights if not set
  // Default weights matching Yetter schema
  const defaultWeights = { depth: 0.5, edge: 0.3, seg: 0.5, vis: 0.3 };
  const controlWeights = config.control_weights || defaultWeights;

  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    new Set(config.styles?.map((s) => s.name) || [])
  );
  const [useCustomPrompt, setUseCustomPrompt] = useState(!config.styles?.length);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  // Always use prompts array
  const prompts = config.prompts || [];

  // Sync styles with config and update prompts array
  useEffect(() => {
    if (!useCustomPrompt) {
      const styles = TRANSFER_STYLES.filter((s) => selectedStyles.has(s.name));
      if (styles.length > 0) {
        // Convert selected styles to prompts array
        const stylePrompts = styles.map((s) => s.prompt);
        onChange({ ...config, styles, prompts: stylePrompts });
      }
    }
  }, [selectedStyles, useCustomPrompt]);

  const toggleStyle = (name: string) => {
    const newSelected = new Set(selectedStyles);
    if (newSelected.has(name)) {
      if (newSelected.size > 1) newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedStyles(newSelected);
  };

  // Add custom prompt
  const addPrompt = () => {
    if (!newPrompt.trim()) return;
    const updated = [...prompts, newPrompt.trim()];
    onChange({ ...config, prompts: updated });
    setNewPrompt("");
  };

  // Remove prompt
  const removePrompt = (index: number) => {
    if (prompts.length <= 1) return;
    const updated = prompts.filter((_, i) => i !== index);
    onChange({ ...config, prompts: updated });
  };

  // Update prompt
  const updatePrompt = (index: number, value: string) => {
    const updated = [...prompts];
    updated[index] = value;
    onChange({ ...config, prompts: updated });
  };

  const applyPreset = (presetName: string) => {
    const preset = CONTROL_WEIGHT_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      // Update control weights and derive control_types from non-zero weights
      const control_types = (Object.entries(preset.weights) as [string, number][])
        .filter(([, v]) => v > 0)
        .map(([k]) => k as "depth" | "edge" | "seg" | "vis");
      onChange({ ...config, control_weights: { ...preset.weights }, control_types });
    }
  };

  const totalWeight = Object.values(controlWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Prompt Mode Toggle */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="prompt_mode"
            checked={!useCustomPrompt}
            onChange={() => setUseCustomPrompt(false)}
          />
          <span>Use Style Presets</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="prompt_mode"
            checked={useCustomPrompt}
            onChange={() => {
              setUseCustomPrompt(true);
              // Keep at least one prompt when switching to custom
              if (prompts.length === 0) {
                onChange({ ...config, styles: [], prompts: ["Same scene with enhanced photorealism. Maintain temporal consistency."] });
              } else {
                onChange({ ...config, styles: [] });
              }
            }}
          />
          <span>Custom Prompts</span>
        </label>
      </div>

      {/* Style Presets Mode */}
      {!useCustomPrompt && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Style Presets</label>
            <span className="text-xs text-muted-foreground">
              {selectedStyles.size} selected → {selectedStyles.size} output variants
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
            {TRANSFER_STYLES.map((style) => (
              <label
                key={style.name}
                className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm transition-colors ${
                  selectedStyles.has(style.name)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <Checkbox
                  checked={selectedStyles.has(style.name)}
                  onCheckedChange={() => toggleStyle(style.name)}
                />
                {style.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Custom Prompts Mode */}
      {useCustomPrompt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Custom Prompts ({prompts.length})</label>
            <span className="text-xs text-muted-foreground">
              1 input → {prompts.length} output variants
            </span>
          </div>

          {/* Prompts list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {prompts.map((prompt, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-secondary/50 rounded-lg">
                <span className="text-xs font-mono text-muted-foreground mt-2 w-6">
                  {index + 1}.
                </span>
                <textarea
                  value={prompt}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm resize-none min-h-[60px]"
                  placeholder="Describe the style transformation..."
                />
                <button
                  onClick={() => removePrompt(index)}
                  disabled={prompts.length <= 1}
                  className="text-destructive hover:bg-destructive/10 rounded p-1 mt-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add new prompt */}
          <div className="flex gap-2">
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  addPrompt();
                }
              }}
              className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm resize-none h-16"
              placeholder="Add another style prompt... (⌘+Enter to add)"
            />
            <Button
              onClick={addPrompt}
              disabled={!newPrompt.trim()}
              className="self-end"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Video Settings - Yetter compatible */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Resolution</label>
          <Select
            value={config.resolution || "720"}
            onValueChange={(v) => onChange({ ...config, resolution: v as "720" | "480" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720">720p</SelectItem>
              <SelectItem value="480">480p</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">FPS</label>
          <Select
            value={String(config.fps || 24)}
            onValueChange={(v) => onChange({ ...config, fps: Number(v) as 10 | 16 | 24 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16">16 FPS</SelectItem>
              <SelectItem value="24">24 FPS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Max Frames</label>
          <Select
            value={String(config.max_frames || 121)}
            onValueChange={(v) => onChange({ ...config, max_frames: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="121">121 (~{Math.round(121 / (config.fps || 24))}s)</SelectItem>
              <SelectItem value="241">241 (~{Math.round(241 / (config.fps || 24))}s)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Steps</label>
          <Select
            value={String(config.num_steps || 35)}
            onValueChange={(v) => onChange({ ...config, num_steps: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 (Fast)</SelectItem>
              <SelectItem value="35">35 (Default)</SelectItem>
              <SelectItem value="50">50 (Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Control Weights */}
      <div className="p-4 bg-secondary/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Control Weights</label>
          <div className="flex items-center gap-2">
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Preset..." />
              </SelectTrigger>
              <SelectContent>
                {CONTROL_WEIGHT_PRESETS.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                Math.abs(totalWeight - 1) < 0.01
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              Total: {totalWeight.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {(["depth", "edge", "seg", "vis"] as const).map((key) => {
            // Friendly labels for control types
            const labels: Record<string, string> = {
              depth: "Depth",
              edge: "Edge",
              seg: "Seg",
              vis: "Vis",
            };
            return (
            <div key={key} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">{labels[key]}</div>
              <div className="flex-1">
                <Slider
                  value={[controlWeights[key]]}
                  onValueChange={([v]) => {
                    const newWeights = { ...controlWeights, [key]: v };
                    // Derive control_types from non-zero weights
                    const control_types = (Object.entries(newWeights) as [string, number][])
                      .filter(([, w]) => w > 0)
                      .map(([k]) => k as "depth" | "edge" | "seg" | "vis");
                    onChange({
                      ...config,
                      control_weights: newWeights,
                      control_types,
                    });
                    setSelectedPreset("");
                  }}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
              <div className="w-12 text-right text-sm font-mono">
                {controlWeights[key].toFixed(2)}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Guidance: {config.guidance}
          </label>
          <Slider
            value={[config.guidance]}
            onValueChange={([v]) => onChange({ ...config, guidance: v })}
            min={1}
            max={10}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Seed</label>
          <Input
            type="number"
            value={config.seed}
            onChange={(e) => onChange({ ...config, seed: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Negative Prompt */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Negative Prompt</label>
        <Input
          value={config.negative_prompt || ""}
          onChange={(e) => onChange({ ...config, negative_prompt: e.target.value })}
          placeholder="Elements to avoid..."
        />
      </div>

      {/* Advanced Options - Yetter Schema Compatible */}
      <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
        <h4 className="text-sm font-medium">Advanced Options</h4>

        {/* Context Image for Style Conditioning */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Context Image URL (Style Conditioning)
          </label>
          <Input
            value={config.image_context_url || ""}
            onChange={(e) => onChange({ ...config, image_context_url: e.target.value || undefined })}
            placeholder="Optional: URL to style reference image..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Image used for style conditioning in the transfer process
          </p>
        </div>

        {/* Context Frame Index */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Context Frame Index: {config.context_frame_index ?? 0}
          </label>
          <Slider
            value={[config.context_frame_index ?? 0]}
            onValueChange={([v]) => onChange({ ...config, context_frame_index: v })}
            min={0}
            max={30}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Frame index used for style conditioning context
          </p>
        </div>

        {/* Num Conditional Frames */}
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">
            Conditional Frames: {config.num_conditional_frames ?? 1}
          </label>
          <Slider
            value={[config.num_conditional_frames ?? 1]}
            onValueChange={([v]) => onChange({ ...config, num_conditional_frames: v })}
            min={1}
            max={5}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Number of frames used for conditioning
          </p>
        </div>

        {/* Segmentation Control Prompt - Only show when seg control is enabled */}
        {config.control_types?.includes("seg") && (
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Segmentation Prompt (for SAM2)
            </label>
            <Input
              value={config.seg_control_prompt || ""}
              onChange={(e) => onChange({ ...config, seg_control_prompt: e.target.value || undefined })}
              placeholder="e.g., car . road . building . sky"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Object classes for segmentation, separated by &quot; . &quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Reason Config UI ============
interface ReasonConfigUIProps {
  config: ReasonStageConfig;
  onChange: (config: ReasonStageConfig) => void;
}

function ReasonConfigUI({ config, onChange }: ReasonConfigUIProps) {
  const [selectedCriteria, setSelectedCriteria] = useState<Set<string>>(new Set(config.criteria));

  const toggleCriteria = (id: string) => {
    const newSelected = new Set(selectedCriteria);
    if (newSelected.has(id)) {
      if (newSelected.size > 1) newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCriteria(newSelected);
    onChange({ ...config, criteria: Array.from(newSelected) });
  };

  return (
    <div className="space-y-4">
      {/* Threshold */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Pass Threshold: {config.threshold.toFixed(2)}
        </label>
        <Slider
          value={[config.threshold]}
          onValueChange={([v]) => onChange({ ...config, threshold: v })}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Videos with score below this will be filtered out
        </p>
      </div>

      {/* Filter Mode */}
      <div>
        <label className="text-sm font-medium mb-2 block">Filter Mode</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="filter_mode"
              checked={config.filter_mode === "pass_only"}
              onChange={() => onChange({ ...config, filter_mode: "pass_only" })}
            />
            <span>Pass Only</span>
            <span className="text-xs text-muted-foreground">- Only passed videos proceed</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="filter_mode"
              checked={config.filter_mode === "tag_only"}
              onChange={() => onChange({ ...config, filter_mode: "tag_only" })}
            />
            <span>Tag Only</span>
            <span className="text-xs text-muted-foreground">- All proceed, with pass/fail tags</span>
          </label>
        </div>
      </div>

      {/* Criteria */}
      <div>
        <label className="text-sm font-medium mb-2 block">Validation Criteria</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {REASON_CRITERIA.map((c) => (
            <label
              key={c.id}
              className={`flex items-start gap-2 p-2 rounded border cursor-pointer text-sm ${
                selectedCriteria.has(c.id) ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Checkbox
                checked={selectedCriteria.has(c.id)}
                onCheckedChange={() => toggleCriteria(c.id)}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Model</label>
          <Select
            value={config.model_size}
            onValueChange={(v) => onChange({ ...config, model_size: v as "2B" | "8B" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2B">2B (Fast)</SelectItem>
              <SelectItem value="8B">8B (Accurate)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Video FPS</label>
          <Input
            type="number"
            value={config.video_fps}
            onChange={(e) => onChange({ ...config, video_fps: Number(e.target.value) })}
            min={1}
            max={8}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Max Tokens</label>
          <Input
            type="number"
            value={config.max_tokens}
            onChange={(e) => onChange({ ...config, max_tokens: Number(e.target.value) })}
            min={1024}
            max={8192}
            step={512}
          />
        </div>
      </div>
    </div>
  );
}
