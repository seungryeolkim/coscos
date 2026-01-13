/**
 * API client for CosmosQZB backend
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
  return fetchAPI(`/api/v1/requests${query ? `?${query}` : ""}`);
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
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE}/api/v1/videos/${cleanPath}`;
}

/**
 * Check if API is available
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/`);
    if (response.ok) {
      const data = await response.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    return false;
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
 * Browse a directory for video files
 */
export async function browseDirectory(
  path: string,
  extensions?: string[]
): Promise<BrowseResponse> {
  return fetchAPI("/api/v1/browse", {
    method: "POST",
    body: JSON.stringify({
      path,
      extensions: extensions || [".mp4", ".avi", ".mov", ".mkv", ".webm"],
    }),
  });
}

// ============ Jobs API ============

/**
 * Create a new pipeline job
 */
export async function createJob(params: {
  name?: string;
  video_paths: string[];
  config: JobConfig;
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
