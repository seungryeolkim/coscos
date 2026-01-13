"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center">
            <span className="text-background font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">{t("brand")}</span>
          <span className="text-muted-foreground text-sm">v0.1.0</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("settings")}
          </Link>
          <LanguageSelector />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
