// Request status types
export type RequestStatus = "pending" | "running" | "completed" | "failed";

// Pipeline stage types
export type PipelineStage =
  | "idle"
  | "uploading"
  | "predict"
  | "transfer"
  | "reason"
  | "completed"
  | "failed";

// Progress state types
export interface ProgressState {
  job_id: string;
  is_active: boolean;
  current_stage: PipelineStage;
  current_file: string | null;
  current_variant: number | null;
  progress: {
    total_files: number;
    completed_files: number;
    failed_files: number;
    remaining_files: number;
    percent: number;
  };
  variants: {
    total: number;
    completed: number;
  };
  time: {
    started_at: string | null;
    updated_at: string | null;
    estimated_remaining: number | null;
  };
  files: Record<string, FileProgressState>;
  message: string | null;
}

export interface FileProgressState {
  status: "pending" | "processing" | "completed" | "failed";
  current_stage?: string;
  physics_score?: number;
  is_valid?: boolean;
  error?: string;
}

// ============ Detailed Job Progress Types (for Progress View) ============

export type JobProgressStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobProgress {
  job_id: string;
  job_name: string;
  status: JobProgressStatus;

  // Timing
  started_at: string | null;
  updated_at: string;
  elapsed_seconds: number;
  estimated_total_seconds: number | null;
  estimated_remaining_seconds: number | null;

  // Overall Progress
  total_videos: number;
  completed_videos: number;
  failed_videos: number;
  current_video_index: number;
  overall_percent: number;

  // Current Video Progress
  current_video: {
    filename: string;
    stage: PipelineStage;
    stage_progress: {
      current_variant: number;
      total_variants: number;
      percent: number;
    };
    stage_started_at: string;
    stage_elapsed_seconds: number;
  } | null;

  // Pipeline Definition
  pipeline_stages: Array<{
    type: PipelineStage;
    status: "pending" | "running" | "completed" | "skipped" | "failed";
    duration_seconds: number | null;
  }>;

  // Video Queue
  videos: Array<{
    filename: string;
    status: "pending" | "running" | "completed" | "failed";
    duration_seconds: number | null;
    physics_score: number | null;
    error: string | null;
    stages: Array<{
      type: string;
      status: string;
      duration_seconds: number | null;
    }>;
  }>;

  // Statistics
  stats: {
    avg_time_per_video: number | null;
    success_rate: number;
    avg_physics_score: number | null;
  };

  // Logs (optional)
  recent_logs: Array<{
    timestamp: string;
    level: "info" | "warning" | "error";
    message: string;
  }>;
}

// SSE Event types for real-time updates
export type SSEProgressEvent =
  | { type: "progress"; data: JobProgress }
  | { type: "stage_change"; data: { video: string; stage: string } }
  | { type: "video_complete"; data: { video: string; score: number } }
  | { type: "video_failed"; data: { video: string; error: string } }
  | { type: "job_complete"; data: JobProgress }
  | { type: "log"; data: { timestamp: string; level: string; message: string } };

// Helper functions for progress calculations
export function calculateETA(progress: JobProgress): number {
  if (progress.completed_videos === 0) {
    // No completed videos yet, use default estimate (3 min per video)
    return (progress.total_videos - progress.current_video_index) * 180;
  }

  // Average time per completed video
  const avgTime = progress.elapsed_seconds / progress.completed_videos;

  // Remaining videos
  const remaining = progress.total_videos - progress.completed_videos;

  // Estimate current video remaining time
  let currentRemaining = 0;
  if (progress.current_video) {
    const currentProgress = progress.current_video.stage_progress.percent;
    currentRemaining = avgTime * (1 - currentProgress / 100);
  }

  return Math.round(currentRemaining + remaining * avgTime);
}

export function calculateOverallProgress(progress: JobProgress): number {
  if (progress.total_videos === 0) return 0;

  const completedRatio = progress.completed_videos / progress.total_videos;

  let currentContribution = 0;
  if (progress.current_video) {
    const currentProgress = progress.current_video.stage_progress.percent / 100;
    currentContribution = currentProgress / progress.total_videos;
  }

  return (completedRatio + currentContribution) * 100;
}

// Video status icon helper
export function getVideoStatusIcon(status: string): string {
  switch (status) {
    case "completed": return "✓";
    case "running": return "⟳";
    case "failed": return "✗";
    case "pending":
    default: return "○";
  }
}

// Stage status color helper
export function getStageStatusColor(status: string): string {
  switch (status) {
    case "completed": return "text-green-500 bg-green-500/10";
    case "running": return "text-yellow-500 bg-yellow-500/10";
    case "failed": return "text-red-500 bg-red-500/10";
    case "skipped": return "text-gray-400 bg-gray-400/10";
    case "pending":
    default: return "text-gray-500 bg-gray-500/10";
  }
}

// Stage configuration for UI
export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; labelKo: string; color: string }
> = {
  idle: { label: "Idle", labelKo: "대기", color: "text-muted-foreground" },
  uploading: { label: "Upload", labelKo: "업로드", color: "text-blue-500" },
  predict: { label: "PREDICT", labelKo: "PREDICT", color: "text-cyan-500" },
  transfer: { label: "TRANSFER", labelKo: "TRANSFER", color: "text-purple-500" },
  reason: { label: "REASON", labelKo: "REASON", color: "text-orange-500" },
  completed: { label: "Done", labelKo: "완료", color: "text-green-500" },
  failed: { label: "Failed", labelKo: "실패", color: "text-red-500" },
};

// Main request type - contains multiple input videos
export interface Request {
  id: string;
  name: string; // Request name (e.g., "Batch 2026-01-06")
  jobId?: string;
  status: RequestStatus;
  createdAt: string;
  completedAt?: string;
  totalDuration?: number;
  config: PipelineConfig;
  // Multiple inputs per request
  inputs: InputVideo[];
  // Computed fields
  totalInputs: number;
  totalVariants: number;
  passedCount: number;
  failedCount: number;
  avgScore: number;
}

// Input video (individual or pair with depth/edge)
export interface InputVideo {
  id: string;
  requestId: string;
  // RGB video (required)
  rgbPath: string;
  rgbFilename: string;
  // Control input pair (optional)
  controlPath?: string;
  controlFilename?: string;
  controlType?: "depth" | "edge" | "seg" | "vis";
  controlWeight?: number;
  // Output variants for this input
  variants: Variant[];
  // Computed fields
  passedCount: number;
  failedCount: number;
  avgScore: number;
}

// Variant (each output from transfer for a specific input)
export interface Variant {
  id: string;
  inputId: string;
  variantIndex: number;
  prompt: string;
  styleName: string; // e.g., "Rain", "Night", "Sunset"
  outputPath?: string;
  physicsScore?: number;
  isValid: boolean;
  rejectionReason?: string;
  transferDuration?: number;
  reasonDuration?: number;
}

// Pipeline configuration
export interface PipelineConfig {
  predictPrompt?: string;
  transferPrompts: string[];
  controlWeights: ControlWeights;
  seed: number;
  threshold: number;
  save_intermediate?: boolean;
}

// API response types
export interface RequestListResponse {
  requests: Request[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestDetailResponse {
  request: Request;
}

// Filter options
export interface RequestFilters {
  status?: RequestStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Video comparison state
export interface CompareState {
  inputPath: string;
  variantId: string;
  outputPath: string;
  isPlaying: boolean;
  currentTime: number;
}

// Style name mapping
export const STYLE_NAMES: Record<string, string> = {
  rain: "Rain",
  night: "Night",
  sunset: "Sunset",
  fog: "Fog",
  photorealism: "Photorealism",
  비: "Rain",
  우천: "Rain",
  야간: "Night",
  밤: "Night",
  석양: "Sunset",
  일몰: "Sunset",
  안개: "Fog",
  포토리얼리즘: "Photorealism",
};

// Helper to get style name from prompt
export function getStyleNameFromPrompt(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  if (promptLower.includes("rain") || promptLower.includes("wet")) return "Rain";
  if (promptLower.includes("night") || promptLower.includes("dark")) return "Night";
  if (promptLower.includes("sunset") || promptLower.includes("golden")) return "Sunset";
  if (promptLower.includes("fog") || promptLower.includes("mist")) return "Fog";
  if (promptLower.includes("photo") || promptLower.includes("realistic")) return "Photo";
  return "Custom";
}

// Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get status color class
export function getStatusColor(status: RequestStatus): string {
  switch (status) {
    case "completed":
      return "text-success";
    case "failed":
      return "text-error";
    case "running":
      return "text-warning";
    case "pending":
    default:
      return "text-pending";
  }
}

// Get score color class
export function getScoreColor(score: number, threshold = 0.7): string {
  if (score >= threshold) return "text-success";
  if (score >= threshold - 0.1) return "text-warning";
  return "text-error";
}

// ============ Browse Types ============

export interface VideoFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  // Associated prompt file (auto-detected if exists)
  promptFile?: {
    name: string;
    path: string;
    prompts: string[];  // Each line = one prompt (1:n mapping)
  };
}

export interface FolderInfo {
  name: string;
  path: string;
}

export interface BrowseResponse {
  path: string;
  videos: VideoFile[];
  folders: FolderInfo[];
  count: number;
}

// ============ Job Types ============

export type JobMode = "predict" | "transfer" | "full";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface TransferStyle {
  name: string;
  prompt: string;
}

export interface JobConfig {
  mode: JobMode;
  predict_prompt?: string;
  transfer_styles: TransferStyle[];
  seed: number;
  threshold: number;
}

// Stage result from API (workflow stage execution result)
export interface StageResultFromAPI {
  stage_id: string;
  stage_type: StageType;
  order: number;
  input_count: number;
  output_count: number;
  filtered_count?: number;
  status: "pending" | "running" | "completed" | "failed";
  duration?: number;
}

export interface JobInfo {
  id: string;
  name: string;
  status: JobStatus;
  mode: JobMode;
  video_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress?: ProgressState;
  error?: string;
  // Workflow stages configuration
  workflow?: {
    stages: Array<{
      id: string;
      type: StageType;
      order: number;
      config: Record<string, unknown>;
    }>;
  };
  // Stage execution results
  stage_results?: StageResultFromAPI[];
}

export interface JobResult {
  input: string;
  input_type?: "video" | "image";
  success: boolean;
  output?: string;
  physics_score?: number;
  physics_scores?: number[];
  passed_filter?: boolean;
  error?: string;
}

export interface CreateJobResponse {
  job: JobInfo;
}

export interface ListJobsResponse {
  jobs: JobInfo[];
  total: number;
}

export interface GetJobResponse {
  job: JobInfo;
  results?: JobResult[];
  stage_results?: StageResultFromAPI[];
  workflow?: {
    stages: Array<{
      id: string;
      type: StageType;
      order: number;
      config: Record<string, unknown>;
    }>;
  };
}

// ============ Predefined Styles ============
// Based on NVIDIA Cosmos Transfer recommended augmentation categories

export interface TransferStyleCategory {
  name: string;
  styles: TransferStyle[];
}

// Lighting variations (조명)
export const LIGHTING_STYLES: TransferStyle[] = [
  {
    name: "Sunrise",
    prompt: "Same scene during sunrise with soft pink and orange hues on the horizon, gentle morning light casting long shadows, and a gradual transition from darkness to daylight. Maintain temporal consistency.",
  },
  {
    name: "Morning",
    prompt: "Same scene during mid-morning with bright, clear daylight, moderate shadows, and natural color temperature. The sun is positioned at a moderate angle providing even illumination. Maintain temporal consistency.",
  },
  {
    name: "Noon",
    prompt: "Same scene at zenith with the sun directly overhead, minimal shadows, strong contrast, and bright, harsh lighting conditions typical of midday. Maintain temporal consistency.",
  },
  {
    name: "Afternoon",
    prompt: "Same scene during afternoon with warm, angled sunlight creating defined shadows, slightly golden tint to the lighting, and comfortable visibility. Maintain temporal consistency.",
  },
  {
    name: "Golden Hour",
    prompt: "Same scene during golden hour with rich, warm golden-orange lighting, long dramatic shadows, and a soft, cinematic quality to the illumination. Maintain temporal consistency.",
  },
  {
    name: "Sunset",
    prompt: "Same scene during sunset with warm golden and orange lighting, dramatic sky colors, elongated shadows, and a peaceful evening atmosphere. Maintain temporal consistency.",
  },
  {
    name: "Blue Hour",
    prompt: "Same scene during blue hour with soft blue ambient light, city lights beginning to appear, and a tranquil twilight atmosphere between sunset and night. Maintain temporal consistency.",
  },
  {
    name: "Twilight",
    prompt: "Same scene during twilight with dim ambient light, mixed artificial and natural lighting, emerging stars, and a gradual transition to nighttime. Maintain temporal consistency.",
  },
  {
    name: "Night",
    prompt: "Same scene at night with artificial street lighting, vehicle headlights illuminating the road, dark sky, and urban light sources creating pools of illumination. Maintain temporal consistency.",
  },
];

// Weather variations (날씨)
export const WEATHER_STYLES: TransferStyle[] = [
  {
    name: "Clear Day",
    prompt: "Same scene on a clear day with bright blue sky, excellent visibility, crisp shadows, and vibrant colors under direct sunlight. Maintain temporal consistency.",
  },
  {
    name: "Overcast",
    prompt: "Same scene on an overcast day with grey cloudy sky, diffused soft lighting, muted shadows, and even illumination across the scene. Maintain temporal consistency.",
  },
  {
    name: "Rainy",
    prompt: "Same scene during heavy rain with wet reflective road surfaces, water droplets, puddles forming, reduced visibility, and glistening reflections from lights. Maintain temporal consistency.",
  },
  {
    name: "Foggy",
    prompt: "Same scene in foggy weather with significantly reduced visibility, atmospheric haze, diffused lighting, and objects fading into the mist at distance. Maintain temporal consistency.",
  },
  {
    name: "Light Snow",
    prompt: "Same scene during active snowfall with snowflakes falling through the air, reduced visibility, white accumulation beginning on surfaces, and cold winter atmosphere. Maintain temporal consistency.",
  },
  {
    name: "Heavy Snow",
    prompt: "Same scene during heavy snowfall with thick snow accumulation on all surfaces, limited visibility, white-covered ground and objects, and intense winter conditions. Maintain temporal consistency.",
  },
];

// Road surface variations (노면)
export const ROAD_STYLES: TransferStyle[] = [
  {
    name: "Dry Road",
    prompt: "Same scene with dry road surface, clear asphalt texture visible, no moisture or debris, optimal driving conditions with good tire grip. Maintain temporal consistency.",
  },
  {
    name: "Wet Road",
    prompt: "Same scene with wet road surface after rain, water puddles scattered across the road, reflective wet asphalt, and potential for hydroplaning conditions. Maintain temporal consistency.",
  },
  {
    name: "Snow Covered",
    prompt: "Same scene with snow-covered road surface, white snow accumulation on the road, partially visible lane markings, and slippery winter driving conditions. Maintain temporal consistency.",
  },
  {
    name: "Sandy Desert",
    prompt: "Same scene with sandy desert road conditions, dust particles in the air, sand accumulation on road edges, arid environment with desert landscape. Maintain temporal consistency.",
  },
];

// Special effects (특수 효과)
export const SPECIAL_STYLES: TransferStyle[] = [
  {
    name: "Photorealism",
    prompt: "Same scene with enhanced photorealism, realistic textures, natural lighting, accurate material properties, and cinematic quality rendering. Maintain temporal consistency.",
  },
  {
    name: "Simulator to Reality",
    prompt: "Same scene transformed from synthetic simulation to photorealistic real-world appearance, with natural textures, realistic lighting, and authentic environmental details. Maintain temporal consistency.",
  },
];

// Combined list for backward compatibility
export const TRANSFER_STYLES: TransferStyle[] = [
  ...LIGHTING_STYLES,
  ...WEATHER_STYLES,
  ...ROAD_STYLES,
  ...SPECIAL_STYLES,
];

// Categorized styles for UI display
export const TRANSFER_STYLE_CATEGORIES: TransferStyleCategory[] = [
  { name: "Lighting", styles: LIGHTING_STYLES },
  { name: "Weather", styles: WEATHER_STYLES },
  { name: "Road Surface", styles: ROAD_STYLES },
  { name: "Special Effects", styles: SPECIAL_STYLES },
];

// ============ Detailed Mode Parameters (Yetter Schema Compatible) ============

// Predict resolution format: "height,width" (e.g., "720,1280")
export type PredictResolution = "480,854" | "480,640" | "720,1280" | "720,960";
// Transfer resolution: just height as string
export type TransferResolution = "480" | "720";
export type FPS = 10 | 16 | 24;
export type ModelSize = "2B" | "14B" | "8B";
// Control types matching Yetter DB schema
export type ControlType = "depth" | "edge" | "seg" | "vis";

export type NumOutputFrames = 121 | 241 | 481;  // ~4s, ~8s, ~16s at 30fps base

// Yetter Cosmos-Predict2.5 compatible params
export interface PredictParams {
  // Always use array for prompts (each prompt generates separate output per input)
  // For single prompt, use array with one element: ["my prompt"]
  prompts: string[];
  negative_prompt?: string;
  // Input source (one of these - selected from file browser in UI)
  video_url?: string;  // Video2World: input video URL
  image_url?: string;  // Image2World: input image URL
  seed: number;
  // Yetter uses "guidance" not "guidance_scale"
  guidance: number;  // default: 3.0
  // Yetter format: "height,width" (e.g., "720,1280")
  resolution: PredictResolution;
  fps: FPS;  // default: 16
  // Yetter uses "num_output_frames" not "num_frames"
  num_output_frames: NumOutputFrames;  // default: 121
  num_steps: number;  // default: 35
  // Autoregressive generation options (for long video generation)
  enable_autoregressive?: boolean;
  chunk_size?: number;  // default: 33
  chunk_overlap?: number;  // default: 9
}

// Control weights matching Yetter DB schema
export interface ControlWeights {
  depth: number;
  edge: number;
  seg: number;   // Segmentation control
  vis: number;   // Visibility/blur control
}

// Control modalities for custom control video inputs
export interface ControlModalities {
  depth_url?: string;  // Custom depth control video URL
  edge_url?: string;   // Custom edge control video URL
  seg_url?: string;    // Custom segmentation video URL
  vis_url?: string;    // Custom visibility/blur video URL
}

// Yetter Cosmos-Transfer2.5 compatible params
export interface TransferParams {
  // Always use array for prompts (each prompt creates separate style variant)
  // For single prompt, use array with one element: ["my prompt"]
  prompts: string[];
  negative_prompt?: string;
  // Input source (required - set from file browser in UI)
  video_url?: string;  // Input RGB video URL (simulation or source)
  // Style presets (UI convenience - converted to prompts when sending)
  styles?: TransferStyle[];
  seed: number;
  // Yetter uses "guidance" not "guidance_scale"
  guidance: number;  // default: 3.0
  num_steps: number;  // default: 35
  // Control settings
  control_weights: ControlWeights;
  control_types?: ControlType[];  // default: derived from non-zero weights
  control_modalities?: ControlModalities;  // Optional custom control videos (auto-generated if not provided)
  // Transfer-specific
  max_frames: number;  // default: 121
  resolution: TransferResolution;  // "720" or "480"
  fps: FPS;  // default: 24
  // Advanced options
  image_context_url?: string;  // Style conditioning context image URL
  context_frame_index?: number;  // Context frame index for style conditioning (default: 0)
  num_conditional_frames?: number;  // Number of conditional frames (default: 1)
  seg_control_prompt?: string;  // Segmentation prompt for SAM2 (e.g., "car . road . building")
}

export interface ReasonParams {
  threshold: number;
  model_size: "2B" | "8B";
  video_fps: number;
  max_tokens: number;
  criteria: string[];
}

export interface FullJobConfig {
  mode: JobMode;
  predict?: PredictParams;
  transfer?: TransferParams;
  reason?: ReasonParams;
}

// ============ Control Weight Presets ============

export interface ControlWeightPreset {
  name: string;
  description: string;
  weights: ControlWeights;
}

export const CONTROL_WEIGHT_PRESETS: ControlWeightPreset[] = [
  {
    name: "Weather Transfer",
    description: "Optimized for weather changes (rain, snow, fog, etc.)",
    weights: { depth: 0.5, edge: 0.2, seg: 0.2, vis: 0.1 },
  },
  {
    name: "Time of Day",
    description: "For lighting changes (daytime to night, sunset, etc.)",
    weights: { depth: 0.4, edge: 0.1, seg: 0.3, vis: 0.2 },
  },
  {
    name: "Sim2Real",
    description: "Simulation to real-world environment transformation",
    weights: { depth: 0.6, edge: 0.1, seg: 0.2, vis: 0.1 },
  },
  {
    name: "Texture Only",
    description: "Preserve shape while changing texture details",
    weights: { depth: 0.2, edge: 0.4, seg: 0.2, vis: 0.2 },
  },
  {
    name: "Balanced",
    description: "Equal weight for all modalities",
    weights: { depth: 0.25, edge: 0.25, seg: 0.25, vis: 0.25 },
  },
];

// ============ Reason Criteria ============

export const REASON_CRITERIA = [
  { id: "gravity", label: "Gravity", description: "Whether object falling/movement is natural" },
  { id: "object_interaction", label: "Object Interaction", description: "Whether collision/contact responses are realistic" },
  { id: "motion_consistency", label: "Motion Consistency", description: "Whether velocity/acceleration changes are natural" },
  { id: "lighting_coherence", label: "Lighting Coherence", description: "Whether light and shadows are consistent" },
  { id: "object_permanence", label: "Object Permanence", description: "Whether objects don't suddenly disappear or appear" },
  { id: "temporal_consistency", label: "Temporal Consistency", description: "Whether frame-to-frame continuity is maintained" },
];

// ============ Default Values (Yetter Schema Compatible) ============

export const DEFAULT_PREDICT_PARAMS: PredictParams = {
  // Default prompt as single-element array
  prompts: ["Continue this video naturally with realistic physics. Maintain consistent lighting and object motion."],
  seed: 0,  // Yetter default: 0 for random
  guidance: 3.0,  // Yetter default
  resolution: "720,1280",  // Yetter format: "height,width"
  fps: 16,  // Yetter default
  num_output_frames: 121,  // Yetter field name
  num_steps: 35,  // Yetter default
  // Autoregressive options (disabled by default)
  enable_autoregressive: false,
  chunk_size: 33,  // Yetter default
  chunk_overlap: 9,  // Yetter default
};

export const DEFAULT_TRANSFER_PARAMS: TransferParams = {
  // Default prompt as single-element array (will be synced from styles if using presets)
  prompts: ["Same scene with enhanced photorealism. Maintain temporal consistency."],
  styles: [TRANSFER_STYLES[0]],
  seed: 0,  // Yetter default: 0 for random
  guidance: 3.0,  // Yetter default
  num_steps: 35,  // Yetter default
  control_weights: { depth: 0.5, edge: 0.3, seg: 0.5, vis: 0.3 },  // Yetter defaults
  control_types: ["depth"],  // Default control type
  max_frames: 121,  // Yetter default
  resolution: "720",  // Yetter format
  fps: 24,  // Yetter default
  // Advanced options
  context_frame_index: 0,  // Yetter default
  num_conditional_frames: 1,  // Yetter default
};

export const DEFAULT_REASON_PARAMS: ReasonParams = {
  threshold: 0.7,
  model_size: "8B",
  video_fps: 4,
  max_tokens: 4096,
  criteria: ["gravity", "object_interaction", "motion_consistency", "lighting_coherence"],
};

// ============ Workflow Builder Types ============

export type StageType = "predict" | "transfer" | "reason";

export type ReasonFilterMode = "pass_only" | "tag_only";

export interface ReasonStageConfig extends ReasonParams {
  filter_mode: ReasonFilterMode;
}

export interface WorkflowStage {
  id: string;
  type: StageType;
  order: number;
  config: PredictParams | TransferParams | ReasonStageConfig;
}

export interface Workflow {
  stages: WorkflowStage[];
  name?: string;
}

// Input with file-specific prompts (for per-file prompt mapping)
export interface InputWithPrompts {
  path: string;
  prompts?: string[];  // File-specific prompts from associated .txt file
}

export interface CreateWorkflowJobRequest {
  name?: string;
  video_paths: string[];  // Keep for backward compatibility
  inputs?: InputWithPrompts[];  // New: file-specific prompt mapping
  workflow: Workflow;
}

export interface StageResult {
  stage_id: string;
  stage_type: StageType;
  input_videos: string[];
  output_videos: string[];
  filtered_out?: string[];
  passed_count?: number;
  failed_count?: number;
  duration: number;
  status: "pending" | "running" | "completed" | "failed";
}

export interface WorkflowResult {
  stages: StageResult[];
  final_videos: string[];
  total_duration: number;
}

// Stage configuration metadata
export const STAGE_METADATA: Record<StageType, {
  label: string;
  labelKo: string;
  description: string;
  color: string;
  icon: string;
}> = {
  predict: {
    label: "Predict",
    labelKo: "Predict",
    description: "Generate future frames",
    color: "text-cyan-500",
    icon: "🎬",
  },
  transfer: {
    label: "Transfer",
    labelKo: "Transfer",
    description: "Style/environment transformation",
    color: "text-purple-500",
    icon: "🎨",
  },
  reason: {
    label: "Reason",
    labelKo: "Reason",
    description: "Physics validation (filtering)",
    color: "text-orange-500",
    icon: "🔍",
  },
};

// Default Reason Stage Config (extends ReasonParams)
export const DEFAULT_REASON_STAGE_CONFIG: ReasonStageConfig = {
  ...DEFAULT_REASON_PARAMS,
  filter_mode: "pass_only",
};

// Workflow Profile (프로필)
export interface WorkflowProfile {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  stages: Omit<WorkflowStage, "id">[];
  isBuiltIn: boolean;
  createdAt?: string;
}

// Built-in default profiles
export const DEFAULT_PROFILES: WorkflowProfile[] = [
  {
    id: "predict-only",
    name: "Predict Only",
    nameKo: "Predict Only",
    description: "Generate future frames only",
    stages: [
      { type: "predict", order: 1, config: DEFAULT_PREDICT_PARAMS },
    ],
    isBuiltIn: true,
  },
  {
    id: "transfer-only",
    name: "Transfer Only",
    nameKo: "Transfer Only",
    description: "Style transformation only",
    stages: [
      { type: "transfer", order: 1, config: DEFAULT_TRANSFER_PARAMS },
    ],
    isBuiltIn: true,
  },
  {
    id: "classic-full",
    name: "Classic Full",
    nameKo: "Classic Full",
    description: "Predict → Transfer → Reason",
    stages: [
      { type: "predict", order: 1, config: DEFAULT_PREDICT_PARAMS },
      { type: "transfer", order: 2, config: DEFAULT_TRANSFER_PARAMS },
      { type: "reason", order: 3, config: DEFAULT_REASON_STAGE_CONFIG },
    ],
    isBuiltIn: true,
  },
  {
    id: "quality-first",
    name: "Quality First",
    nameKo: "Quality First",
    description: "Predict → Reason → Transfer → Reason",
    stages: [
      { type: "predict", order: 1, config: DEFAULT_PREDICT_PARAMS },
      { type: "reason", order: 2, config: DEFAULT_REASON_STAGE_CONFIG },
      { type: "transfer", order: 3, config: DEFAULT_TRANSFER_PARAMS },
      { type: "reason", order: 4, config: DEFAULT_REASON_STAGE_CONFIG },
    ],
    isBuiltIn: true,
  },
  {
    id: "transfer-validated",
    name: "Transfer + Validate",
    nameKo: "Transfer + Validate",
    description: "Transfer → Reason",
    stages: [
      { type: "transfer", order: 1, config: DEFAULT_TRANSFER_PARAMS },
      { type: "reason", order: 2, config: DEFAULT_REASON_STAGE_CONFIG },
    ],
    isBuiltIn: true,
  },
];

// Backward compatibility alias
export type PresetWorkflow = WorkflowProfile;
export const PRESET_WORKFLOWS = DEFAULT_PROFILES;

// Helper to generate unique stage ID
export const generateStageId = () => `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Workflow validation
export interface WorkflowValidationResult {
  valid: boolean;
  error?: string;
}

export interface WorkflowValidationOptions {
  inputType?: "video" | "image";
}

export const validateWorkflow = (
  stages: WorkflowStage[],
  options?: WorkflowValidationOptions
): WorkflowValidationResult => {
  if (stages.length === 0) {
    return { valid: false, error: "At least 1 stage is required" };
  }
  if (stages.length > 4) {
    return { valid: false, error: "Maximum 4 stages allowed" };
  }
  // For video input, Reason can be first stage (for validating existing videos)
  // For image input, Reason cannot be first (need to generate video first)
  if (stages[0].type === "reason" && options?.inputType === "image") {
    return { valid: false, error: "First stage cannot be Reason for image input" };
  }
  return { valid: true };
};
