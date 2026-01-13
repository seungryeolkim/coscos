"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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

  // Sync JSON with active stage config
  useEffect(() => {
    if (activeStage && configEditMode === "ui") {
      setJsonCode(JSON.stringify(activeStage.config, null, 2));
      setJsonError(null);
    }
  }, [activeStage, configEditMode]);

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
      return `${c.resolution} / ${c.fps} FPS / ${c.model_size}`;
    }
    if (stage.type === "transfer") {
      const c = stage.config as TransferParams;
      return `${c.styles?.length || 0} styles / ${c.num_steps} steps`;
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
          <label className="text-sm font-medium">Profiles (프로필)</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            disabled={stages.length === 0}
            className="text-xs h-7"
          >
            + 현재 워크플로우 저장
          </Button>
        </div>

        {/* Save Profile Dialog */}
        {showSaveDialog && (
          <div className="mb-3 p-3 rounded-lg border bg-accent/30 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="프로필 이름..."
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="flex-1 h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && saveAsProfile()}
              />
              <Button size="sm" onClick={saveAsProfile} disabled={!newProfileName.trim()} className="h-8">
                저장
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8">
                취소
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
                  title="삭제"
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
        <label className="text-sm font-medium mb-2 block">Available Stages</label>
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
                    + Add
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
          <label className="text-sm font-medium">Your Pipeline</label>
          <div className="flex items-center gap-2">
            {stages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearStages} className="text-xs h-7">
                Clear All
              </Button>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                stages.length === 4
                  ? "bg-warning/10 text-warning"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stages.length}/4 stages
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
                  <span className="text-xs">Stage {slot}</span>
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
                            Filter
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
            Pipeline: {stages.map((s) => STAGE_METADATA[s.type].label).join(" → ")}
          </div>
        )}
      </div>

      {/* Stage Configuration Panel */}
      {activeStage && (
        <div className="border-2 border-primary rounded-lg p-4 bg-card shadow-lg shadow-primary/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              Configure Stage {activeStage.order}: {STAGE_METADATA[activeStage.type].label}
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
                  Reset
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
                  Apply
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
  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div>
        <label className="text-sm font-medium mb-1 block">Prompt</label>
        <textarea
          value={config.prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-md text-sm resize-none"
          placeholder="Describe the video continuation..."
        />
      </div>

      {/* Basic options */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Resolution</label>
          <Select
            value={config.resolution}
            onValueChange={(v) => onChange({ ...config, resolution: v as "480p" | "720p" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="480p">480p</SelectItem>
              <SelectItem value="720p">720p</SelectItem>
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
          <label className="text-sm text-muted-foreground mb-1 block">Aspect</label>
          <Select
            value={config.aspect_ratio}
            onValueChange={(v) => onChange({ ...config, aspect_ratio: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="9:16">9:16</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Model</label>
          <Select
            value={config.model_size}
            onValueChange={(v) => onChange({ ...config, model_size: v as "2B" | "14B" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2B">2B (Fast)</SelectItem>
              <SelectItem value="14B">14B (Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Guidance: {config.guidance_scale}
          </label>
          <Slider
            value={[config.guidance_scale]}
            onValueChange={([v]) => onChange({ ...config, guidance_scale: v })}
            min={1}
            max={15}
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
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Cond. Frames</label>
          <Select
            value={String(config.num_conditioning_frames)}
            onValueChange={(v) =>
              onChange({ ...config, num_conditioning_frames: Number(v) as 1 | 5 })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Frame</SelectItem>
              <SelectItem value="5">5 Frames</SelectItem>
            </SelectContent>
          </Select>
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

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={config.disable_prompt_refiner}
          onCheckedChange={(c) => onChange({ ...config, disable_prompt_refiner: !!c })}
        />
        Disable Prompt Refiner
      </label>
    </div>
  );
}

// ============ Transfer Config UI ============
interface TransferConfigUIProps {
  config: TransferParams;
  onChange: (config: TransferParams) => void;
}

function TransferConfigUI({ config, onChange }: TransferConfigUIProps) {
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    new Set(config.styles?.map((s) => s.name) || [])
  );
  const [useCustomPrompt, setUseCustomPrompt] = useState(!!config.custom_prompt);
  const [selectedPreset, setSelectedPreset] = useState("");

  // Sync styles with config
  useEffect(() => {
    if (!useCustomPrompt) {
      const styles = TRANSFER_STYLES.filter((s) => selectedStyles.has(s.name));
      if (styles.length > 0) {
        onChange({ ...config, styles });
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

  const applyPreset = (presetName: string) => {
    const preset = CONTROL_WEIGHT_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      onChange({ ...config, control_weights: { ...preset.weights } });
    }
  };

  const totalWeight = Object.values(config.control_weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Style Presets */}
      <div>
        <label className="text-sm font-medium mb-2 block">Style Presets</label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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
                disabled={useCustomPrompt}
              />
              {style.name}
            </label>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={useCustomPrompt} onCheckedChange={(c) => setUseCustomPrompt(!!c)} />
        Use Custom Prompt
      </label>

      {useCustomPrompt && (
        <textarea
          value={config.custom_prompt || ""}
          onChange={(e) => onChange({ ...config, custom_prompt: e.target.value })}
          className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-md text-sm resize-none"
          placeholder="Same scene during heavy snowfall..."
        />
      )}

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
          {(["depth", "edge", "seg", "vis"] as const).map((key) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium capitalize">{key}</div>
              <div className="flex-1">
                <Slider
                  value={[config.control_weights[key]]}
                  onValueChange={([v]) => {
                    onChange({
                      ...config,
                      control_weights: { ...config.control_weights, [key]: v },
                    });
                    setSelectedPreset("");
                  }}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
              <div className="w-12 text-right text-sm font-mono">
                {config.control_weights[key].toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Guidance: {config.guidance_scale}
          </label>
          <Slider
            value={[config.guidance_scale]}
            onValueChange={([v]) => onChange({ ...config, guidance_scale: v })}
            min={1}
            max={15}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Steps: {config.num_steps}
          </label>
          <Slider
            value={[config.num_steps]}
            onValueChange={([v]) => onChange({ ...config, num_steps: v })}
            min={10}
            max={50}
            step={5}
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
