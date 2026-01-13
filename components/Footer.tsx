"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border py-6">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{t("description")}</span>
            <span className="text-border">|</span>
            <Link href="/about" className="hover:text-foreground transition-colors">
              {t("about")}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>{t("poweredBy")}</span>
            <a
              href="https://www.nvidia.com/en-us/ai/cosmos/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline font-medium"
            >
              NVIDIA Cosmos
            </a>
            <span className="text-border">|</span>
            <a
              href="https://developer.download.nvidia.com/licenses/nvidia-open-model-license-agreement-june-2024.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("license")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
