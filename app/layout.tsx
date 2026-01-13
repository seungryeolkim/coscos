import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CosmosQZB",
  description: "Physical AI Dataset Augmentation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
              <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center">
                    <span className="text-background font-bold text-sm">C</span>
                  </div>
                  <span className="font-semibold text-lg tracking-tight">CosmosQZB</span>
                  <span className="text-muted-foreground text-sm">v0.1.0</span>
                </div>
                <nav className="flex items-center gap-6">
                  <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Requests
                  </a>
                  <a href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Settings
                  </a>
                  <ThemeToggle />
                </nav>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-4">
              <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
                Physical AI Dataset Augmentation Tool
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
