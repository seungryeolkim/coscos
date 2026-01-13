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
}

export interface ControlWeights {
  depth: number;
  edge: number;
  seg: number;
  vis: number;
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
}

export interface BrowseResponse {
  path: string;
  videos: VideoFile[];
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
}

export interface JobResult {
  input: string;
  success: boolean;
  output?: string;
  physics_score?: number;
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
    name: "일출",
    prompt: "Same scene during sunrise with soft pink and orange hues on the horizon, gentle morning light casting long shadows, and a gradual transition from darkness to daylight. Maintain temporal consistency.",
  },
  {
    name: "오전",
    prompt: "Same scene during mid-morning with bright, clear daylight, moderate shadows, and natural color temperature. The sun is positioned at a moderate angle providing even illumination. Maintain temporal consistency.",
  },
  {
    name: "정오",
    prompt: "Same scene at zenith with the sun directly overhead, minimal shadows, strong contrast, and bright, harsh lighting conditions typical of midday. Maintain temporal consistency.",
  },
  {
    name: "오후",
    prompt: "Same scene during afternoon with warm, angled sunlight creating defined shadows, slightly golden tint to the lighting, and comfortable visibility. Maintain temporal consistency.",
  },
  {
    name: "골든아워",
    prompt: "Same scene during golden hour with rich, warm golden-orange lighting, long dramatic shadows, and a soft, cinematic quality to the illumination. Maintain temporal consistency.",
  },
  {
    name: "석양",
    prompt: "Same scene during sunset with warm golden and orange lighting, dramatic sky colors, elongated shadows, and a peaceful evening atmosphere. Maintain temporal consistency.",
  },
  {
    name: "블루아워",
    prompt: "Same scene during blue hour with soft blue ambient light, city lights beginning to appear, and a tranquil twilight atmosphere between sunset and night. Maintain temporal consistency.",
  },
  {
    name: "황혼",
    prompt: "Same scene during twilight with dim ambient light, mixed artificial and natural lighting, emerging stars, and a gradual transition to nighttime. Maintain temporal consistency.",
  },
  {
    name: "야간",
    prompt: "Same scene at night with artificial street lighting, vehicle headlights illuminating the road, dark sky, and urban light sources creating pools of illumination. Maintain temporal consistency.",
  },
];

// Weather variations (날씨)
export const WEATHER_STYLES: TransferStyle[] = [
  {
    name: "맑은 날",
    prompt: "Same scene on a clear day with bright blue sky, excellent visibility, crisp shadows, and vibrant colors under direct sunlight. Maintain temporal consistency.",
  },
  {
    name: "흐린 날",
    prompt: "Same scene on an overcast day with grey cloudy sky, diffused soft lighting, muted shadows, and even illumination across the scene. Maintain temporal consistency.",
  },
  {
    name: "비/우천",
    prompt: "Same scene during heavy rain with wet reflective road surfaces, water droplets, puddles forming, reduced visibility, and glistening reflections from lights. Maintain temporal consistency.",
  },
  {
    name: "안개",
    prompt: "Same scene in foggy weather with significantly reduced visibility, atmospheric haze, diffused lighting, and objects fading into the mist at distance. Maintain temporal consistency.",
  },
  {
    name: "눈 내림",
    prompt: "Same scene during active snowfall with snowflakes falling through the air, reduced visibility, white accumulation beginning on surfaces, and cold winter atmosphere. Maintain temporal consistency.",
  },
  {
    name: "폭설",
    prompt: "Same scene during heavy snowfall with thick snow accumulation on all surfaces, limited visibility, white-covered ground and objects, and intense winter conditions. Maintain temporal consistency.",
  },
];

// Road surface variations (노면)
export const ROAD_STYLES: TransferStyle[] = [
  {
    name: "건조 노면",
    prompt: "Same scene with dry road surface, clear asphalt texture visible, no moisture or debris, optimal driving conditions with good tire grip. Maintain temporal consistency.",
  },
  {
    name: "젖은 노면",
    prompt: "Same scene with wet road surface after rain, water puddles scattered across the road, reflective wet asphalt, and potential for hydroplaning conditions. Maintain temporal consistency.",
  },
  {
    name: "눈 덮인 노면",
    prompt: "Same scene with snow-covered road surface, white snow accumulation on the road, partially visible lane markings, and slippery winter driving conditions. Maintain temporal consistency.",
  },
  {
    name: "모래/사막",
    prompt: "Same scene with sandy desert road conditions, dust particles in the air, sand accumulation on road edges, arid environment with desert landscape. Maintain temporal consistency.",
  },
];

// Special effects (특수 효과)
export const SPECIAL_STYLES: TransferStyle[] = [
  {
    name: "포토리얼리즘",
    prompt: "Same scene with enhanced photorealism, realistic textures, natural lighting, accurate material properties, and cinematic quality rendering. Maintain temporal consistency.",
  },
  {
    name: "시뮬레이터→실사",
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
  { name: "조명 (Lighting)", styles: LIGHTING_STYLES },
  { name: "날씨 (Weather)", styles: WEATHER_STYLES },
  { name: "노면 (Road Surface)", styles: ROAD_STYLES },
  { name: "특수 효과 (Special)", styles: SPECIAL_STYLES },
];

// ============ Detailed Mode Parameters ============

export type Resolution = "480p" | "720p";
export type FPS = 10 | 16;
export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type ModelSize = "2B" | "14B" | "8B";

export interface PredictParams {
  prompt: string;
  negative_prompt?: string;
  seed: number;
  guidance_scale: number;
  resolution: Resolution;
  fps: FPS;
  aspect_ratio: AspectRatio;
  model_size: "2B" | "14B";
  num_conditioning_frames: 1 | 5;
  disable_prompt_refiner: boolean;
}

export interface ControlWeights {
  depth: number;
  edge: number;
  seg: number;
  vis: number;
}

export interface TransferParams {
  styles: TransferStyle[];
  custom_prompt?: string;
  seed: number;
  guidance_scale: number;
  num_steps: number;
  control_weights: ControlWeights;
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
    name: "날씨 변환",
    description: "비/눈/안개 등 날씨 변경에 최적화",
    weights: { depth: 0.5, edge: 0.2, seg: 0.2, vis: 0.1 },
  },
  {
    name: "시간대 변환",
    description: "주간→야간, 석양 등 조명 변화",
    weights: { depth: 0.4, edge: 0.1, seg: 0.3, vis: 0.2 },
  },
  {
    name: "Sim2Real",
    description: "시뮬레이션→실제 환경 변환",
    weights: { depth: 0.6, edge: 0.1, seg: 0.2, vis: 0.1 },
  },
  {
    name: "텍스처 변환",
    description: "형태 유지하며 텍스처만 변경",
    weights: { depth: 0.2, edge: 0.4, seg: 0.2, vis: 0.2 },
  },
  {
    name: "균등 배분",
    description: "모든 모달리티 동일 가중치",
    weights: { depth: 0.25, edge: 0.25, seg: 0.25, vis: 0.25 },
  },
];

// ============ Reason Criteria ============

export const REASON_CRITERIA = [
  { id: "gravity", label: "중력 법칙", description: "물체의 낙하/이동이 자연스러운지" },
  { id: "object_interaction", label: "객체 상호작용", description: "충돌/접촉 반응이 현실적인지" },
  { id: "motion_consistency", label: "움직임 일관성", description: "속도/가속도 변화가 자연스러운지" },
  { id: "lighting_coherence", label: "조명 일관성", description: "빛과 그림자가 일관적인지" },
  { id: "object_permanence", label: "객체 영속성", description: "물체가 갑자기 사라지거나 나타나지 않는지" },
  { id: "temporal_consistency", label: "시간적 일관성", description: "프레임 간 연속성이 유지되는지" },
];

// ============ Default Values ============

export const DEFAULT_PREDICT_PARAMS: PredictParams = {
  prompt: "Continue this video naturally with realistic physics. Maintain consistent lighting and object motion.",
  seed: 42,
  guidance_scale: 7.0,
  resolution: "720p",
  fps: 16,
  aspect_ratio: "16:9",
  model_size: "2B",
  num_conditioning_frames: 1,
  disable_prompt_refiner: false,
};

export const DEFAULT_TRANSFER_PARAMS: TransferParams = {
  styles: [TRANSFER_STYLES[0]],
  seed: 42,
  guidance_scale: 7.0,
  num_steps: 20,
  control_weights: { depth: 0.4, edge: 0.1, seg: 0.5, vis: 0.1 },
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

export interface CreateWorkflowJobRequest {
  name?: string;
  video_paths: string[];
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
    labelKo: "예측",
    description: "미래 프레임 생성",
    color: "text-cyan-500",
    icon: "🎬",
  },
  transfer: {
    label: "Transfer",
    labelKo: "변환",
    description: "스타일/환경 변환",
    color: "text-purple-500",
    icon: "🎨",
  },
  reason: {
    label: "Reason",
    labelKo: "검증",
    description: "물리 검증 (필터링)",
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
    nameKo: "예측만",
    description: "미래 프레임만 생성",
    stages: [
      { type: "predict", order: 1, config: DEFAULT_PREDICT_PARAMS },
    ],
    isBuiltIn: true,
  },
  {
    id: "transfer-only",
    name: "Transfer Only",
    nameKo: "변환만",
    description: "스타일 변환만 수행",
    stages: [
      { type: "transfer", order: 1, config: DEFAULT_TRANSFER_PARAMS },
    ],
    isBuiltIn: true,
  },
  {
    id: "classic-full",
    name: "Classic Full",
    nameKo: "기본 전체",
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
    nameKo: "품질 우선",
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
    nameKo: "변환 + 검증",
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

export const validateWorkflow = (stages: WorkflowStage[]): WorkflowValidationResult => {
  if (stages.length === 0) {
    return { valid: false, error: "최소 1개의 스테이지가 필요합니다" };
  }
  if (stages.length > 4) {
    return { valid: false, error: "최대 4개의 스테이지만 허용됩니다" };
  }
  if (stages[0].type === "reason") {
    return { valid: false, error: "첫 번째 스테이지는 Reason이 될 수 없습니다" };
  }
  return { valid: true };
};
