import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider, themeScript } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Staffing candidate profiles, jobs and hiring pipeline",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0D17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" closeButton toastOptions={{ className: "!rounded-xl !border-line !bg-surface !text-ink-800 !shadow-pop" }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
