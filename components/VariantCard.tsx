"use client";

import { useTranslations } from "next-intl";
import { Variant, getScoreColor, formatDuration } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoPreview, VideoPlaceholder } from "./VideoPreview";

interface VariantCardProps {
  variant: Variant;
  onSelect?: (variant: Variant) => void;
  isSelected?: boolean;
}

export function VariantCard({ variant, onSelect, isSelected }: VariantCardProps) {
  const t = useTranslations("variant");
  const hasOutput = !!variant.outputPath;
  const hasScore = variant.physicsScore != null;

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-foreground"
          : "hover:ring-1 hover:ring-border"
      }`}
      onClick={() => onSelect?.(variant)}
    >
      {/* Video preview */}
      <div className="aspect-video">
        {hasOutput ? (
          <VideoPreview
            src={variant.outputPath!}
            autoPlayOnVisible={true}
            controls={false}
            className="w-full h-full"
          />
        ) : (
          <VideoPlaceholder className="w-full h-full" />
        )}
      </div>

      <CardContent className="p-3">
        {/* Style name and status */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">{variant.styleName}</span>
          {hasScore && (
            <Badge
              variant="outline"
              className={`${
                variant.isValid ? "text-success border-success/30" : "text-error border-error/30"
              }`}
            >
              {variant.isValid ? t("pass") : t("fail")}
            </Badge>
          )}
        </div>

        {/* Physics score */}
        {hasScore && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">{t("score")}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  variant.isValid ? "bg-success" : "bg-error"
                }`}
                style={{ width: `${variant.physicsScore! * 100}%` }}
              />
            </div>
            <span className={`text-sm font-mono ${getScoreColor(variant.physicsScore!)}`}>
              {variant.physicsScore!.toFixed(2)}
            </span>
          </div>
        )}

        {/* Duration info */}
        {(variant.transferDuration || variant.reasonDuration) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {variant.transferDuration && (
              <span>{t("transfer")}: {formatDuration(variant.transferDuration)}</span>
            )}
            {variant.reasonDuration && (
              <span>{t("reason")}: {formatDuration(variant.reasonDuration)}</span>
            )}
          </div>
        )}

        {/* Rejection reason */}
        {variant.rejectionReason && (
          <div className="mt-2 text-xs text-error">
            {variant.rejectionReason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Grid container for multiple variant cards
interface VariantGridProps {
  variants: Variant[];
  selectedVariant?: Variant;
  onSelectVariant?: (variant: Variant) => void;
}

export function VariantGrid({
  variants,
  selectedVariant,
  onSelectVariant,
}: VariantGridProps) {
  const t = useTranslations("variant");

  if (variants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("noVariants")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {variants.map((variant) => (
        <VariantCard
          key={variant.id}
          variant={variant}
          isSelected={selectedVariant?.id === variant.id}
          onSelect={onSelectVariant}
        />
      ))}
    </div>
  );
}
