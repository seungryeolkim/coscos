"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRequest } from "@/lib/api";
import {
  Request,
  InputVideo,
  Variant,
  formatDate,
  formatDuration,
  getStatusColor,
  getScoreColor,
} from "@/lib/types";
import { VideoPreview, VideoPlaceholder } from "@/components/VideoPreview";
import { VariantGrid } from "@/components/VariantCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const inputVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch request data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getRequest(requestId);
        if (response.request) {
          setRequest(response.request);
        } else {
          setError("Request not found");
        }
      } catch (err) {
        console.error("Failed to fetch request:", err);
        setError("Failed to load request data. Please check API connection.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [requestId]);

  // Get selected input (default to first if none selected)
  const selectedInput = useMemo(() => {
    if (!request) return null;
    if (selectedInputId) {
      return request.inputs.find((input) => input.id === selectedInputId) || request.inputs[0];
    }
    return request.inputs[0] || null;
  }, [request, selectedInputId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading request...</span>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <h1 className="text-xl font-semibold mb-2">
            {error || "Request not found"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {error
              ? "Please check your API connection and try again."
              : "The request you're looking for doesn't exist."}
          </p>
          <Link href="/">
            <Button variant="outline">Back to Requests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
  };

  const handleCompare = (variant: Variant) => {
    setSelectedVariant(variant);
    setShowCompare(true);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="shrink-0 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Requests
            </Link>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{request.name}</h1>
              <Badge
                variant="outline"
                className={`${getStatusColor(request.status)} border-current/20`}
              >
                {statusLabels[request.status]}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{formatDate(request.createdAt)}</span>
              {request.totalDuration && <span>Duration: {formatDuration(request.totalDuration)}</span>}
              <span>{request.totalInputs} inputs</span>
              <span>{request.totalVariants} variants</span>
            </div>
          </div>

          {/* Stats */}
          {request.status === "completed" && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Avg Score</div>
                <div className={`text-xl font-mono font-semibold ${getScoreColor(request.avgScore)}`}>
                  {request.avgScore.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Pass Rate</div>
                <div className="text-xl font-semibold">
                  {request.passedCount}/{request.totalVariants}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content: Sidebar + Detail */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar - Input list (independent scroll) */}
        <div className="w-72 border-r border-border overflow-y-auto overscroll-contain shrink-0">
          <div className="p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Input Videos</h2>
            <div className="space-y-2">
              {request.inputs.map((input) => (
                <InputListItem
                  key={input.id}
                  input={input}
                  isSelected={selectedInput?.id === input.id}
                  onClick={() => setSelectedInputId(input.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right content - Selected input detail (independent scroll) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {selectedInput ? (
            <InputDetailView
              input={selectedInput}
              config={request.config}
              onCompare={handleCompare}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select an input from the list
            </div>
          )}
        </div>
      </div>

      {/* Compare dialog */}
      {selectedInput && (
        <Dialog open={showCompare} onOpenChange={setShowCompare}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Compare: {selectedInput.rgbFilename} → {selectedVariant?.styleName}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6">
              {/* Input */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Input</div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPreview
                    ref={inputVideoRef}
                    src={selectedInput.rgbPath}
                    className="w-full h-full"
                    controls={true}
                    autoPlay={true}
                    muted={true}
                  />
                </div>
              </div>

              {/* Output */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Output ({selectedVariant?.styleName})
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {selectedVariant?.outputPath ? (
                    <VideoPreview
                      src={selectedVariant.outputPath}
                      className="w-full h-full"
                      controls={true}
                      autoPlay={true}
                      muted={true}
                      syncRef={inputVideoRef}
                    />
                  ) : (
                    <VideoPlaceholder className="w-full h-full" />
                  )}
                </div>
              </div>
            </div>

            {/* Variant details */}
            {selectedVariant && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Physics Score: </span>
                    <span
                      className={`font-mono ${
                        selectedVariant.physicsScore !== undefined
                          ? getScoreColor(selectedVariant.physicsScore)
                          : ""
                      }`}
                    >
                      {selectedVariant.physicsScore?.toFixed(2) ?? "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    <span className={selectedVariant.isValid ? "text-success" : "text-error"}>
                      {selectedVariant.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span>
                      {selectedVariant.transferDuration
                        ? formatDuration(selectedVariant.transferDuration)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Prompt: </span>
                  <span className="font-mono text-xs">{selectedVariant.prompt}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Input list item component
function InputListItem({
  input,
  isSelected,
  onClick,
}: {
  input: InputVideo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasControl = !!input.controlPath;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected
          ? "bg-accent border border-border"
          : "hover:bg-accent/50 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium truncate">{input.rgbFilename}</span>
        {hasControl && (
          <Badge variant="secondary" className="text-xs">
            +{input.controlType}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{input.variants.length} variants</span>
        {input.passedCount > 0 && (
          <span className="text-success">{input.passedCount} passed</span>
        )}
        {input.failedCount > 0 && (
          <span className="text-error">{input.failedCount} failed</span>
        )}
      </div>

      {/* Mini status dots */}
      {input.variants.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {input.variants.map((variant) => (
            <div
              key={variant.id}
              className={`w-1.5 h-1.5 rounded-full ${
                variant.isValid
                  ? "bg-success"
                  : variant.physicsScore !== undefined
                  ? "bg-error"
                  : "bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// Input detail view component
function InputDetailView({
  input,
  config,
  onCompare,
}: {
  input: InputVideo;
  config: { transferPrompts: string[]; controlWeights: { depth: number; edge: number; seg: number; vis: number }; seed: number; threshold: number };
  onCompare: (variant: Variant) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Input videos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RGB input */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">RGB Video</div>
              <div className="aspect-video">
                <VideoPreview src={input.rgbPath} title="Original" className="w-full h-full" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate">{input.rgbFilename}</div>
            </div>

            {/* Control input (if exists) */}
            {input.controlPath ? (
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  {input.controlType?.charAt(0).toUpperCase()}
                  {input.controlType?.slice(1)} Map (weight: {input.controlWeight})
                </div>
                <div className="aspect-video">
                  <VideoPreview
                    src={input.controlPath}
                    title={input.controlType || "Control"}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  {input.controlFilename}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Control Input</div>
                <div className="aspect-video">
                  <VideoPlaceholder title="No control input" className="w-full h-full" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">RGB only</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Output Variants</CardTitle>
            <div className="text-sm text-muted-foreground">
              {input.passedCount} passed / {input.variants.length} total
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {input.variants.length > 0 ? (
            <VariantGrid variants={input.variants} onSelectVariant={onCompare} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No variants generated yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Seed</div>
              <div className="font-mono">{config.seed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Threshold</div>
              <div className="font-mono">{config.threshold}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Depth Weight</div>
              <div className="font-mono">{config.controlWeights.depth}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Edge Weight</div>
              <div className="font-mono">{config.controlWeights.edge}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Prompts</div>
            <div className="space-y-2">
              {config.transferPrompts.map((prompt, idx) => (
                <div
                  key={idx}
                  className="text-sm bg-secondary p-2 rounded font-mono text-muted-foreground"
                >
                  {idx + 1}. {prompt}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
