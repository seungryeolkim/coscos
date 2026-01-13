"use client";

import Link from "next/link";
import { Request, formatDate, formatDuration, getStatusColor, getScoreColor } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
  };

  // Collect all variants from all inputs for preview
  const allVariants = request.inputs.flatMap((input) => input.variants);

  return (
    <Link href={`/requests/${request.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left side: name and metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium truncate group-hover:text-foreground">
                  {request.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(request.status)} border-current/20`}
                >
                  {statusLabels[request.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {/* Input count */}
                <span>
                  {request.totalInputs} input{request.totalInputs !== 1 ? "s" : ""}
                </span>

                {/* Variant count */}
                <span>
                  {request.totalVariants} variant{request.totalVariants !== 1 ? "s" : ""}
                </span>

                {/* Pass/fail count */}
                {request.status === "completed" && (
                  <>
                    <span className="text-success">
                      {request.passedCount} passed
                    </span>
                    {request.failedCount > 0 && (
                      <span className="text-error">
                        {request.failedCount} failed
                      </span>
                    )}
                  </>
                )}

                {/* Duration */}
                {request.totalDuration && (
                  <span>{formatDuration(request.totalDuration)}</span>
                )}
              </div>
            </div>

            {/* Right side: score and date */}
            <div className="flex flex-col items-end gap-1 ml-4">
              {request.status === "completed" && request.avgScore > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className={`font-mono font-medium ${getScoreColor(request.avgScore)}`}>
                    {request.avgScore.toFixed(2)}
                  </span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDate(request.createdAt)}
              </span>
            </div>
          </div>

          {/* Variant preview dots - show all variants from all inputs */}
          {allVariants.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
              {allVariants.slice(0, 12).map((variant) => (
                <div
                  key={variant.id}
                  className={`w-2 h-2 rounded-full ${
                    variant.isValid
                      ? "bg-success"
                      : variant.physicsScore != null
                      ? "bg-error"
                      : "bg-muted-foreground"
                  }`}
                  title={`${variant.styleName}: ${
                    variant.physicsScore != null
                      ? `${variant.physicsScore.toFixed(2)} - ${variant.isValid ? "Pass" : "Fail"}`
                      : "Processing"
                  }`}
                />
              ))}
              {allVariants.length > 12 && (
                <span className="text-xs text-muted-foreground">+{allVariants.length - 12}</span>
              )}
              <span className="text-xs text-muted-foreground ml-2">
                {[...new Set(allVariants.map((v) => v.styleName))].join(" / ")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
