"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Request, formatDate, formatDuration, getStatusColor, getScoreColor } from "@/lib/types";
import { getVideoUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const statusLabels: Record<string, string> = {
    pending: tStatus("pending"),
    running: tStatus("running"),
    completed: tStatus("completed"),
    failed: tStatus("failed"),
  };

  // Collect all variants from all inputs for preview
  const allVariants = request.inputs.flatMap((input) => input.variants);

  // Get first input's RGB video/image for thumbnail
  const firstInput = request.inputs[0];
  const thumbnailUrl = firstInput?.rgbPath;

  // Check if thumbnail is an image (by extension)
  const isImage = thumbnailUrl && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(thumbnailUrl);

  return (
    <Link href={`/requests/${request.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Left: Thumbnail preview (video or image) */}
            {thumbnailUrl && (
              <div className="flex-shrink-0 w-32 aspect-video bg-black rounded-md overflow-hidden">
                {isImage ? (
                  <img
                    src={getVideoUrl(thumbnailUrl)}
                    alt="Input thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={getVideoUrl(thumbnailUrl)}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                )}
              </div>
            )}

            {/* Right: Content area */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Top row: name, status, and right side info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
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

                {/* Right side: score and date */}
                <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                  {request.status === "completed" && request.avgScore > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{tCommon("score")}</span>
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

              {/* Bottom row: metadata */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {/* Input count */}
                <span>
                  {request.totalInputs} {request.totalInputs !== 1 ? tCommon("inputs") : tCommon("input")}
                </span>

                {/* Variant count */}
                <span>
                  {request.totalVariants} {request.totalVariants !== 1 ? tCommon("variants") : tCommon("variant")}
                </span>

                {/* Pass/fail count */}
                {request.status === "completed" && (
                  <>
                    <span className="text-success">
                      {request.passedCount} {tCommon("passed")}
                    </span>
                    {request.failedCount > 0 && (
                      <span className="text-error">
                        {request.failedCount} {tCommon("failed")}
                      </span>
                    )}
                  </>
                )}

                {/* Duration */}
                {request.totalDuration && (
                  <span>{formatDuration(request.totalDuration)}</span>
                )}
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
                          : tCommon("processing")
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
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
