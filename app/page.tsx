"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RequestCard } from "@/components/RequestCard";
import { ProgressMonitor } from "@/components/ProgressMonitor";
import { mockRequests } from "@/lib/mock-data";
import { listRequests, checkAPIHealth } from "@/lib/api";
import { Request, RequestStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HomePage() {
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if API is available
        const isHealthy = await checkAPIHealth();
        setApiConnected(isHealthy);

        if (isHealthy) {
          const response = await listRequests({ limit: 100 });
          if (response.requests.length > 0) {
            setRequests(response.requests);
          }
        }
      } catch (error) {
        console.warn("Using mock data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    // Status filter
    if (statusFilter !== "all" && request.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.name.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query) ||
        request.inputs.some((input) => input.rgbFilename.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Stats
  const totalRequests = requests.length;
  const completedRequests = requests.filter((r) => r.status === "completed").length;
  const runningRequests = requests.filter((r) => r.status === "running").length;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Requests</h1>
            {!isLoading && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  apiConnected
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {apiConnected ? "API Connected" : "Demo Mode"}
              </span>
            )}
          </div>
          <Link href="/new">
            <Button>+ New Job</Button>
          </Link>
        </div>
        <p className="text-muted-foreground">
          Transfer augmentation requests and their outputs
        </p>
      </div>

      {/* Progress Monitor - shown when pipeline is running */}
      <ProgressMonitor useSSE={true} />

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total</div>
          <div className="text-2xl font-semibold">{totalRequests}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-semibold text-success">{completedRequests}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Running</div>
          <div className="text-2xl font-semibold text-warning">{runningRequests}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as RequestStatus | "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Clear filters */}
        {(statusFilter !== "all" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setSearchQuery("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading requests...</span>
          </div>
        </div>
      ) : (
        /* Request list */
        <div className="flex flex-col gap-4">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No requests found</p>
              {(statusFilter !== "all" || searchQuery) && (
                <p className="text-sm mt-1">Try adjusting your filters</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
