/**
 * API client for Coscos backend
 */

import {
  Request,
  RequestListResponse,
  RequestDetailResponse,
  ProgressState,
  BrowseResponse,
  JobConfig,
  JobInfo,
  CreateJobResponse,
  ListJobsResponse,
  GetJobResponse,
  InputWithPrompts,
} from "./types";

// API base URL - defaults to local FastAPI server
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    // If API is not available, we'll use mock data as fallback
    console.warn(`API request failed: ${url}`, error);
    throw error;
  }
}

/**
 * Mock data for demo/fallback
 */
function getMockRequests(): RequestListResponse {
  return {
    requests: [
      {
        id: "req_demo_001",
        name: "Cosmos Demo - Urban Scene",
        status: "completed",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalDuration: 180,
        config: {
          seed: 42,
          threshold: 0.7,
          save_intermediate: false,
          transferPrompts: ["Urban street scene with dynamic lighting"],
          controlWeights: { depth: 0.4, edge: 0.1, seg: 0.5, vis: 0.1 }
        },
        inputs: [
          {
            id: "input_demo_001",
            requestId: "req_demo_001",
            rgbPath: "https://via.placeholder.com/1280x720",
            rgbFilename: "urban_scene.mp4",
            variants: [
              {
                id: "var_demo_001",
                inputId: "input_demo_001",
                variantIndex: 0,
                prompt: "Urban street scene with dynamic lighting",
                styleName: "cosmos_transfer",
                physicsScore: 0.87,
                isValid: true,
              },
            ],
            passedCount: 1,
            failedCount: 0,
            avgScore: 0.87,
          },
        ],
        totalInputs: 1,
        totalVariants: 1,
        passedCount: 1,
        failedCount: 0,
        avgScore: 0.87,
      },
      {
        id: "req_demo_002",
        name: "Cosmos Demo - Nature Sequence",
        status: "completed",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        totalDuration: 240,
        config: { seed: 123, threshold: 0.75, save_intermediate: false, transferPrompts: [], controlWeights: { depth: 0.4, edge: 0.1, seg: 0.5, vis: 0.1 } },
        inputs: [
          {
            id: "input_demo_002",
            requestId: "req_demo_002",
            rgbPath: "https://via.placeholder.com/1280x720",
            rgbFilename: "nature_seq.mp4",
            variants: [
              {
                id: "var_demo_002",
                inputId: "input_demo_002",
                variantIndex: 0,
                prompt: "Forest landscape with natural lighting",
                styleName: "cosmos_transfer",
                physicsScore: 0.82,
                isValid: true,
              },
            ],
            passedCount: 1,
            failedCount: 0,
            avgScore: 0.82,
          },
        ],
        totalInputs: 1,
        totalVariants: 1,
        passedCount: 1,
        failedCount: 0,
        avgScore: 0.82,
      },
      {
        id: "req_demo_003",
        name: "Cosmos Demo - Processing",
        status: "running",
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        config: { seed: 456, threshold: 0.7, save_intermediate: false, transferPrompts: [], controlWeights: { depth: 0.4, edge: 0.1, seg: 0.5, vis: 0.1 } },
        inputs: [
          {
            id: "input_demo_003",
            requestId: "req_demo_003",
            rgbPath: "https://via.placeholder.com/1280x720",
            rgbFilename: "processing.mp4",
            variants: [
              {
                id: "var_demo_003",
                inputId: "input_demo_003",
                variantIndex: 0,
                prompt: "Dynamic scene transfer",
                styleName: "cosmos_transfer",
                physicsScore: undefined,
                isValid: false,
              },
            ],
            passedCount: 0,
            failedCount: 0,
            avgScore: 0,
          },
        ],
        totalInputs: 1,
        totalVariants: 1,
        passedCount: 0,
        failedCount: 0,
        avgScore: 0,
      },
    ],
    total: 3,
    page: 1,
    pageSize: 20,
  };
}

/**
 * List all requests
 */
export async function listRequests(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<RequestListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();

  try {
    return await fetchAPI(`/api/v1/requests${query ? `?${query}` : ""}`);
  } catch (error) {
    // Return mock data if API is unavailable
    console.warn("Using mock data - API unavailable");
    return getMockRequests();
  }
}

/**
 * Get a specific request by ID
 */
export async function getRequest(id: string): Promise<RequestDetailResponse> {
  return fetchAPI(`/api/v1/requests/${id}`);
}

/**
 * Get video URL for streaming
 */
export function getVideoUrl(path: string): string {
  // If it's already a URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // For local paths, route through our API
  // Keep path as-is to preserve absolute paths (starting with /)
  return `${API_BASE}/api/v1/videos${path}`;
}

/**
 * Server config returned from health check
 */
export interface ServerConfig {
  status: string;
  service: string;
  samples_path: string;
  input_path: string;
  output_path: string;
}

/**
 * Check if API is available and get server config
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_BASE}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === "ok";
  } catch (error) {
    return false;
  }
}

/**
 * Get server configuration including paths
 */
export async function getServerConfig(): Promise<ServerConfig | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE}/`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Get current pipeline progress
 */
export async function getProgress(): Promise<ProgressState | null> {
  try {
    const response = await fetchAPI<ProgressState | { is_active: false }>(
      "/api/v1/progress"
    );
    if ("is_active" in response && response.is_active === false) {
      return null;
    }
    return response as ProgressState;
  } catch {
    return null;
  }
}

/**
 * Subscribe to progress updates via SSE
 */
export function subscribeToProgress(
  onProgress: (state: ProgressState) => void,
  onComplete?: (state: ProgressState) => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/v1/progress/stream`);

  eventSource.addEventListener("progress", (event) => {
    try {
      const data = JSON.parse(event.data) as ProgressState;
      onProgress(data);
    } catch (e) {
      console.error("Failed to parse progress data:", e);
    }
  });

  eventSource.addEventListener("complete", (event) => {
    try {
      const data = JSON.parse(event.data) as ProgressState;
      onComplete?.(data);
    } catch (e) {
      console.error("Failed to parse complete data:", e);
    }
    eventSource.close();
  });

  eventSource.addEventListener("idle", () => {
    // Pipeline not running, continue listening
  });

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    onError?.(new Error("Connection lost"));
    eventSource.close();
  };

  // Return cleanup function
  return () => eventSource.close();
}

/**
 * Get progress history
 */
export async function getProgressHistory(
  limit = 10
): Promise<{
  history: Array<{
    job_id: string;
    completed_at: string;
    total_files: number;
    completed_files: number;
    failed_files: number;
    success_rate: number;
  }>;
}> {
  try {
    return await fetchAPI(`/api/v1/progress/history?limit=${limit}`);
  } catch {
    return { history: [] };
  }
}

// ============ Browse API ============

/**
 * Browse a directory for video or image files
 */
export async function browseDirectory(
  path: string,
  inputType: "video" | "image" = "video",
  extensions?: string[]
): Promise<BrowseResponse> {
  return fetchAPI("/api/v1/browse", {
    method: "POST",
    body: JSON.stringify({
      path,
      input_type: inputType,
      extensions: extensions || undefined,  // Let backend use defaults based on input_type
    }),
  });
}

// ============ Jobs API ============

/**
 * Create a new pipeline job (legacy config format)
 */
export async function createJob(params: {
  name?: string;
  video_paths: string[];
  config?: JobConfig;
}): Promise<CreateJobResponse> {
  return fetchAPI("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Create a new pipeline job with workflow
 */
export async function createWorkflowJob(params: {
  name?: string;
  input_type?: "video" | "image";
  input_paths?: string[];
  video_paths?: string[];  // Backward compatibility
  inputs?: InputWithPrompts[];  // New: file-specific prompt mapping
  workflow: {
    stages: Array<{
      id: string;
      type: "predict" | "transfer" | "reason";
      order: number;
      config: Record<string, unknown>;
    }>;
    name?: string;
  };
}): Promise<CreateJobResponse> {
  return fetchAPI("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * List all jobs
 */
export async function listJobs(params?: {
  status?: string;
  limit?: number;
}): Promise<ListJobsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  return fetchAPI(`/api/v1/jobs${query ? `?${query}` : ""}`);
}

/**
 * Get job details
 */
export async function getJob(jobId: string): Promise<GetJobResponse> {
  return fetchAPI(`/api/v1/jobs/${jobId}`);
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<{ status: string }> {
  return fetchAPI(`/api/v1/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

// ============ Settings API ============

export interface APISettings {
  cosmos_api_key: string;
  cosmos_api_key_masked?: string;
  has_api_key?: boolean;
  predict_endpoint: string;
  transfer_endpoint: string;
  reason_endpoint: string;
  timeout: number;
  max_retries: number;
  retry_backoff: number;
}

export interface OutputSettings {
  output_directory: string;
  create_dated_folders: boolean;
  save_rejected_videos: boolean;
  save_intermediate_files: boolean;
  naming_prefix: string;
  naming_suffix: string;
  codec: "h264" | "h265" | "vp9";
  quality: "low" | "medium" | "high";
  remove_audio: boolean;
}

export interface DefaultsSettings {
  predict: Record<string, unknown>;
  transfer: Record<string, unknown>;
  reason: Record<string, unknown>;
  use_random_seed: boolean;
}

export interface AppSettings {
  api: APISettings;
  output: OutputSettings;
  defaults: DefaultsSettings;
}

export interface GetSettingsResponse {
  settings: AppSettings;
}

export interface SaveSettingsResponse {
  settings: AppSettings;
  success: boolean;
}

/**
 * Get current app settings
 */
export async function getSettings(): Promise<GetSettingsResponse> {
  return fetchAPI("/api/v1/settings");
}

/**
 * Save app settings
 */
export async function saveSettings(
  settings: Partial<AppSettings>
): Promise<SaveSettingsResponse> {
  return fetchAPI("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
