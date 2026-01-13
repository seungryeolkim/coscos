import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Coscos",
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
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center">
                    <span className="text-background font-bold text-sm">C</span>
                  </div>
                  <span className="font-semibold text-lg tracking-tight">Coscos</span>
                  <span className="text-muted-foreground text-sm">v0.1.0</span>
                </Link>
                <nav className="flex items-center gap-6">
                  <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Settings
                  </Link>
                  <ThemeToggle />
                </nav>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 min-h-0">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-6">
              <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Physical AI Dataset Augmentation Tool</span>
                    <span className="text-border">|</span>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      About & License
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Powered by</span>
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
                      License
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
