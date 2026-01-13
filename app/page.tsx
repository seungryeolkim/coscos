"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { RequestCard } from "@/components/RequestCard";
import { ProgressMonitor } from "@/components/ProgressMonitor";
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
  const t = useTranslations("home");
  const tStatus = useTranslations("status");

  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
          setRequests(response.requests);
        } else {
          setRequests([]);
          setErrorMessage(t("error"));
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setRequests([]);
        setErrorMessage(t("error"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [t]);

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
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            {!isLoading && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  apiConnected
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                {apiConnected ? t("apiConnected") : t("apiDisconnected")}
              </span>
            )}
          </div>
          <Link href="/new">
            <Button>+ {t("newRequest")}</Button>
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
          <div className="text-sm text-muted-foreground mb-1">{t("filter.all")}</div>
          <div className="text-2xl font-semibold">{totalRequests}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">{t("filter.completed")}</div>
          <div className="text-2xl font-semibold text-success">{completedRequests}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">{t("filter.running")}</div>
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
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="completed">{tStatus("completed")}</SelectItem>
            <SelectItem value="running">{tStatus("running")}</SelectItem>
            <SelectItem value="pending">{tStatus("pending")}</SelectItem>
            <SelectItem value="failed">{tStatus("failed")}</SelectItem>
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
            <span className="text-sm text-muted-foreground">{t("loading")}</span>
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
              {errorMessage ? (
                <>
                  <p className="text-error">{errorMessage}</p>
                  <p className="text-sm mt-2">Run: <code className="bg-secondary px-2 py-1 rounded">uv run python -m server.main</code></p>
                </>
              ) : (
                <>
                  <p>{t("empty")}</p>
                  {(statusFilter !== "all" || searchQuery) && (
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
