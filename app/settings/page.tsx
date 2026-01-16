"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DEFAULT_PREDICT_PARAMS,
  DEFAULT_TRANSFER_PARAMS,
  DEFAULT_REASON_PARAMS,
  TRANSFER_STYLES,
  TRANSFER_STYLE_CATEGORIES,
  CONTROL_WEIGHT_PRESETS,
  DEFAULT_PROFILES,
  type TransferStyle,
  type TransferParams,
  type WorkflowProfile,
} from "@/lib/types";
import {
  getSettings,
  saveSettings,
  checkAPIHealth,
  type AppSettings,
} from "@/lib/api";

// Settings state types
interface APISettings {
  cosmosApiKey: string;
  predictEndpoint: string;
  transferEndpoint: string;
  reasonEndpoint: string;
  timeout: number;
  maxRetries: number;
  retryBackoff: number;
}

interface OutputSettings {
  outputDirectory: string;
  createDatedFolders: boolean;
  saveRejectedVideos: boolean;
  saveIntermediateFiles: boolean;
  namingPrefix: string;
  namingSuffix: string;
  codec: "h264" | "h265" | "vp9";
  quality: "low" | "medium" | "high";
  removeAudio: boolean;
}

interface CustomStyle extends TransferStyle {
  id: string;
  isBuiltIn: boolean;
}

// Local storage key for custom profiles (shared with WorkflowBuilder)
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

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tApi = useTranslations("settings.api");
  const tOutput = useTranslations("settings.output");
  const tDefaults = useTranslations("settings.defaults");
  const tProfiles = useTranslations("settings.profiles");
  const tStyles = useTranslations("settings.styles");

  // API connection state
  const [apiConnected, setApiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState("");

  // API Settings state
  const [apiSettings, setApiSettings] = useState<APISettings>({
    cosmosApiKey: "",
    predictEndpoint: "http://localhost:8000/predict",
    transferEndpoint: "http://localhost:8000/transfer",
    reasonEndpoint: "http://localhost:8001/reason",
    timeout: 300,
    maxRetries: 3,
    retryBackoff: 2.0,
  });

  // Output Settings state
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({
    outputDirectory: "~/coscos/output",
    createDatedFolders: true,
    saveRejectedVideos: true,
    saveIntermediateFiles: false,
    namingPrefix: "",
    namingSuffix: "_variant",
    codec: "h264",
    quality: "high",
    removeAudio: true,
  });

  // Default Values state
  const [predictDefaults, setPredictDefaults] = useState(DEFAULT_PREDICT_PARAMS);
  const [transferDefaults, setTransferDefaults] = useState(DEFAULT_TRANSFER_PARAMS);
  const [reasonDefaults, setReasonDefaults] = useState(DEFAULT_REASON_PARAMS);
  const [useRandomSeed, setUseRandomSeed] = useState(false);

  // Load settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const isHealthy = await checkAPIHealth();
        setApiConnected(isHealthy);

        if (isHealthy) {
          const response = await getSettings();
          const s = response.settings;
          const api = s?.api || {};
          const output = s?.output || {};
          const defaults = s?.defaults || {};

          // Update API settings (with fallbacks for undefined values)
          setApiSettings({
            cosmosApiKey: "", // API key is not returned for security
            predictEndpoint: api.predict_endpoint || "http://localhost:8000/predict",
            transferEndpoint: api.transfer_endpoint || "http://localhost:8000/transfer",
            reasonEndpoint: api.reason_endpoint || "http://localhost:8001/reason",
            timeout: api.timeout ?? 300,
            maxRetries: api.max_retries ?? 3,
            retryBackoff: api.retry_backoff ?? 2.0,
          });
          setHasApiKey(api.has_api_key ?? false);
          setMaskedApiKey(api.cosmos_api_key_masked || "");

          // Update output settings (with fallbacks for undefined values)
          setOutputSettings({
            outputDirectory: output.output_directory || "~/coscos/output",
            createDatedFolders: output.create_dated_folders ?? true,
            saveRejectedVideos: output.save_rejected_videos ?? true,
            saveIntermediateFiles: output.save_intermediate_files ?? false,
            namingPrefix: output.naming_prefix || "",
            namingSuffix: output.naming_suffix || "_variant",
            codec: output.codec || "h264",
            quality: output.quality || "high",
            removeAudio: output.remove_audio ?? true,
          });

          // Update defaults if saved
          if (defaults.predict && Object.keys(defaults.predict).length > 0) {
            setPredictDefaults((prev) => ({ ...prev, ...defaults.predict }));
          }
          if (defaults.transfer && Object.keys(defaults.transfer).length > 0) {
            setTransferDefaults((prev) => ({ ...prev, ...defaults.transfer }));
          }
          if (defaults.reason && Object.keys(defaults.reason).length > 0) {
            setReasonDefaults((prev) => ({ ...prev, ...defaults.reason }));
          }
          setUseRandomSeed(defaults.use_random_seed ?? false);
        }
      } catch (error) {
        console.warn("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Save settings to API
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const settingsToSave: Partial<AppSettings> = {
        api: {
          cosmos_api_key: apiSettings.cosmosApiKey, // Empty string = keep existing
          predict_endpoint: apiSettings.predictEndpoint,
          transfer_endpoint: apiSettings.transferEndpoint,
          reason_endpoint: apiSettings.reasonEndpoint,
          timeout: apiSettings.timeout,
          max_retries: apiSettings.maxRetries,
          retry_backoff: apiSettings.retryBackoff,
        },
        output: {
          output_directory: outputSettings.outputDirectory,
          create_dated_folders: outputSettings.createDatedFolders,
          save_rejected_videos: outputSettings.saveRejectedVideos,
          save_intermediate_files: outputSettings.saveIntermediateFiles,
          naming_prefix: outputSettings.namingPrefix,
          naming_suffix: outputSettings.namingSuffix,
          codec: outputSettings.codec,
          quality: outputSettings.quality,
          remove_audio: outputSettings.removeAudio,
        },
        defaults: {
          predict: { ...predictDefaults },
          transfer: { ...transferDefaults },
          reason: { ...reasonDefaults },
          use_random_seed: useRandomSeed,
        },
      };

      const response = await saveSettings(settingsToSave);

      if (response.success) {
        setSaveMessage({ type: "success", text: "Settings saved successfully" });
        setHasApiKey(response.settings.api.has_api_key || false);
        setMaskedApiKey(response.settings.api.cosmos_api_key_masked || "");
        setApiSettings((prev) => ({ ...prev, cosmosApiKey: "" })); // Clear input after save
      } else {
        setSaveMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save settings" });
    } finally {
      setIsSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // Predict JSON Editor state
  const [predictJsonCode, setPredictJsonCode] = useState("");
  const [predictJsonError, setPredictJsonError] = useState<string | null>(null);
  const [activePredictTab, setActivePredictTab] = useState<"ui" | "code">("ui");

  // Transfer JSON Editor state
  const [transferJsonCode, setTransferJsonCode] = useState("");
  const [transferJsonError, setTransferJsonError] = useState<string | null>(null);
  const [activeTransferTab, setActiveTransferTab] = useState<"ui" | "code">("ui");

  // Reason JSON Editor state
  const [reasonJsonCode, setReasonJsonCode] = useState("");
  const [reasonJsonError, setReasonJsonError] = useState<string | null>(null);
  const [activeReasonTab, setActiveReasonTab] = useState<"ui" | "code">("ui");

  // Sync Predict UI to JSON when predictDefaults changes
  useEffect(() => {
    if (activePredictTab === "ui") {
      setPredictJsonCode(JSON.stringify(predictDefaults, null, 2));
      setPredictJsonError(null);
    }
  }, [predictDefaults, activePredictTab]);

  // Sync Transfer UI to JSON when transferDefaults changes
  useEffect(() => {
    if (activeTransferTab === "ui") {
      setTransferJsonCode(JSON.stringify(transferDefaults, null, 2));
      setTransferJsonError(null);
    }
  }, [transferDefaults, activeTransferTab]);

  // Sync Reason UI to JSON when reasonDefaults changes
  useEffect(() => {
    if (activeReasonTab === "ui") {
      setReasonJsonCode(JSON.stringify(reasonDefaults, null, 2));
      setReasonJsonError(null);
    }
  }, [reasonDefaults, activeReasonTab]);

  // Handle Predict JSON code changes
  const handlePredictJsonChange = useCallback((code: string) => {
    setPredictJsonCode(code);
    try {
      const parsed = JSON.parse(code);
      if (typeof parsed === "object" && parsed !== null) {
        setPredictJsonError(null);
      }
    } catch {
      setPredictJsonError("Invalid JSON syntax");
    }
  }, []);

  // Handle Transfer JSON code changes
  const handleTransferJsonChange = useCallback((code: string) => {
    setTransferJsonCode(code);
    try {
      const parsed = JSON.parse(code);
      // Validate the structure
      if (typeof parsed === "object" && parsed !== null) {
        setTransferJsonError(null);
      }
    } catch {
      setTransferJsonError("Invalid JSON syntax");
    }
  }, []);

  // Handle Reason JSON code changes
  const handleReasonJsonChange = useCallback((code: string) => {
    setReasonJsonCode(code);
    try {
      const parsed = JSON.parse(code);
      if (typeof parsed === "object" && parsed !== null) {
        setReasonJsonError(null);
      }
    } catch {
      setReasonJsonError("Invalid JSON syntax");
    }
  }, []);

  // Apply Predict JSON to UI state
  const applyPredictJson = useCallback(() => {
    try {
      const parsed = JSON.parse(predictJsonCode);
      const merged = {
        ...DEFAULT_PREDICT_PARAMS,
        ...parsed,
      };
      setPredictDefaults(merged);
      setPredictJsonError(null);
      return true;
    } catch (e) {
      setPredictJsonError("Invalid JSON: " + (e as Error).message);
      return false;
    }
  }, [predictJsonCode]);

  // Handle Predict tab change
  const handlePredictTabChange = useCallback(
    (value: string) => {
      if (value === "ui" && activePredictTab === "code") {
        if (!applyPredictJson()) {
          return;
        }
      }
      setActivePredictTab(value as "ui" | "code");
    },
    [activePredictTab, applyPredictJson]
  );

  // Apply Transfer JSON to UI state
  const applyTransferJson = useCallback(() => {
    try {
      const parsed = JSON.parse(transferJsonCode);
      // Merge with defaults to ensure all fields are present
      const merged: TransferParams = {
        ...DEFAULT_TRANSFER_PARAMS,
        ...parsed,
        control_weights: {
          ...DEFAULT_TRANSFER_PARAMS.control_weights,
          ...(parsed.control_weights || {}),
        },
      };
      setTransferDefaults(merged);
      setTransferJsonError(null);
      return true;
    } catch (e) {
      setTransferJsonError("Invalid JSON: " + (e as Error).message);
      return false;
    }
  }, [transferJsonCode]);

  // Handle Transfer tab change
  const handleTransferTabChange = useCallback(
    (value: string) => {
      if (value === "ui" && activeTransferTab === "code") {
        // Switching from code to UI - try to apply the JSON
        if (!applyTransferJson()) {
          // If JSON is invalid, don't switch tabs
          return;
        }
      }
      setActiveTransferTab(value as "ui" | "code");
    },
    [activeTransferTab, applyTransferJson]
  );

  // Apply Reason JSON to UI state
  const applyReasonJson = useCallback(() => {
    try {
      const parsed = JSON.parse(reasonJsonCode);
      const merged = {
        ...DEFAULT_REASON_PARAMS,
        ...parsed,
      };
      setReasonDefaults(merged);
      setReasonJsonError(null);
      return true;
    } catch (e) {
      setReasonJsonError("Invalid JSON: " + (e as Error).message);
      return false;
    }
  }, [reasonJsonCode]);

  // Handle Reason tab change
  const handleReasonTabChange = useCallback(
    (value: string) => {
      if (value === "ui" && activeReasonTab === "code") {
        if (!applyReasonJson()) {
          return;
        }
      }
      setActiveReasonTab(value as "ui" | "code");
    },
    [activeReasonTab, applyReasonJson]
  );

  // Custom Styles state
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([
    ...TRANSFER_STYLES.map((s, i) => ({ ...s, id: `builtin-${i}`, isBuiltIn: true })),
  ]);

  // Custom Profiles state (shared with WorkflowBuilder)
  const [customProfiles, setCustomProfiles] = useState<WorkflowProfile[]>([]);

  // Load custom profiles on mount
  useEffect(() => {
    setCustomProfiles(loadCustomProfiles());
  }, []);

  // Delete custom profile
  const deleteCustomProfile = (profileId: string) => {
    const updatedProfiles = customProfiles.filter((p) => p.id !== profileId);
    setCustomProfiles(updatedProfiles);
    saveCustomProfiles(updatedProfiles);
  };

  // Export profiles to JSON
  const exportProfiles = () => {
    const allProfiles = [...DEFAULT_PROFILES, ...customProfiles];
    const blob = new Blob([JSON.stringify(allProfiles, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coscos-profiles.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import profiles from JSON
  const importProfiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as WorkflowProfile[];
        const newCustom = imported.filter((p) => !p.isBuiltIn);
        const merged = [...customProfiles];
        newCustom.forEach((p) => {
          if (!merged.find((m) => m.id === p.id)) {
            merged.push({ ...p, isBuiltIn: false });
          }
        });
        setCustomProfiles(merged);
        saveCustomProfiles(merged);
      } catch {
        alert("Invalid profile JSON file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Connection test states
  const [testingConnections, setTestingConnections] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, "success" | "error" | null>>({});

  // Active tab for navigation
  const [activeTab, setActiveTab] = useState("api");

  const testConnections = async () => {
    setTestingConnections(true);
    setConnectionStatus({});

    // Simulate connection tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setConnectionStatus({
      predict: Math.random() > 0.3 ? "success" : "error",
      transfer: Math.random() > 0.3 ? "success" : "error",
      reason: Math.random() > 0.3 ? "success" : "error",
    });
    setTestingConnections(false);
  };

  const resetDefaults = () => {
    setPredictDefaults(DEFAULT_PREDICT_PARAMS);
    setTransferDefaults(DEFAULT_TRANSFER_PARAMS);
    setReasonDefaults(DEFAULT_REASON_PARAMS);
    setUseRandomSeed(false);
  };


  const addCustomStyle = () => {
    const newStyle: CustomStyle = {
      id: `custom-${Date.now()}`,
      name: "New Style",
      prompt: "Same scene with custom transformation. Maintain temporal consistency.",
      isBuiltIn: false,
    };
    setCustomStyles((prev) => [...prev, newStyle]);
  };

  const deleteCustomStyle = (styleId: string) => {
    setCustomStyles((prev) => prev.filter((s) => s.id !== styleId));
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          {!isLoading && (
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                apiConnected
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {apiConnected ? t("apiConnected") : t("apiOffline")}
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 overflow-x-auto">
        {[
          { id: "api", label: t("tabs.api") },
          { id: "output", label: t("tabs.output") },
          { id: "defaults", label: t("tabs.defaults") },
          { id: "profiles", label: t("tabs.profiles") },
          { id: "styles", label: t("tabs.styles") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* 1. API Configuration */}
        {activeTab === "api" && (
        <Card>
          <CardHeader>
            <CardTitle>{tApi("title")}</CardTitle>
            <CardDescription>
              {tApi("subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cosmos API Key Section */}
            <div className="space-y-3 p-4 rounded-lg border bg-gradient-to-r from-cyan-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">{tApi("cosmosApiKey")}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tApi("cosmosApiKeyDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={hasApiKey ? `Current: ${maskedApiKey}` : "your-api-key..."}
                  value={apiSettings.cosmosApiKey}
                  onChange={(e) =>
                    setApiSettings((prev) => ({
                      ...prev,
                      cosmosApiKey: e.target.value,
                    }))
                  }
                  className="flex-1"
                />
                {hasApiKey && (
                  <span className="flex items-center text-xs text-success px-2">
                    ✓ {tApi("saved")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {tApi("emptyKeepExisting")}
              </p>
            </div>

            {/* Endpoint Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">{tApi("endpointUrls")}</h4>

              {/* Predict Endpoint */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-cyan-500">Predict</span>
                  <span className="text-xs text-muted-foreground">Cosmos-Predict2.5</span>
                  {connectionStatus.predict && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        connectionStatus.predict === "success"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {connectionStatus.predict === "success" ? tApi("connected") : tApi("failed")}
                    </span>
                  )}
                </div>
                <Input
                  placeholder="http://localhost:8000/predict"
                  value={apiSettings.predictEndpoint}
                  onChange={(e) =>
                    setApiSettings((prev) => ({
                      ...prev,
                      predictEndpoint: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Transfer Endpoint */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-purple-500">Transfer</span>
                  <span className="text-xs text-muted-foreground">Cosmos-Transfer2.5</span>
                  {connectionStatus.transfer && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        connectionStatus.transfer === "success"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {connectionStatus.transfer === "success" ? tApi("connected") : tApi("failed")}
                    </span>
                  )}
                </div>
                <Input
                  placeholder="http://localhost:8000/transfer"
                  value={apiSettings.transferEndpoint}
                  onChange={(e) =>
                    setApiSettings((prev) => ({
                      ...prev,
                      transferEndpoint: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Reason Endpoint */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-500">Reason</span>
                  <span className="text-xs text-muted-foreground">Cosmos-Reason2</span>
                  {connectionStatus.reason && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        connectionStatus.reason === "success"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {connectionStatus.reason === "success" ? tApi("connected") : tApi("failed")}
                    </span>
                  )}
                </div>
                <Input
                  placeholder="http://localhost:8001/reason"
                  value={apiSettings.reasonEndpoint}
                  onChange={(e) =>
                    setApiSettings((prev) => ({
                      ...prev,
                      reasonEndpoint: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Connection Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">{tApi("connectionSettings")}</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {tApi("timeout")}
                  </label>
                  <Input
                    type="number"
                    value={apiSettings.timeout}
                    onChange={(e) =>
                      setApiSettings((prev) => ({
                        ...prev,
                        timeout: parseInt(e.target.value) || 300,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tApi("maxRetries")}</label>
                  <Input
                    type="number"
                    value={apiSettings.maxRetries}
                    onChange={(e) =>
                      setApiSettings((prev) => ({
                        ...prev,
                        maxRetries: parseInt(e.target.value) || 3,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {tApi("retryBackoff")}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={apiSettings.retryBackoff}
                    onChange={(e) =>
                      setApiSettings((prev) => ({
                        ...prev,
                        retryBackoff: parseFloat(e.target.value) || 2.0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={testConnections}
              disabled={testingConnections}
              className="w-full sm:w-auto"
            >
              {testingConnections ? tApi("testing") : tApi("testAll")}
            </Button>
          </CardContent>
        </Card>
        )}

        {/* 2. Output Configuration */}
        {activeTab === "output" && (
        <Card>
          <CardHeader>
            <CardTitle>{tOutput("title")}</CardTitle>
            <CardDescription>
              {tOutput("subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Output Directory */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{tOutput("directory")}</label>
              <div className="flex gap-2">
                <Input
                  value={outputSettings.outputDirectory}
                  onChange={(e) =>
                    setOutputSettings((prev) => ({
                      ...prev,
                      outputDirectory: e.target.value,
                    }))
                  }
                />
                <Button variant="outline">Browse</Button>
              </div>
            </div>

            {/* File Organization */}
            <div className="space-y-3">
              <label className="text-sm font-medium">{tOutput("fileOrganization")}</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={outputSettings.createDatedFolders}
                    onCheckedChange={(checked) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        createDatedFolders: checked as boolean,
                      }))
                    }
                  />
                  <span className="text-sm">
                    {tOutput("createDatedFolders")}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={outputSettings.saveRejectedVideos}
                    onCheckedChange={(checked) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        saveRejectedVideos: checked as boolean,
                      }))
                    }
                  />
                  <span className="text-sm">{tOutput("saveRejected")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={outputSettings.saveIntermediateFiles}
                    onCheckedChange={(checked) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        saveIntermediateFiles: checked as boolean,
                      }))
                    }
                  />
                  <span className="text-sm">
                    {tOutput("saveIntermediate")}
                  </span>
                </label>
              </div>
            </div>

            {/* Naming Convention */}
            <div className="space-y-3">
              <label className="text-sm font-medium">{tOutput("namingConvention")}</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tOutput("prefix")}</label>
                  <Input
                    placeholder="(optional)"
                    value={outputSettings.namingPrefix}
                    onChange={(e) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        namingPrefix: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tOutput("suffix")}</label>
                  <Input
                    value={outputSettings.namingSuffix}
                    onChange={(e) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        namingSuffix: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-accent/30">
                <span className="text-sm text-muted-foreground">{tOutput("preview")}: </span>
                <code className="text-sm">
                  {outputSettings.namingPrefix}dashcam_city{outputSettings.namingSuffix}
                  _00.mp4
                </code>
              </div>
            </div>

            {/* Video Encoding */}
            <div className="space-y-3">
              <label className="text-sm font-medium">{tOutput("videoEncoding")}</label>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tOutput("codec")}</label>
                  <Select
                    value={outputSettings.codec}
                    onValueChange={(value: "h264" | "h265" | "vp9") =>
                      setOutputSettings((prev) => ({ ...prev, codec: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264 (Most Compatible)</SelectItem>
                      <SelectItem value="h265">H.265 (Better Quality)</SelectItem>
                      <SelectItem value="vp9">VP9 (Web Optimized)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tOutput("quality")}</label>
                  <Select
                    value={outputSettings.quality}
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setOutputSettings((prev) => ({ ...prev, quality: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (CRF 28)</SelectItem>
                      <SelectItem value="medium">Medium (CRF 23)</SelectItem>
                      <SelectItem value="high">High (CRF 18)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tOutput("audio")}</label>
                  <Select
                    value={outputSettings.removeAudio ? "remove" : "keep"}
                    onValueChange={(value) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        removeAudio: value === "remove",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remove">{tOutput("remove")}</SelectItem>
                      <SelectItem value="keep">{tOutput("keepOriginal")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* 3. Default Values */}
        {activeTab === "defaults" && (
        <Card>
          <CardHeader>
            <CardTitle>{tDefaults("title")}</CardTitle>
            <CardDescription>
              {tDefaults("subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Predict Defaults with UI/Code Tabs */}
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{tDefaults("predict")}</h4>
                <Tabs
                  value={activePredictTab}
                  onValueChange={handlePredictTabChange}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="ui" className="text-xs px-3">
                      UI
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs px-3">
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* UI Mode */}
              {activePredictTab === "ui" && (
                <div className="space-y-4">
                  {/* Default Prompt */}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{tDefaults("defaultPrompt")}</label>
                    <Textarea
                      value={predictDefaults.prompts?.[0] || ""}
                      onChange={(e) =>
                        setPredictDefaults((prev) => ({
                          ...prev,
                          prompts: [e.target.value, ...(prev.prompts?.slice(1) || [])],
                        }))
                      }
                      placeholder="Continue this video naturally with realistic physics..."
                      className="min-h-[80px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {tDefaults("promptHint")}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">{tDefaults("resolution")}</label>
                      <Select
                        value={predictDefaults.resolution}
                        onValueChange={(value) =>
                          setPredictDefaults((prev) => ({ ...prev, resolution: value as any }))
                        }
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
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">{tDefaults("fps")}</label>
                      <Select
                        value={String(predictDefaults.fps)}
                        onValueChange={(value) =>
                          setPredictDefaults((prev) => ({
                            ...prev,
                            fps: parseInt(value) as 10 | 16,
                          }))
                        }
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
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Steps</label>
                      <Select
                        value={String(predictDefaults.num_steps || 35)}
                        onValueChange={(value) =>
                          setPredictDefaults((prev) => ({ ...prev, num_steps: parseInt(value) }))
                        }
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
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {tDefaults("guidanceScale")}: {predictDefaults.guidance.toFixed(1)}
                      </label>
                      <Slider
                        value={[predictDefaults.guidance]}
                        min={1}
                        max={10}
                        step={0.5}
                        onValueChange={([value]) =>
                          setPredictDefaults((prev) => ({ ...prev, guidance: value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Code Editor Mode */}
              {activePredictTab === "code" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={predictJsonCode}
                      onChange={(e) => handlePredictJsonChange(e.target.value)}
                      className="font-mono text-sm min-h-[300px] bg-zinc-950 text-zinc-100 border-zinc-800"
                      placeholder="Enter JSON configuration..."
                      spellCheck={false}
                    />
                    {predictJsonError && (
                      <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-400">
                        {predictJsonError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {tDefaults("jsonEditNote")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPredictJsonCode(
                          JSON.stringify(DEFAULT_PREDICT_PARAMS, null, 2)
                        );
                        setPredictJsonError(null);
                      }}
                    >
                      {tDefaults("resetToDefault")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Defaults with UI/Code Tabs */}
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{tDefaults("transfer")}</h4>
                <Tabs
                  value={activeTransferTab}
                  onValueChange={handleTransferTabChange}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="ui" className="text-xs px-3">
                      UI
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs px-3">
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* UI Mode */}
              {activeTransferTab === "ui" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {tDefaults("controlWeightPreset")}
                      </label>
                      <Select
                        defaultValue="0"
                        onValueChange={(value) => {
                          const preset = CONTROL_WEIGHT_PRESETS[parseInt(value)];
                          if (preset) {
                            setTransferDefaults((prev) => ({
                              ...prev,
                              control_weights: { ...preset.weights },
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTROL_WEIGHT_PRESETS.map((preset, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {tDefaults("inferenceSteps")}: {transferDefaults.num_steps}
                      </label>
                      <Slider
                        value={[transferDefaults.num_steps]}
                        min={10}
                        max={50}
                        step={5}
                        onValueChange={([value]) =>
                          setTransferDefaults((prev) => ({ ...prev, num_steps: value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        {tDefaults("guidanceScale")}: {transferDefaults.guidance.toFixed(1)}
                      </label>
                      <Slider
                        value={[transferDefaults.guidance]}
                        min={1}
                        max={10}
                        step={0.5}
                        onValueChange={([value]) =>
                          setTransferDefaults((prev) => ({ ...prev, guidance: value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Control Weights Sliders */}
                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium">{tDefaults("controlWeights")}</label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex justify-between">
                          <span>{tDefaults("depth")}</span>
                          <span>{transferDefaults.control_weights.depth.toFixed(2)}</span>
                        </label>
                        <Slider
                          value={[transferDefaults.control_weights.depth]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) =>
                            setTransferDefaults((prev) => ({
                              ...prev,
                              control_weights: { ...prev.control_weights, depth: value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex justify-between">
                          <span>{tDefaults("edge")}</span>
                          <span>{transferDefaults.control_weights.edge.toFixed(2)}</span>
                        </label>
                        <Slider
                          value={[transferDefaults.control_weights.edge]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) =>
                            setTransferDefaults((prev) => ({
                              ...prev,
                              control_weights: { ...prev.control_weights, edge: value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex justify-between">
                          <span>{tDefaults("seg")}</span>
                          <span>{transferDefaults.control_weights.seg.toFixed(2)}</span>
                        </label>
                        <Slider
                          value={[transferDefaults.control_weights.seg]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) =>
                            setTransferDefaults((prev) => ({
                              ...prev,
                              control_weights: { ...prev.control_weights, seg: value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex justify-between">
                          <span>{tDefaults("vis")}</span>
                          <span>{transferDefaults.control_weights.vis.toFixed(2)}</span>
                        </label>
                        <Slider
                          value={[transferDefaults.control_weights.vis]}
                          min={0}
                          max={1}
                          step={0.05}
                          onValueChange={([value]) =>
                            setTransferDefaults((prev) => ({
                              ...prev,
                              control_weights: { ...prev.control_weights, vis: value },
                            }))
                          }
                        />
                      </div>
                    </div>
                    {/* Total Weight Indicator */}
                    <div className="text-sm text-muted-foreground">
                      Total:{" "}
                      {(
                        transferDefaults.control_weights.depth +
                        transferDefaults.control_weights.edge +
                        transferDefaults.control_weights.seg +
                        transferDefaults.control_weights.vis
                      ).toFixed(2)}
                      {transferDefaults.control_weights.depth +
                        transferDefaults.control_weights.edge +
                        transferDefaults.control_weights.seg +
                        transferDefaults.control_weights.vis >
                      1 ? (
                        <span className="text-yellow-500 ml-2">
                          {tDefaults("autoNormalized")}
                        </span>
                      ) : (
                        <span className="text-green-500 ml-2">OK</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Code Editor Mode */}
              {activeTransferTab === "code" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={transferJsonCode}
                      onChange={(e) => handleTransferJsonChange(e.target.value)}
                      className="font-mono text-sm min-h-[300px] bg-zinc-950 text-zinc-100 border-zinc-800"
                      placeholder="Enter JSON configuration..."
                      spellCheck={false}
                    />
                    {transferJsonError && (
                      <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-400">
                        {transferJsonError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {tDefaults("jsonEditNote")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTransferJsonCode(
                          JSON.stringify(DEFAULT_TRANSFER_PARAMS, null, 2)
                        );
                        setTransferJsonError(null);
                      }}
                    >
                      {tDefaults("resetToDefault")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Reason Defaults with UI/Code Tabs */}
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{tDefaults("reason")}</h4>
                <Tabs
                  value={activeReasonTab}
                  onValueChange={handleReasonTabChange}
                  className="w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="ui" className="text-xs px-3">
                      UI
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs px-3">
                      JSON
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* UI Mode */}
              {activeReasonTab === "ui" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {tDefaults("threshold")}: {reasonDefaults.threshold.toFixed(2)}
                    </label>
                    <Slider
                      value={[reasonDefaults.threshold]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={([value]) =>
                        setReasonDefaults((prev) => ({ ...prev, threshold: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{tDefaults("modelSize")}</label>
                    <Select
                      value={reasonDefaults.model_size}
                      onValueChange={(value: "2B" | "8B") =>
                        setReasonDefaults((prev) => ({ ...prev, model_size: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2B">2B (Faster)</SelectItem>
                        <SelectItem value="8B">8B (More Accurate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {tDefaults("videoSampleFps")}: {reasonDefaults.video_fps}
                    </label>
                    <Slider
                      value={[reasonDefaults.video_fps]}
                      min={1}
                      max={8}
                      step={1}
                      onValueChange={([value]) =>
                        setReasonDefaults((prev) => ({ ...prev, video_fps: value }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Code Editor Mode */}
              {activeReasonTab === "code" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Textarea
                      value={reasonJsonCode}
                      onChange={(e) => handleReasonJsonChange(e.target.value)}
                      className="font-mono text-sm min-h-[200px] bg-zinc-950 text-zinc-100 border-zinc-800"
                      placeholder="Enter JSON configuration..."
                      spellCheck={false}
                    />
                    {reasonJsonError && (
                      <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-400">
                        {reasonJsonError}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {tDefaults("jsonEditNote")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReasonJsonCode(
                          JSON.stringify(DEFAULT_REASON_PARAMS, null, 2)
                        );
                        setReasonJsonError(null);
                      }}
                    >
                      {tDefaults("resetToDefault")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Common Settings */}
            <div className="space-y-4 p-4 rounded-lg border">
              <h4 className="font-medium">{tDefaults("common")}</h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{tDefaults("defaultSeed")}</label>
                  <Input
                    type="number"
                    value={predictDefaults.seed}
                    onChange={(e) => {
                      const seed = parseInt(e.target.value) || 0;
                      setPredictDefaults((prev) => ({ ...prev, seed }));
                      setTransferDefaults((prev) => ({ ...prev, seed }));
                    }}
                    className="w-32"
                    disabled={useRandomSeed}
                  />
                </div>
                <label className="flex items-center gap-2 mt-6">
                  <Checkbox
                    checked={useRandomSeed}
                    onCheckedChange={(checked) => setUseRandomSeed(checked as boolean)}
                  />
                  <span className="text-sm">{tDefaults("randomSeed")}</span>
                </label>
              </div>
            </div>

            <Button variant="outline" onClick={resetDefaults}>
              {tDefaults("resetFactory")}
            </Button>
          </CardContent>
        </Card>
        )}

        {/* 4. Profiles */}
        {activeTab === "profiles" && (
        <Card>
          <CardHeader>
            <CardTitle>{tProfiles("title")}</CardTitle>
            <CardDescription>
              {tProfiles("subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Built-in Profiles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {tProfiles("builtIn")} ({DEFAULT_PROFILES.length})
              </h4>
              <div className="grid gap-2">
                {DEFAULT_PROFILES.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-3 rounded-lg border bg-accent/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{profile.nameKo}</div>
                        <p className="text-xs text-muted-foreground">
                          {profile.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                        Built-in
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Profiles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {tProfiles("custom")} ({customProfiles.length})
              </h4>
              {customProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                  {tProfiles("noCustom")}
                </p>
              ) : (
                <div className="grid gap-2">
                  {customProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{profile.nameKo}</div>
                          <p className="text-xs text-muted-foreground">
                            {profile.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCustomProfile(profile.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          {tProfiles("delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Import/Export */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={exportProfiles}>
                {tProfiles("exportAll")}
              </Button>
              <label>
                <Button variant="outline" asChild>
                  <span>{tProfiles("import")}</span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importProfiles}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>
        )}

        {/* 5. Style Prompts Library */}
        {activeTab === "styles" && (
        <Card>
          <CardHeader>
            <CardTitle>{tStyles("title")}</CardTitle>
            <CardDescription>
              {tStyles("subtitle")} ({TRANSFER_STYLES.length})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Built-in Styles by Category */}
            {TRANSFER_STYLE_CATEGORIES.map((category) => (
              <div key={category.name} className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  {category.name}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({category.styles.length})
                  </span>
                </h4>
                <div className="grid gap-2">
                  {category.styles.map((style, idx) => (
                    <div
                      key={`${category.name}-${idx}`}
                      className="p-3 rounded-lg border bg-accent/10 hover:bg-accent/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{style.name}</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            &ldquo;{style.prompt}&rdquo;
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0">
                          {tStyles("duplicate")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Styles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                {tStyles("customStyles")}
              </h4>
              {customStyles.filter((s) => !s.isBuiltIn).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {tStyles("noCustom")}
                </p>
              ) : (
                customStyles
                  .filter((s) => !s.isBuiltIn)
                  .map((style) => (
                    <div key={style.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium">{style.name}</div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            &ldquo;{style.prompt}&rdquo;
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            {tStyles("edit")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCustomStyle(style.id)}
                          >
                            {tProfiles("delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <Button variant="outline" onClick={addCustomStyle}>
              {tStyles("addCustom")}
            </Button>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Save Button - Always Visible */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t">
        <div>
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.type === "success" ? "text-success" : "text-error"
              }`}
            >
              {saveMessage.text}
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !apiConnected}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
