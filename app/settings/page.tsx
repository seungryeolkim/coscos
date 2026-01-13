"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CONTROL_WEIGHT_PRESETS,
  type TransferStyle,
  type PredictParams,
  type TransferParams,
  type ReasonParams,
} from "@/lib/types";

// Settings state types
interface APISettings {
  provider: "nim" | "self-hosted";
  nimApiKey: string;
  nimEndpoint: string;
  selfHostedPredictEndpoint: string;
  selfHostedTransferEndpoint: string;
  selfHostedReasonEndpoint: string;
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

interface Profile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  predict: Partial<PredictParams>;
  transfer: Partial<TransferParams>;
  reason: Partial<ReasonParams>;
}

interface CustomStyle extends TransferStyle {
  id: string;
  isBuiltIn: boolean;
}

export default function SettingsPage() {
  // API Settings state
  const [apiSettings, setApiSettings] = useState<APISettings>({
    provider: "self-hosted",
    nimApiKey: "",
    nimEndpoint: "https://ai.api.nvidia.com/v1",
    selfHostedPredictEndpoint: "http://localhost:8000",
    selfHostedTransferEndpoint: "http://localhost:8001",
    selfHostedReasonEndpoint: "http://localhost:8002",
    timeout: 300,
    maxRetries: 3,
    retryBackoff: 2.0,
  });

  // Output Settings state
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({
    outputDirectory: "~/cosmosqzb/output",
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

  // Transfer JSON Editor state
  const [transferJsonCode, setTransferJsonCode] = useState("");
  const [transferJsonError, setTransferJsonError] = useState<string | null>(null);
  const [activeTransferTab, setActiveTransferTab] = useState<"ui" | "code">("ui");

  // Sync Transfer UI to JSON when transferDefaults changes
  useEffect(() => {
    if (activeTransferTab === "ui") {
      setTransferJsonCode(JSON.stringify(transferDefaults, null, 2));
      setTransferJsonError(null);
    }
  }, [transferDefaults, activeTransferTab]);

  // Handle JSON code changes
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

  // Apply JSON to UI state
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

  // Handle tab change
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

  // Profiles state
  const [profiles, setProfiles] = useState<Profile[]>([
    {
      id: "1",
      name: "Autonomous Driving",
      description: "Transfer: Rain, Night, Sunset, Fog | Threshold: 0.75",
      isDefault: true,
      predict: {},
      transfer: { styles: TRANSFER_STYLES.slice(0, 4) },
      reason: { threshold: 0.75 },
    },
    {
      id: "2",
      name: "Robotics",
      description: "Photorealism only | Threshold: 0.80",
      isDefault: false,
      predict: {},
      transfer: { styles: [TRANSFER_STYLES[4]] },
      reason: { threshold: 0.8 },
    },
    {
      id: "3",
      name: "Quick Test",
      description: "Low quality, fast processing | Steps: 10, Model: 2B",
      isDefault: false,
      predict: { model_size: "2B" },
      transfer: { num_steps: 10 },
      reason: { model_size: "2B" },
    },
  ]);

  // Custom Styles state
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([
    ...TRANSFER_STYLES.map((s, i) => ({ ...s, id: `builtin-${i}`, isBuiltIn: true })),
  ]);

  // Connection test states
  const [testingConnections, setTestingConnections] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, "success" | "error" | null>>({});

  // Active section for mobile navigation
  const [activeSection, setActiveSection] = useState("api");

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

  const setDefaultProfile = (profileId: string) => {
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        isDefault: p.id === profileId,
      }))
    );
  };

  const deleteProfile = (profileId: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
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
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure API connections, output options, and default parameters
        </p>
      </div>

      {/* Section Navigation - Mobile */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 lg:hidden">
        {["api", "output", "defaults", "profiles", "styles"].map((section) => (
          <Button
            key={section}
            variant={activeSection === section ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(section)}
            className="whitespace-nowrap"
          >
            {section === "api" && "API"}
            {section === "output" && "Output"}
            {section === "defaults" && "Defaults"}
            {section === "profiles" && "Profiles"}
            {section === "styles" && "Styles"}
          </Button>
        ))}
      </div>

      <div className="grid gap-6">
        {/* 1. API Configuration */}
        <Card className={activeSection !== "api" ? "hidden lg:block" : ""}>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Configure NVIDIA NIM or self-hosted model endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Provider</label>
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
                  <input
                    type="radio"
                    name="provider"
                    checked={apiSettings.provider === "nim"}
                    onChange={() =>
                      setApiSettings((prev) => ({ ...prev, provider: "nim" }))
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">NVIDIA NIM (Cloud)</div>
                    <div className="text-sm text-muted-foreground">
                      Fast startup, usage-based billing
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
                  <input
                    type="radio"
                    name="provider"
                    checked={apiSettings.provider === "self-hosted"}
                    onChange={() =>
                      setApiSettings((prev) => ({ ...prev, provider: "self-hosted" }))
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">Self-hosted (RunPod/Local)</div>
                    <div className="text-sm text-muted-foreground">
                      Unlimited usage, self-managed
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* NIM Settings */}
            {apiSettings.provider === "nim" && (
              <div className="space-y-4 p-4 rounded-lg border bg-accent/20">
                <h4 className="font-medium text-sm">NVIDIA NIM Settings</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm">API Key</label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="nvapi-xxxx..."
                        value={apiSettings.nimApiKey}
                        onChange={(e) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            nimApiKey: e.target.value,
                          }))
                        }
                      />
                      <Button variant="outline" size="sm">
                        Show
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Endpoint</label>
                    <Input
                      value={apiSettings.nimEndpoint}
                      onChange={(e) =>
                        setApiSettings((prev) => ({
                          ...prev,
                          nimEndpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Self-hosted Settings */}
            {apiSettings.provider === "self-hosted" && (
              <div className="space-y-4 p-4 rounded-lg border bg-accent/20">
                <h4 className="font-medium text-sm">Self-hosted Endpoints</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm flex items-center gap-2">
                      Predict Endpoint
                      {connectionStatus.predict && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            connectionStatus.predict === "success"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {connectionStatus.predict === "success" ? "Connected" : "Failed"}
                        </span>
                      )}
                    </label>
                    <Input
                      placeholder="http://localhost:8000"
                      value={apiSettings.selfHostedPredictEndpoint}
                      onChange={(e) =>
                        setApiSettings((prev) => ({
                          ...prev,
                          selfHostedPredictEndpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm flex items-center gap-2">
                      Transfer Endpoint
                      {connectionStatus.transfer && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            connectionStatus.transfer === "success"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {connectionStatus.transfer === "success" ? "Connected" : "Failed"}
                        </span>
                      )}
                    </label>
                    <Input
                      placeholder="http://localhost:8001"
                      value={apiSettings.selfHostedTransferEndpoint}
                      onChange={(e) =>
                        setApiSettings((prev) => ({
                          ...prev,
                          selfHostedTransferEndpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm flex items-center gap-2">
                      Reason Endpoint
                      {connectionStatus.reason && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            connectionStatus.reason === "success"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {connectionStatus.reason === "success" ? "Connected" : "Failed"}
                        </span>
                      )}
                    </label>
                    <Input
                      placeholder="http://localhost:8002"
                      value={apiSettings.selfHostedReasonEndpoint}
                      onChange={(e) =>
                        setApiSettings((prev) => ({
                          ...prev,
                          selfHostedReasonEndpoint: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Connection Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Connection Settings</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Timeout (seconds)
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
                  <label className="text-sm text-muted-foreground">Max Retries</label>
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
                    Retry Backoff (x)
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
              {testingConnections ? "Testing..." : "Test All Connections"}
            </Button>
          </CardContent>
        </Card>

        {/* 2. Output Configuration */}
        <Card className={activeSection !== "output" ? "hidden lg:block" : ""}>
          <CardHeader>
            <CardTitle>Output Configuration</CardTitle>
            <CardDescription>
              Configure output directory, file organization, and encoding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Output Directory */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Directory</label>
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
              <label className="text-sm font-medium">File Organization</label>
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
                    Create dated subfolders (output/2026-01-12/)
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
                  <span className="text-sm">Save rejected videos</span>
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
                    Save intermediate files (predict, transfer results)
                  </span>
                </label>
              </div>
            </div>

            {/* Naming Convention */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Naming Convention</label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Prefix</label>
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
                  <label className="text-sm text-muted-foreground">Suffix</label>
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
                <span className="text-sm text-muted-foreground">Preview: </span>
                <code className="text-sm">
                  {outputSettings.namingPrefix}dashcam_city{outputSettings.namingSuffix}
                  _00.mp4
                </code>
              </div>
            </div>

            {/* Video Encoding */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Video Encoding</label>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Codec</label>
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
                  <label className="text-sm text-muted-foreground">Quality</label>
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
                  <label className="text-sm text-muted-foreground">Audio</label>
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
                      <SelectItem value="remove">Remove</SelectItem>
                      <SelectItem value="keep">Keep Original</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Default Values */}
        <Card className={activeSection !== "defaults" ? "hidden lg:block" : ""}>
          <CardHeader>
            <CardTitle>Default Values</CardTitle>
            <CardDescription>
              Set default parameters for each pipeline mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Predict Defaults */}
            <div className="space-y-4 p-4 rounded-lg border">
              <h4 className="font-medium">Predict Defaults</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Resolution</label>
                  <Select
                    value={predictDefaults.resolution}
                    onValueChange={(value: "480p" | "720p") =>
                      setPredictDefaults((prev) => ({ ...prev, resolution: value }))
                    }
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
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">FPS</label>
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
                  <label className="text-sm text-muted-foreground">Model Size</label>
                  <Select
                    value={predictDefaults.model_size}
                    onValueChange={(value: "2B" | "14B") =>
                      setPredictDefaults((prev) => ({ ...prev, model_size: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2B">2B (Faster)</SelectItem>
                      <SelectItem value="14B">14B (Better Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Guidance Scale: {predictDefaults.guidance_scale.toFixed(1)}
                  </label>
                  <Slider
                    value={[predictDefaults.guidance_scale]}
                    min={1}
                    max={15}
                    step={0.5}
                    onValueChange={([value]) =>
                      setPredictDefaults((prev) => ({ ...prev, guidance_scale: value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Transfer Defaults with UI/Code Tabs */}
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Transfer Defaults</h4>
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
                        Control Weight Preset
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
                        Inference Steps: {transferDefaults.num_steps}
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
                        Guidance Scale: {transferDefaults.guidance_scale.toFixed(1)}
                      </label>
                      <Slider
                        value={[transferDefaults.guidance_scale]}
                        min={1}
                        max={15}
                        step={0.5}
                        onValueChange={([value]) =>
                          setTransferDefaults((prev) => ({ ...prev, guidance_scale: value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Control Weights Sliders */}
                  <div className="space-y-3 pt-2">
                    <label className="text-sm font-medium">Control Weights</label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex justify-between">
                          <span>Depth (3D Structure)</span>
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
                          <span>Edge (Outline)</span>
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
                          <span>Seg (Object Transform)</span>
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
                          <span>Vis (Visual Consistency)</span>
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
                          (Will be auto-normalized)
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
                      Edit the JSON directly to configure Transfer parameters.
                      Changes will be validated and applied when switching to UI
                      mode.
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
                      Reset to Default
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Reason Defaults */}
            <div className="space-y-4 p-4 rounded-lg border">
              <h4 className="font-medium">Reason Defaults</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Threshold: {reasonDefaults.threshold.toFixed(2)}
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
                  <label className="text-sm text-muted-foreground">Model Size</label>
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
                    Video Sample FPS: {reasonDefaults.video_fps}
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
            </div>

            {/* Common Settings */}
            <div className="space-y-4 p-4 rounded-lg border">
              <h4 className="font-medium">Common</h4>
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Default Seed</label>
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
                  <span className="text-sm">Random seed for each job</span>
                </label>
              </div>
            </div>

            <Button variant="outline" onClick={resetDefaults}>
              Reset All to Factory Defaults
            </Button>
          </CardContent>
        </Card>

        {/* 4. Profiles & Presets */}
        <Card className={activeSection !== "profiles" ? "hidden lg:block" : ""}>
          <CardHeader>
            <CardTitle>Profiles & Presets</CardTitle>
            <CardDescription>
              Save and manage configuration profiles for different use cases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile List */}
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-lg border ${
                    profile.isDefault ? "border-foreground/30 bg-accent/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="default-profile"
                        checked={profile.isDefault}
                        onChange={() => setDefaultProfile(profile.id)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {profile.name}
                          {profile.isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded bg-foreground/10">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {profile.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteProfile(profile.id)}
                        disabled={profile.isDefault}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">+ Create New Profile</Button>
              <Button variant="outline">Import</Button>
              <Button variant="outline">Export</Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Style Prompts Library */}
        <Card className={activeSection !== "styles" ? "hidden lg:block" : ""}>
          <CardHeader>
            <CardTitle>Style Prompts Library</CardTitle>
            <CardDescription>
              Manage built-in and custom style prompts for transfer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Built-in Styles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Built-in Styles
              </h4>
              {customStyles
                .filter((s) => s.isBuiltIn)
                .map((style) => (
                  <div
                    key={style.id}
                    className="p-4 rounded-lg border bg-accent/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{style.name}</div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          &ldquo;{style.prompt}&rdquo;
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Duplicate
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Custom Styles */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Custom Styles
              </h4>
              {customStyles.filter((s) => !s.isBuiltIn).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No custom styles yet. Click below to add one.
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
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCustomStyle(style.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <Button variant="outline" onClick={addCustomStyle}>
              + Add Custom Style
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
