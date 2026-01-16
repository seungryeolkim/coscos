"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { ProgressMonitor } from "@/components/ProgressMonitor";
import { listRequests, checkAPIHealth } from "@/lib/api";
import { Request, RequestStatus, formatDate, formatDuration, getStatusColor, getScoreColor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function HomePage() {
  const t = useTranslations("home");
  const tStatus = useTranslations("status");

  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if API is available
        const isHealthy = await checkAPIHealth();
        setApiConnected(isHealthy);

        // Always try to fetch requests (API will return real data or mock data)
        const response = await listRequests({ limit: 100 });
        setRequests(response.requests);

        // Only show error if API is disconnected (don't show error for mock data)
        if (!isHealthy) {
          setErrorMessage(null);
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

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: tStatus("pending"),
    running: tStatus("running"),
    completed: tStatus("completed"),
    failed: tStatus("failed"),
  };

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
          {t("subtitle")}
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
      <div className="flex items-center gap-4 mb-6 flex-wrap">
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
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring max-w-md w-60"
        />

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0 ml-auto">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('cards')}
            aria-label="Card view"
            className="h-9 w-9 rounded-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
            className="h-9 w-9 rounded-none"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
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
            {t("clearFilters")}
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
        <>
          {filteredRequests.length > 0 ? (
            viewMode === 'cards' ? (
              /* Card view */
              <div className="flex flex-col gap-4">
                {filteredRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              /* Table view */
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">{t('table.name')}</TableHead>
                      <TableHead className="w-[10%]">{t('table.status')}</TableHead>
                      <TableHead className="w-[8%] text-right">{t('table.inputs')}</TableHead>
                      <TableHead className="w-[8%] text-right">{t('table.variants')}</TableHead>
                      <TableHead className="w-[10%] text-right">{t('table.passedFailed')}</TableHead>
                      <TableHead className="w-[10%] text-right">{t('table.score')}</TableHead>
                      <TableHead className="w-[10%] text-right">{t('table.duration')}</TableHead>
                      <TableHead className="w-[19%] text-right">{t('table.created')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/requests/${request.id}`}
                      >
                        <TableCell className="font-medium truncate max-w-0">
                          {request.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(request.status)} border-current/20`}
                          >
                            {statusLabels[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.totalInputs}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.totalVariants}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'completed' ? (
                            <span className="text-xs">
                              <span className="text-success">{request.passedCount}</span>
                              {request.failedCount > 0 && (
                                <> / <span className="text-error">{request.failedCount}</span></>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'completed' && request.avgScore > 0 ? (
                            <span className={`font-mono text-sm ${getScoreColor(request.avgScore)}`}>
                              {request.avgScore.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.totalDuration ? (
                            <span className="text-xs">{formatDuration(request.totalDuration)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
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
                    <p className="text-sm mt-1">{t("adjustFilters")}</p>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
